import {
  ArrowUpRight,
  Coins,
  FilePlus2,
  HandCoins,
  Radio,
  TrendingUp,
} from "lucide-react"
import type { FeedEvent, FeedEventType } from "@/lib/invoice"
import { formatToken, truncateAddress } from "@/lib/invoice"
import { explorerTx } from "@/config/contracts"
import { Card } from "./ui"

const eventMeta: Record<
  FeedEventType,
  { icon: typeof Coins; label: string; className: string }
> = {
  InvoiceCreated: {
    icon: FilePlus2,
    label: "Invoice Created",
    className: "bg-slate-100 text-slate-600",
  },
  Invested: {
    icon: TrendingUp,
    label: "Invested",
    className: "bg-emerald-50 text-emerald-600",
  },
  Funded: {
    icon: Coins,
    label: "Funded",
    className: "bg-blue-50 text-blue-600",
  },
  Repaid: {
    icon: HandCoins,
    label: "Repaid",
    className: "bg-violet-50 text-violet-600",
  },
  Claimed: {
    icon: Coins,
    label: "Claimed",
    className: "bg-amber-50 text-amber-600",
  },
}

function timeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function ActivityFeed({ feed }: { feed: FeedEvent[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <h2 className="text-base font-semibold text-slate-900">
            Live On-Chain Activity
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Radio className="size-3.5" />
          BOT Chain events
        </div>
      </div>

      <div className="thin-scroll max-h-96 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-400">
            <tr className="border-b border-slate-100">
              <th className="px-5 py-2.5 font-medium">Event</th>
              <th className="px-5 py-2.5 font-medium">Amount</th>
              <th className="px-5 py-2.5 font-medium">Address</th>
              <th className="px-5 py-2.5 text-right font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {feed.map((e) => {
              const meta = eventMeta[e.type]
              const Icon = meta.icon
              return (
                <tr
                  key={e.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex size-7 items-center justify-center rounded-lg ${meta.className}`}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div>
                        <div className="font-medium text-slate-800">
                          {meta.label}
                        </div>
                        <div className="text-xs text-slate-400">
                          {timeAgo(e.timestamp)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {e.amount !== undefined ? formatToken(e.amount) : "—"}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">
                    {truncateAddress(e.address, 4)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <a
                      href={explorerTx(e.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-500"
                    >
                      {truncateAddress(e.txHash, 3)}
                      <ArrowUpRight className="size-3" />
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
