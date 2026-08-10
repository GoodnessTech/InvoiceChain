import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useReadContract, useReadContracts, usePublicClient } from "wagmi"
import type { FeedEvent, FeedEventType, Invoice } from "@/lib/invoice"
import { stateFromNumber } from "@/lib/invoice"
import { INVOICE_FACTORY_ABI, INVOICE_CHAIN_ABI } from "@/abis"
import { INVOICE_FACTORY_ADDRESS } from "@/config/contracts"

/**
 * Reads all deployed invoices from InvoiceFactory (`getAllInvoices`), then
 * reads each invoice's real on-chain details (`getInvoiceDetails`) and real
 * `owner()` so cards AND the isOwner check (which gates the Repay/Cancel
 * buttons) reflect actual on-chain truth — never placeholders or fake data.
 *
 * The activity feed is reconstructed from real on-chain event logs on load,
 * so history survives page reloads and shows up for anyone who opens the
 * link later — not just the browser tab that triggered the transaction.
 */

interface InvoiceStore {
  invoices: Invoice[]
  feed: FeedEvent[]
  addInvoice: (invoice: Invoice) => void
  updateInvoice: (address: string, patch: Partial<Invoice>) => void
  pushEvent: (event: FeedEvent) => void
}

const StoreContext = createContext<InvoiceStore | null>(null)

// Maps a decoded on-chain log to the feed's display shape. `timestampMs` must
// be the real block timestamp in milliseconds — resolved separately per
// unique block before calling this, since logs themselves don't carry it.
function mapLogToFeedEvent(log: any, timestampMs: number): FeedEvent | null {
  const eventName = log.eventName as string
  const args = (log.args ?? {}) as Record<string, any>
  const txHash = log.transactionHash as string

  let type: FeedEventType
  let amount: bigint | undefined
  let addr: string

  switch (eventName) {
    case "Invested":
      type = "Invested"
      amount = args.amount
      addr = args.investor
      break
    case "Funded":
      type = "Funded"
      amount = args.totalRaised
      addr = args.owner
      break
    case "Repaid":
      type = "Repaid"
      amount = args.amount
      addr = args.owner
      break
    case "Claimed":
      type = "Claimed"
      amount = args.amount
      addr = args.investor
      break
    case "Refunded":
      type = "Refunded"
      amount = args.amount
      addr = args.investor
      break
    case "InvoiceCancelled":
      type = "InvoiceCancelled"
      amount = undefined
      addr = args.owner
      break
    default:
      return null
  }

  return {
    id: `${txHash}-${log.logIndex ?? 0}`,
    type,
    amount,
    address: addr ?? log.address,
    txHash,
    timestamp: timestampMs,
  }
}

