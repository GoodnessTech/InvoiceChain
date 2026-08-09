import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Plus, ScrollText } from "lucide-react"
import { Button } from "./ui"
import { useMounted } from "@/hooks/useMounted"

export function Header({ onCreate }: { onCreate: () => void }) {
  const isMounted = useMounted()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
            <ScrollText className="size-5" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              InvoiceChain
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              BOT Chain Mainnet
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button onClick={onCreate} variant="primary">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create Invoice</span>
            <span className="sm:hidden">Create</span>
          </Button>
          {isMounted ? (
            <ConnectButton
              showBalance={false}
              accountStatus="address"
              chainStatus="icon"
            />
          ) : (
            <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-100" />
          )}
        </div>
      </div>
    </header>
  )
}
