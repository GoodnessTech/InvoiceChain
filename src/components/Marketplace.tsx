import { useMemo, useState } from "react"
import { Inbox } from "lucide-react"
import type { Invoice, InvoiceState } from "@/lib/invoice"
import { InvoiceCard } from "./InvoiceCard"

type FilterKey = "All" | InvoiceState

const FILTERS: FilterKey[] = ["All", "Funding", "Funded", "Repaid", "Cancelled"]

interface MarketplaceProps {
  invoices: Invoice[]
  selectedAddress?: string
  onSelect: (invoice: Invoice) => void
}

export function Marketplace({
  invoices,
  selectedAddress,
  onSelect,
}: MarketplaceProps) {
  const [filter, setFilter] = useState<FilterKey>("All")

  const filtered = useMemo(() => {
    if (filter === "All") return invoices
    return invoices.filter((inv) => inv.state === filter)
  }, [invoices, filter])

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Invoice Marketplace
        </h2>
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {FILTERS.map((f) => {
            const count =
              f === "All"
                ? invoices.length
                : invoices.filter((inv) => inv.state === f).length
            const active = filter === f
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f}
                <span
                  className={`ml-1.5 text-xs ${active ? "text-emerald-100" : "text-slate-400"}`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Inbox className="size-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            No {filter.toLowerCase()} invoices yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((inv) => (
            <InvoiceCard
              key={inv.address}
              invoice={inv}
              selected={
                selectedAddress?.toLowerCase() === inv.address.toLowerCase()
              }
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  )
}
