import { defineChain } from "viem"
import { getDefaultConfig } from "@rainbow-me/rainbowkit"

// BOT Chain Mainnet Definition
export const botChain = defineChain({
  id: 677,
  name: "BOT Chain Mainnet",
  nativeCurrency: {
    name: "BOT",
    symbol: "BOT",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.botchain.ai"] },
    public: { http: ["https://rpc.botchain.ai"] },
  },
  blockExplorers: {
    default: {
      name: "BohrScan",
      url: "https://scan.botchain.ai",
    },
  },
})

// BOT Chain Testnet (Bohr Testnet) Definition
export const botTestnet = defineChain({
  id: 968,
  name: "BOT Chain Testnet",
  nativeCurrency: {
    name: "BOT",
    symbol: "BOT",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.bohr.life"] },
    public: { http: ["https://rpc.bohr.life"] },
  },
  blockExplorers: {
    default: {
      name: "BohrScan",
      url: "https://scan.bohr.life",
    },
  },
})

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "088bc31551cf327b14e5f722c6e44a12"

export const wagmiConfig = getDefaultConfig({
  appName: "InvoiceChain",
  projectId: walletConnectProjectId,
  chains: [botTestnet, botChain], // botTestnet listed first so RainbowKit connects to testnet by default
  ssr: false,
})