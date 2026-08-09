import { parseUnits } from "viem"
import { PAYMENT_TOKEN_DECIMALS } from "@/config/contracts"
import type { FeedEvent, Invoice } from "./invoice"

const d = PAYMENT_TOKEN_DECIMALS
const now = Math.floor(Date.now() / 1000)
const day = 86400

// Always-present fallback cards so the marketplace is never empty.
export const MOCK_INVOICES: Invoice[] = [
  {
    address: "0xACME00000000000000000000000000000000ac01",
    owner: "0x1111111111111111111111111111111111111111",
    debtorName: "Acme Corp",
    faceValue: parseUnits("10000", d),
    fundingGoal: parseUnits("9500", d),
    totalRaised: parseUnits("6200", d),
    dueDate: BigInt(now + day * 45),
    state: "Funding",
    isMock: true,
  },
  {
    address: "0xTECH00000000000000000000000000000000tc02",
    owner: "0x2222222222222222222222222222222222222222",
    debtorName: "TechSupply",
    faceValue: parseUnits("25000", d),
    fundingGoal: parseUnits("23000", d),
    totalRaised: parseUnits("23000", d),
    dueDate: BigInt(now + day * 60),
    state: "Funded",
    isMock: true,
  },
  {
    address: "0xLOGI00000000000000000000000000000000lg03",
    owner: "0x3333333333333333333333333333333333333333",
    debtorName: "LogisticsCo",
    faceValue: parseUnits("5000", d),
    fundingGoal: parseUnits("4800", d),
    totalRaised: parseUnits("4800", d),
    dueDate: BigInt(now - day * 5),
    state: "Repaid",
    userShare: parseUnits("1200", d),
    pendingPayout: parseUnits("1250", d),
    isMock: true,
  },
]

export const MOCK_FEED: FeedEvent[] = [
  {
    id: "m1",
    type: "Invested",
    amount: parseUnits("1500", d),
    address: "0x9a3fD2c4E1b7A0F6c5d8E2b1A4c7F0e9D3b6C2a8",
    txHash: "0xabc1230000000000000000000000000000000000000000000000000000000001",
    timestamp: Date.now() - 1000 * 60 * 3,
  },
  {
    id: "m2",
    type: "Funded",
    amount: parseUnits("23000", d),
    address: "0x2222222222222222222222222222222222222222",
    txHash: "0xabc1230000000000000000000000000000000000000000000000000000000002",
    timestamp: Date.now() - 1000 * 60 * 22,
  },
  {
    id: "m3",
    type: "Repaid",
    amount: parseUnits("5250", d),
    address: "0x3333333333333333333333333333333333333333",
    txHash: "0xabc1230000000000000000000000000000000000000000000000000000000003",
    timestamp: Date.now() - 1000 * 60 * 90,
  },
  {
    id: "m4",
    type: "InvoiceCreated",
    address: "0xACME00000000000000000000000000000000ac01",
    txHash: "0xabc1230000000000000000000000000000000000000000000000000000000004",
    timestamp: Date.now() - 1000 * 60 * 140,
  },
]
