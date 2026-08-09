import { Activity, Layers, Lock } from "lucide-react"
import type { Invoice } from "@/lib/invoice"
import { formatToken } from "@/lib/invoice"

export function StatsBar({ invoices }: { invoices: Invoice[] }) {
  const total = invoices.length
  const tvl = invoices.reduce((acc, inv) => acc + inv.totalRaised, 0n)
  const activeFunding = invoices.filter((inv) => inv.state === "Funding").length

  const stats = [
    {
      label: "Total Invoices",
      value: total.toString(),
      icon: Layers,
    },
    {
      label: "Total Value Locked",
      value: formatToken(tvl),
      icon: Lock,
    },
    {
      label: "Active Funding",
      value: activeFunding.toString(),
      icon: Activity,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <s.icon className="size-5" />
          </div>
          <div>
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="text-xl font-semibold text-slate-900">{s.value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
