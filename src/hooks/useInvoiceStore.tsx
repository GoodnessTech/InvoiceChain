import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { FeedEvent, Invoice } from "@/lib/invoice"
import { MOCK_FEED, MOCK_INVOICES } from "@/lib/mock"

/**
 * A lightweight client-side store that seeds from mock data and layers on
 * locally-created / locally-updated invoices and events.
 *
 * In a live deployment the `getAllInvoices()` factory read + per-invoice
 * `getInvoiceDetails()` reads would hydrate this store. Because the contract
 * addresses are editable placeholders, we always render the fallback mock
 * cards so the marketplace is never empty, and reflect user actions optimistically.
 */

import { useEffect } from "react"
import { useReadContract } from "wagmi"
import { INVOICE_FACTORY_ABI } from "@/abis"
import { INVOICE_FACTORY_ADDRESS } from "@/config/contracts"

interface InvoiceStore {
  invoices: Invoice[]
  feed: FeedEvent[]
  addInvoice: (invoice: Invoice) => void
  updateInvoice: (address: string, patch: Partial<Invoice>) => void
  pushEvent: (event: FeedEvent) => void
}

const StoreContext = createContext<InvoiceStore | null>(null)

export function InvoiceStoreProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES)
  const [feed, setFeed] = useState<FeedEvent[]>(MOCK_FEED)

  // On-chain hydration hook: Reads all deployed invoices from InvoiceFactory
  const { data: factoryInvoices } = useReadContract({
    address: INVOICE_FACTORY_ADDRESS as `0x${string}`,
    abi: INVOICE_FACTORY_ABI,
    functionName: "getAllInvoices",
    query: {
      enabled: !!INVOICE_FACTORY_ADDRESS && !INVOICE_FACTORY_ADDRESS.startsWith("0x333333"),
    },
  })

  useEffect(() => {
    if (factoryInvoices && Array.isArray(factoryInvoices)) {
      setInvoices((prev) => {
        const existingMap = new Set(prev.map((i) => i.address.toLowerCase()))
        const newOnChainInvoices: Invoice[] = (factoryInvoices as string[])
          .filter((addr) => !existingMap.has(addr.toLowerCase()))
          .map((addr) => ({
            address: addr,
            owner: "0x0000000000000000000000000000000000000000",
            debtorName: `Invoice ${addr.slice(0, 6)}…`,
            faceValue: 0n,
            fundingGoal: 0n,
            totalRaised: 0n,
            dueDate: 0n,
            state: "Funding",
          }))
        return [...newOnChainInvoices, ...prev]
      })
    }
  }, [factoryInvoices])

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
