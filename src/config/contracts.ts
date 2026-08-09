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

export const BLOCK_EXPLORER_URL = "https://scan.botchain.ai"

export function explorerTx(hash: string) {
  return `${BLOCK_EXPLORER_URL}/tx/${hash}`
}

export function explorerAddress(address: string) {
  return `${BLOCK_EXPLORER_URL}/address/${address}`
}
