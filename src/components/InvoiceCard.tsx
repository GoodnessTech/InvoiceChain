import { ArrowUpRight, Building2, CalendarClock } from "lucide-react"
import type { Invoice } from "@/lib/invoice"
import { formatDueDate, formatToken, fundingPct } from "@/lib/invoice"
import { Button, ProgressBar, StatusBadge } from "./ui"

interface InvoiceCardProps {
  invoice: Invoice
  selected: boolean
  onSelect: (invoice: Invoice) => void
}

export function InvoiceCard({ invoice, selected, onSelect }: InvoiceCardProps) {
  const pct = fundingPct(invoice.totalRaised, invoice.fundingGoal)

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all ${
        selected
          ? "border-emerald-400 ring-2 ring-emerald-500/20"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Building2 className="size-4.5" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{invoice.debtorName}</div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <CalendarClock className="size-3.5" />
              Due {formatDueDate(invoice.dueDate)}
            </div>
          </div>
        </div>
        <StatusBadge state={invoice.state} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Face Value</div>
          <div className="text-base font-semibold text-slate-900">
            {formatToken(invoice.faceValue)}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Funding Goal</div>
          <div className="text-base font-semibold text-slate-900">
            {formatToken(invoice.fundingGoal)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {formatToken(invoice.totalRaised)} raised
          </span>
          <span className="font-medium text-emerald-700">{pct.toFixed(0)}%</span>
        </div>
        <ProgressBar value={pct} />
      </div>

      <Button
        variant={selected ? "secondary" : "outline"}
        className="mt-5 w-full"
        onClick={() => onSelect(invoice)}
      >
        {selected ? "Selected" : "View & Invest"}
        <ArrowUpRight className="size-4" />
      </Button>
    </div>
  )
}
