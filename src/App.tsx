import { useState } from "react"
import "@rainbow-me/rainbowkit/styles.css"
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { wagmiConfig, botTestnet, botChain } from "./config/wagmi"

import { Header } from "./components/Header"
import { StatsBar } from "./components/StatsBar"
import { Marketplace } from "./components/Marketplace"
import { InvoiceConsole } from "./components/InvoiceConsole"
import { ActivityFeed } from "./components/ActivityFeed"
import { CreateInvoiceModal } from "./components/CreateInvoiceModal"
import {
  InvoiceStoreProvider,
  useInvoiceStore,
} from "./hooks/useInvoiceStore"
import type { Invoice } from "./lib/invoice"

// 1. Instantiate QueryClient OUTSIDE the component to prevent re-render loops
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
})

function Dashboard() {
  const { invoices, feed } = useInvoiceStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<string>()

  const selected = invoices.find(
    (inv) => inv.address.toLowerCase() === selectedAddress?.toLowerCase(),
  )

  function handleSelect(invoice: Invoice) {
    setSelectedAddress((prev) =>
      prev?.toLowerCase() === invoice.address.toLowerCase()
        ? undefined
        : invoice.address,
    )
    requestAnimationFrame(() => {
      document
        .getElementById("invoice-console")
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header onCreate={() => setCreateOpen(true)} />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-900">
            Real-World Asset Invoice Financing
          </h1>
          <p className="mt-1 max-w-2xl text-pretty text-sm text-slate-500">
            Fund tokenized invoices, earn pro-rata yield, and track settlements
            live on BOT Chain.
          </p>
        </div>

        <StatsBar invoices={invoices} />

        <Marketplace
          invoices={invoices}
          selectedAddress={selectedAddress}
          onSelect={handleSelect}
        />

        {selected && (
          <section id="invoice-console" className="scroll-mt-20">
            <InvoiceConsole
              invoice={selected}
              onClose={() => setSelectedAddress(undefined)}
            />
          </section>
        )}

        <ActivityFeed feed={feed} />
      </main>

      <footer className="border-t border-slate-200 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-400 sm:px-6">
          InvoiceChain · Chain ID 677 · RPC rpc.botchain.ai · Explorer
         scan.botchain.ai
        </div>
      </footer>

      <CreateInvoiceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}

// 2. Wrap App with WagmiProvider, QueryClientProvider, and RainbowKitProvider (with green theme and botTestnet)
export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={botChain}
          theme={lightTheme({
            accentColor: "#059669", // Emerald-600 green
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
        >
          <InvoiceStoreProvider>
            <Dashboard />
          </InvoiceStoreProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}