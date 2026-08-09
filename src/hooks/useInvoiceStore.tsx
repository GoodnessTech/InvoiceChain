import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useReadContract, useReadContracts } from "wagmi"
import type { FeedEvent, Invoice } from "@/lib/invoice"
import { stateFromNumber } from "@/lib/invoice"
import { MOCK_FEED, MOCK_INVOICES } from "@/lib/mock"
import { INVOICE_FACTORY_ABI, INVOICE_CHAIN_ABI } from "@/abis"
import { INVOICE_FACTORY_ADDRESS } from "@/config/contracts"

/**
 * Reads all deployed invoices from InvoiceFactory (`getAllInvoices`), then
 * reads each invoice's real on-chain details (`getInvoiceDetails`) so cards
 * reflect actual state — not placeholders. Falls back to mock cards only
 * when zero real invoices exist yet, so the marketplace isn't empty before
 * the first real deployment.
 */

interface InvoiceStore {
  invoices: Invoice[]
  feed: FeedEvent[]
  addInvoice: (invoice: Invoice) => void
  updateInvoice: (address: string, patch: Partial<Invoice>) => void
  pushEvent: (event: FeedEvent) => void
}

const StoreContext = createContext<InvoiceStore | null>(null)

export function InvoiceStoreProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [feed, setFeed] = useState<FeedEvent[]>([])

  // Step 1: get the list of every invoice address the factory has ever deployed.
  const { data: factoryInvoices } = useReadContract({
    address: INVOICE_FACTORY_ADDRESS as `0x${string}`,
    abi: INVOICE_FACTORY_ABI,
    functionName: "getAllInvoices",
    query: {
      enabled: !!INVOICE_FACTORY_ADDRESS && !INVOICE_FACTORY_ADDRESS.startsWith("0x333333"),
      // Re-poll periodically so state changes (e.g. after repay/claim) show up
      // without a manual refresh.
      refetchInterval: 15_000,
    },
  })

  const addresses = useMemo(
    () => (Array.isArray(factoryInvoices) ? (factoryInvoices as string[]) : []),
    [factoryInvoices],
  )

  // Step 2: for every address, actually read its real details from its own
  // deployed InvoiceChain contract. This is the piece that was missing —
  // without it, every invoice showed hardcoded zeros forever, no matter
  // what its real on-chain state was.
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

  useEffect(() => {
    if (!detailsResults || addresses.length === 0) {
      // No real invoices deployed yet — fall back to mock cards so the
      // marketplace isn't empty before you've created anything.
      setInvoices((prev) => (prev.length === 0 ? MOCK_INVOICES : prev))
      return
    }

    const realInvoices: Invoice[] = addresses
      .map((addr, i) => {
        const result = detailsResults[i]
        if (!result || result.status !== "success" || !result.result) return null
        const [faceValue, fundingGoal, dueDate, debtorName, stateNum, totalRaised] =
          result.result as [bigint, bigint, bigint, string, number, bigint]
        return {
          address: addr,
          owner: "", // not exposed by getInvoiceDetails; fine to leave blank in the card
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

    // Real invoices only — no permanent fake data mixed in once you have
    // at least one real one on-chain.
    setInvoices(realInvoices)
  }, [detailsResults, addresses])

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

  const pushEvent = useCallback((event: FeedEvent) => {
    setFeed((prev) => [event, ...prev])
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