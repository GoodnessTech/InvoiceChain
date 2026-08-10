import { formatUnits } from "viem"
import { PAYMENT_TOKEN_DECIMALS, PAYMENT_TOKEN_SYMBOL } from "@/config/contracts"

// Numeric on-chain state -> label mapping (matches Solidity enum State { Funding, Funded, Repaid, Distributed, Cancelled }).
export const INVOICE_STATES = [
  "Funding",
  "Funded",
  "Repaid",
  "Distributed",
  "Cancelled",
] as const

export type InvoiceState = (typeof INVOICE_STATES)[number]

export interface Invoice {
  address: string
  owner: string
  debtorName: string
  faceValue: bigint
  fundingGoal: bigint
  totalRaised: bigint
  dueDate: bigint // unix seconds
  state: InvoiceState
  userShare?: bigint
  pendingPayout?: bigint
  isMock?: boolean
}

export type FeedEventType =
  | "InvoiceCreated"
  | "Invested"
  | "Funded"
  | "Repaid"
  | "Claimed"
  | "Refunded"
  | "InvoiceCancelled"
  | "Refunded"
  | "InvoiceCancelled"

export interface FeedEvent {
  id: string
  type: FeedEventType
  amount?: bigint
  address: string
  txHash: string
  timestamp: number
}

export function stateFromNumber(n: number): InvoiceState {
  return INVOICE_STATES[n] ?? "Funding"
}

export function truncateAddress(addr?: string, size = 4) {
  if (!addr) return "—"
  return `${addr.slice(0, size + 2)}…${addr.slice(-size)}`
}

// Format a token amount (raw bigint) to a human "$X,XXX" string.
export function formatToken(amount: bigint, opts?: { symbol?: boolean }) {
  const value = Number(formatUnits(amount, PAYMENT_TOKEN_DECIMALS))
  const formatted = value.toLocaleString(undefined, {
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  })
  if (opts?.symbol) return `${formatted} ${PAYMENT_TOKEN_SYMBOL}`
  return `$${formatted}`
}

export function formatDueDate(dueDate: bigint) {
  const ms = Number(dueDate) * 1000
  if (!ms) return "—"
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function fundingPct(raised: bigint, goal: bigint) {
  if (goal === 0n) return 0
  const pct = Number((raised * 10000n) / goal) / 100
  return Math.min(100, Math.max(0, pct))
}