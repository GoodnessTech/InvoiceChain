// InvoiceChain on-chain configuration.
// These are editable placeholder addresses — swap them for the live
// deployment addresses on BOT Chain Mainnet.

export const INVOICE_FACTORY_ADDRESS =
  "0x3D53C0dA6C19E688490c53e7E71BF952F5F12A80" as const

export const PAYMENT_TOKEN_ADDRESS =
  "0x8771e8e2b9Be146C38B07c16A59692FdD9dD098E" as const

// Payment token is treated as a 6-decimal stable token (USDC-style).
export const PAYMENT_TOKEN_DECIMALS = 6
export const PAYMENT_TOKEN_SYMBOL = "USDC"

// Explorer URLs are chain-specific — BOT Chain Testnet and Mainnet use
// different explorers (scan.bohr.life vs scan.botchain.ai). Passing the
// wrong one silently shows "not found" even for a genuinely real tx hash,
// so these MUST be resolved against the currently connected chain, not
// hardcoded to one network.
const EXPLORER_BY_CHAIN_ID: Record<number, string> = {
  968: "https://scan.bohr.life", // BOT Chain Testnet
  677: "https://scan.botchain.ai", // BOT Chain Mainnet
}

const DEFAULT_EXPLORER_URL = "https://scan.bohr.life"

export function explorerTx(hash: string, chainId?: number) {
  const base =
    (chainId && EXPLORER_BY_CHAIN_ID[chainId]) || DEFAULT_EXPLORER_URL
  return `${base}/tx/${hash}`
}

export function explorerAddress(address: string, chainId?: number) {
  const base =
    (chainId && EXPLORER_BY_CHAIN_ID[chainId]) || DEFAULT_EXPLORER_URL
  return `${base}/address/${address}`
}