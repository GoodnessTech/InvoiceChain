import React from "react"
import ReactDOM from "react-dom/client"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit"
import { Toaster } from "react-hot-toast"

import App from "./App"
import { wagmiConfig } from "./config/wagmi"
import "./index.css"

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#059669",
            accentColorForeground: "white",
            borderRadius: "large",
            fontStack: "system",
          })}
        >
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#0f172a",
                color: "#f8fafc",
                borderRadius: "12px",
                fontSize: "14px",
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