export function InvoiceStoreProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [feed, setFeed] = useState<FeedEvent[]>([])
  const publicClient = usePublicClient()

  // Step 1: get the list of every invoice address the factory has ever deployed.
  const { data: factoryInvoices } = useReadContract({
    address: INVOICE_FACTORY_ADDRESS as `0x${string}`,
    abi: INVOICE_FACTORY_ABI,
    functionName: "getAllInvoices",
    query: {
      enabled: !!INVOICE_FACTORY_ADDRESS,
      // Re-poll periodically so state changes (e.g. after repay/claim) show up
      // without a manual refresh.
      refetchInterval: 15_000,
    },
  })

  const addresses = useMemo(
    () => (Array.isArray(factoryInvoices) ? (factoryInvoices as string[]) : []),
    [factoryInvoices],
  )

  // Step 2: for every address, read its real details AND real owner from its
  // own deployed InvoiceChain contract. Both matter — details drive the card
  // display, and owner is what the Repay/Cancel buttons check against.
  const { data: detailsResults } = useReadContracts({
    contracts: addresses.map((addr) => ({
      address: addr as `0x${string}`,
      abi: INVOICE_CHAIN_ABI,
      functionName: "getInvoiceDetails",
    })),
    query: {
      enabled: addresses.length > 0,
      refetchInterval: 15_000,
    },
  })

  const { data: ownerResults } = useReadContracts({
    contracts: addresses.map((addr) => ({
      address: addr as `0x${string}`,
      abi: INVOICE_CHAIN_ABI,
      functionName: "owner",
    })),
    query: {
      enabled: addresses.length > 0,
      refetchInterval: 15_000,
    },
  })

  useEffect(() => {
    if (!detailsResults || addresses.length === 0) {
      // No real invoices deployed yet. No mock/fake fallback — an empty
      // array renders the marketplace's real "no invoices yet" empty state.
      setInvoices([])
      return
    }

    const realInvoices: Invoice[] = addresses
      .map((addr, i) => {
        const result = detailsResults[i]
        if (!result || result.status !== "success" || !result.result) return null
        const [faceValue, fundingGoal, dueDate, debtorName, stateNum, totalRaised] =
          result.result as [bigint, bigint, bigint, string, number, bigint]

        const ownerResult = ownerResults?.[i]
        const owner =
          ownerResult && ownerResult.status === "success"
            ? (ownerResult.result as string)
            : ""

        return {
          address: addr,
          owner,
          debtorName,
          faceValue,
          fundingGoal,
          totalRaised,
          dueDate,
          state: stateFromNumber(stateNum),
        } as Invoice
      })
      .filter((inv): inv is Invoice => inv !== null)
      .reverse() // newest-created first

    setInvoices(realInvoices)
  }, [detailsResults, ownerResults, addresses])

  // Reconstruct activity history from real on-chain event logs, so it
  // survives page reloads and shows up for anyone opening the link fresh —
  // not just the browser session that triggered the transaction.
  useEffect(() => {
    if (!publicClient || addresses.length === 0) {
      setFeed([])
      return
    }

    let cancelled = false

    async function fetchHistory() {
      try {
        const logsPerInvoice = await Promise.all(
          addresses.map((addr) =>
            publicClient!.getContractEvents({
              address: addr as `0x${string}`,
              abi: INVOICE_CHAIN_ABI,
              fromBlock: 0n,
              toBlock: "latest",
            }),
          ),
        )

        const allLogs = logsPerInvoice.flat()

        // Resolve each log's real block timestamp. Dedupe by block number
        // first so a busy invoice with many events in the same block only
        // costs one RPC call for that block, not one per event.
        const uniqueBlockNumbers = Array.from(
          new Set(allLogs.map((log) => (log.blockNumber as bigint).toString())),
        ).map((s) => BigInt(s))

        const blocks = await Promise.all(
          uniqueBlockNumbers.map((bn) => publicClient!.getBlock({ blockNumber: bn })),
        )
        const timestampByBlock = new Map<string, number>()
        blocks.forEach((block) => {
          // viem block.timestamp is in seconds — convert to ms for JS Date/time-ago math.
          timestampByBlock.set(block.number!.toString(), Number(block.timestamp) * 1000)
        })

        const mapped = allLogs
          .map((log) => {
            const ts = timestampByBlock.get((log.blockNumber as bigint).toString()) ?? 0
            return mapLogToFeedEvent(log, ts)
          })
          .filter((e): e is FeedEvent => e !== null)
          // Newest first, by real timestamp.
          .sort((a, b) => b.timestamp - a.timestamp)

        if (!cancelled) {
          setFeed(mapped)
        }
      } catch (err) {
        console.error("Failed to fetch on-chain activity history:", err)
      }
    }

    fetchHistory()
    const interval = setInterval(fetchHistory, 20_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [publicClient, addresses])

  const addInvoice = useCallback((invoice: Invoice) => {
    setInvoices((prev) => [invoice, ...prev])
  }, [])

  const updateInvoice = useCallback(
    (address: string, patch: Partial<Invoice>) => {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.address.toLowerCase() === address.toLowerCase()
            ? { ...inv, ...patch }
            : inv,
        ),
      )
    },
    [],
  )

  // Optimistic local prepend for instant feedback right after a confirmed
  // transaction — deduped against the next real on-chain refetch by txHash,
  // so it never leaves a stale/fake entry behind.
  const pushEvent = useCallback((event: FeedEvent) => {
    setFeed((prev) => {
      if (prev.some((e) => e.txHash === event.txHash)) return prev
      return [event, ...prev]
    })
  }, [])

  const value = useMemo(
    () => ({ invoices, feed, addInvoice, updateInvoice, pushEvent }),
    [invoices, feed, addInvoice, updateInvoice, pushEvent],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useInvoiceStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error("useInvoiceStore must be used within InvoiceStoreProvider")
  }
  return ctx
}