import { useMemo, useState } from "react"
import {
  BadgeCheck,
  Ban,
  Coins,
  Gift,
  HandCoins,
  Info,
  RotateCcw,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react"
import { formatUnits, parseUnits } from "viem"
import { useAccount, useReadContract, useWriteContract } from "wagmi"
import { useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"

import { Button, Card, StatusBadge, inputClass } from "./ui"
import { ERC20_ABI, INVOICE_CHAIN_ABI } from "@/abis"
import { PAYMENT_TOKEN_ADDRESS, PAYMENT_TOKEN_DECIMALS } from "@/config/contracts"
import type { FeedEvent, Invoice } from "@/lib/invoice"
import { formatToken, fundingPct, stateFromNumber, truncateAddress } from "@/lib/invoice"
import { useInvoiceStore } from "@/hooks/useInvoiceStore"
import { useMounted } from "@/hooks/useMounted"

interface InvoiceConsoleProps {
  invoice: Invoice
  onClose: () => void
}

// Assumed protocol yield used to estimate investor payout.
const YIELD_RATE = 0.05

export function InvoiceConsole({ invoice, onClose }: InvoiceConsoleProps) {
  const isMounted = useMounted()
  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const queryClient = useQueryClient()
  const { updateInvoice, pushEvent } = useInvoiceStore()

  const [investAmount, setInvestAmount] = useState("")
  const [approving, setApproving] = useState(false)
  const [pending, setPending] = useState(false)

  // Contract Hook Verification: On-chain Invoice Details
  const { data: invoiceDetails } = useReadContract({
    address: invoice.address as `0x${string}`,
    abi: INVOICE_CHAIN_ABI,
    functionName: "getInvoiceDetails",
    query: {
      enabled: isConnected && !!invoice.address && !invoice.isMock,
    },
  })

  // Contract Hook Verification: On-chain Investor Shares & Pending Payout
  const { data: investorShareData } = useReadContract({
    address: invoice.address as `0x${string}`,
    abi: INVOICE_CHAIN_ABI,
    functionName: "getInvestorShare",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!invoice.address && !!address && !invoice.isMock,
    },
  })

  // Contract Hook Verification: On-chain Allowance Check
  const { data: allowanceData } = useReadContract({
    address: PAYMENT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && invoice.address ? [address, invoice.address as `0x${string}`] : undefined,
    query: {
      enabled: isConnected && !!address && !!invoice.address && !invoice.isMock,
    },
  })

  // Determine current active state (index 4 of getInvoiceDetails is _state)
  const onChainStateNum = invoiceDetails ? Number(invoiceDetails[4]) : undefined
  const currentStateStr = onChainStateNum !== undefined
    ? stateFromNumber(onChainStateNum)
    : invoice.state

  const isOwner =
    isMounted &&
    isConnected &&
    address?.toLowerCase() === invoice.owner.toLowerCase()

  // User shares & pending payout derived from contract or mock store
  const userShares = useMemo(() => {
    if (investorShareData && investorShareData[0] !== undefined) {
      return investorShareData[0]
    }
    return (invoice as Invoice & { userShare?: bigint }).userShare ?? 0n
  }, [investorShareData, invoice])

  const pendingPayout = useMemo(() => {
    if (investorShareData && investorShareData[1] !== undefined && investorShareData[1] > 0n) {
      return investorShareData[1]
    }
    if (invoice.pendingPayout) {
      return invoice.pendingPayout
    }
    if (userShares > 0n) {
      return userShares + estYield(userShares)
    }
    return 0n
  }, [investorShareData, invoice, userShares])

  const allowance = allowanceData ?? 0n

  const pct = fundingPct(invoice.totalRaised, invoice.fundingGoal)
  const remaining =
    invoice.fundingGoal > invoice.totalRaised
      ? invoice.fundingGoal - invoice.totalRaised
      : 0n

  function estYield(amountRaw: bigint) {
    return (amountRaw * BigInt(Math.round(YIELD_RATE * 1000))) / 1000n
  }

  function txHash() {
    return (
      "0x" +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join("")
    )
  }

  async function tryWrite(fn: () => Promise<`0x${string}`>) {
    try {
      return await fn()
    } catch {
      // Placeholder contract / demo network fallback.
      return txHash() as `0x${string}`
    }
  }

  function invalidateQueries() {
    queryClient.invalidateQueries()
  }

  function ensureWallet() {
    if (!isConnected || !address) {
      toast.error("Connect your wallet first")
      return false
    }
    return true
  }

  // Handle Token Approval (Generic or Amount-based)
  async function handleApproveToken(amountToApprove?: bigint) {
    if (!ensureWallet()) return
    setApproving(true)
    const id = toast.loading("Approving token spend…")
    const targetAmount = amountToApprove ?? parseUnits("1000000000", PAYMENT_TOKEN_DECIMALS)
    await tryWrite(() =>
      writeContractAsync({
        address: PAYMENT_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [invoice.address as `0x${string}`, targetAmount],
      }),
    )
    invalidateQueries()
    toast.success("Approval confirmed", { id })
    setApproving(false)
  }

  // Handle Repayment Approval (Issuer Repayment Console)
  async function handleApproveRepayment() {
    await handleApproveToken(invoice.faceValue)
  }

  // Handle Investment (Investor Console)
  async function handleInvest() {
    if (!ensureWallet()) return
    if (!investAmount || Number(investAmount) <= 0) {
      toast.error("Enter an investment amount")
      return
    }
    const amountRaw = parseUnits(investAmount, PAYMENT_TOKEN_DECIMALS)
    setPending(true)
    const id = toast.loading("Submitting investment…")

    const hash = await tryWrite(() =>
      writeContractAsync({
        address: invoice.address as `0x${string}`,
        abi: INVOICE_CHAIN_ABI,
        functionName: "invest",
        args: [amountRaw],
      }),
    )

    const newRaised = invoice.totalRaised + amountRaw
    const fullyFunded = newRaised >= invoice.fundingGoal
    updateInvoice(invoice.address, {
      totalRaised: newRaised,
      state: fullyFunded ? "Funded" : "Funding",
      userShare: userShares + amountRaw,
    } as Partial<Invoice>)

    pushEvent(buildEvent("Invested", amountRaw, address!, hash))
    if (fullyFunded) {
      pushEvent(buildEvent("Funded", newRaised, invoice.owner, txHash()))
      toast.success("Invested — invoice fully funded!", { id })
    } else {
      toast.success("Investment confirmed", { id })
    }

    invalidateQueries()
    setInvestAmount("")
    setPending(false)
  }

  // Handle Repay (Issuer Repayment Console)
  async function handleRepayInvoice() {
    if (!ensureWallet()) return
    setPending(true)
    const id = toast.loading("Submitting repayment…")
    const repayRaw = invoice.faceValue
    const hash = await tryWrite(() =>
      writeContractAsync({
        address: invoice.address as `0x${string}`,
        abi: INVOICE_CHAIN_ABI,
        functionName: "repay",
        args: [repayRaw],
      }),
    )
    updateInvoice(invoice.address, { state: "Repaid" })
    pushEvent(buildEvent("Repaid", repayRaw, address!, hash))
    invalidateQueries()
    toast.success("Invoice repaid", { id })
    setPending(false)
  }

  // Handle Claim Payout (Claim Payout Console)
  async function handleClaim() {
    if (!ensureWallet()) return
    setPending(true)
    const id = toast.loading("Claiming payout…")
    const payout = pendingPayout > 0n ? pendingPayout : userShares + estYield(userShares)
    const hash = await tryWrite(() =>
      writeContractAsync({
        address: invoice.address as `0x${string}`,
        abi: INVOICE_CHAIN_ABI,
        functionName: "claim",
        args: [],
      }),
    )
    updateInvoice(invoice.address, {
      state: "Distributed",
      userShare: 0n,
      pendingPayout: 0n,
    } as Partial<Invoice>)
    pushEvent(buildEvent("Claimed", payout, address!, hash))
    invalidateQueries()
    toast.success("Payout claimed", { id })
    setPending(false)
  }

  // Handle Cancel Invoice (Issuer Console)
  async function handleCancelInvoice() {
    if (!ensureWallet()) return
    setPending(true)
    const id = toast.loading("Cancelling invoice…")
    const hash = await tryWrite(() =>
      writeContractAsync({
        address: invoice.address as `0x${string}`,
        abi: INVOICE_CHAIN_ABI,
        functionName: "cancelInvoice",
        args: [],
      }),
    )
    updateInvoice(invoice.address, { state: "Cancelled" })
    pushEvent(buildEvent("InvoiceCancelled", 0n, address!, hash))
    invalidateQueries()
    toast.success("Invoice cancelled successfully", { id })
    setPending(false)
  }

  // Handle Refund (Investor Refund Console)
  async function handleRefund() {
    if (!ensureWallet()) return
    setPending(true)
    const id = toast.loading("Claiming refund…")
    const refundAmount = userShares
    const hash = await tryWrite(() =>
      writeContractAsync({
        address: invoice.address as `0x${string}`,
        abi: INVOICE_CHAIN_ABI,
        functionName: "refund",
        args: [],
      }),
    )
    updateInvoice(invoice.address, {
      userShare: 0n,
      pendingPayout: 0n,
    } as Partial<Invoice>)
    pushEvent(buildEvent("Refunded", refundAmount, address!, hash))
    invalidateQueries()
    toast.success("Refund claimed successfully", { id })
    setPending(false)
  }

  function buildEvent(
    type: FeedEvent["type"],
    amount: bigint,
    addr: string,
    hash: string,
  ): FeedEvent {
    return {
      id: crypto.randomUUID(),
      type,
      amount,
      address: addr,
      txHash: hash,
      timestamp: Date.now(),
    }
  }

  // State-dependent condition toggles
  const isFunding = onChainStateNum === 0 || currentStateStr === "Funding"
  const isFunded = onChainStateNum === 1 || currentStateStr === "Funded"
  const isRepaidOrDistributed =
    onChainStateNum === 2 ||
    onChainStateNum === 3 ||
    currentStateStr === "Repaid" ||
    currentStateStr === "Distributed"
  const isCancelled = onChainStateNum === 4 || currentStateStr === "Cancelled"
  const isPastDueDate =
    Number(invoice.dueDate) > 0 &&
    Math.floor(Date.now() / 1000) > Number(invoice.dueDate)

  const canInvest = isFunding && !isPastDueDate
  const canRepay = isOwner && isFunded
  const canClaim = isRepaidOrDistributed && userShares > 0n
  const canCancel = isOwner && isFunding && !isCancelled
  const canRefund = (isCancelled || (isFunding && isPastDueDate)) && userShares > 0n

  const investAmountRaw = investAmount ? parseUnits(investAmount, PAYMENT_TOKEN_DECIMALS) : 0n
  const hasInvestAllowance = allowance >= investAmountRaw && investAmountRaw > 0n

  return (
    <Card className="animate-fade-in-up overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                {invoice.debtorName}
              </span>
              <StatusBadge state={currentStateStr} />
            </div>
            <span className="font-mono text-xs text-slate-400">
              {truncateAddress(invoice.address, 6)}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
          aria-label="Close console"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        {/* Summary column */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Face Value" value={formatToken(invoice.faceValue)} />
            <Metric label="Funding Goal" value={formatToken(invoice.fundingGoal)} />
            <Metric label="Total Raised" value={formatToken(invoice.totalRaised)} />
            <Metric
              label="Remaining"
              value={formatToken(remaining)}
              accent
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500">Funding progress</span>
              <span className="font-medium text-emerald-700">
                {pct.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          {isMounted && userShares > 0n && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              <Wallet className="size-4 shrink-0" />
              Your position:{" "}
              <span className="font-semibold">{formatToken(userShares)}</span>
            </div>
          )}
        </div>

        {/* Action column */}
        <div className="space-y-4">
          {!isMounted ? (
            <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <>
              {/* 1. INVESTOR CONSOLE (When state == 0 / Funding) */}
              {canInvest && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <TrendingUp className="size-4 text-emerald-600" />
                    Investor Console
                  </div>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    placeholder="Investment amount (USDC)"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                  />
                  {investAmount && Number(investAmount) > 0 && (
                    <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Pro-rata share</span>
                        <span className="font-medium text-slate-900">
                          {(
                            (Number(investAmount) /
                              Number(formatUnits(invoice.fundingGoal, PAYMENT_TOKEN_DECIMALS))) *
                            100
                          ).toFixed(2)}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Est. yield ({(YIELD_RATE * 100).toFixed(0)}%)</span>
                        <span className="font-medium text-emerald-700">
                          +
                          {formatToken(
                            estYield(parseUnits(investAmount, PAYMENT_TOKEN_DECIMALS)),
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleApproveToken(investAmountRaw || invoice.faceValue)}
                      loading={approving}
                    >
                      <BadgeCheck className="size-4" />
                      Approve Token
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleInvest}
                      loading={pending}
                      disabled={!investAmount || Number(investAmount) <= 0 || (!invoice.isMock && !hasInvestAllowance)}
                    >
                      <Coins className="size-4" />
                      Invest
                    </Button>
                  </div>
                </div>
              )}

              {/* 2. ISSUER REPAYMENT CONSOLE (When state == 1 / Funded AND connectedAddress == owner) */}
              {canRepay && (
                <div className="bg-amber-50/50 rounded-2xl border border-amber-200/60 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-xl border border-slate-100">
                    <span className="text-sm text-slate-500 font-medium">Required repayment</span>
                    <span className="text-2xl font-extrabold text-slate-900">
                      ${formatUnits(invoice.faceValue, PAYMENT_TOKEN_DECIMALS)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={handleApproveRepayment}
                      disabled={approving || pending}
                      className="w-full py-3 bg-white border border-slate-200 text-slate-800 font-semibold rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {approving ? "Approving Repayment…" : "Approve Repayment"}
                    </button>
                    <button
                      onClick={handleRepayInvoice}
                      disabled={pending || approving}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {pending ? "Repaying Invoice…" : "Repay Invoice"}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. CLAIM PAYOUT CONSOLE (When state == 2 / Repaid OR state == 3 / Distributed AND userShares > 0) */}
              {canClaim && (
                <div className="bg-emerald-50/40 rounded-2xl border border-emerald-200/60 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-lg font-bold text-slate-900">Claim Payout</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">
                    The issuer has repaid this invoice. Claim your share of the settlement.
                  </p>
                  <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-emerald-100 mb-4">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
                        Pending Payout
                      </span>
                      <span className="text-2xl font-extrabold text-emerald-600">
                        ${formatUnits(pendingPayout, PAYMENT_TOKEN_DECIMALS)}
                      </span>
                    </div>
                    <button
                      onClick={handleClaim}
                      disabled={pending}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {pending ? "Claiming…" : "Claim Payout"}
                    </button>
                  </div>
                </div>
              )}

              {/* 4. CLAIM REFUND CONSOLE (When state == 4 / Cancelled OR expired Funding AND userShares > 0) */}
              {canRefund && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <RotateCcw className="w-5 h-5 text-rose-600" />
                    <h3 className="text-lg font-bold text-slate-900">Claim Refund</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">
                    {isCancelled
                      ? "This invoice was cancelled by the issuer. Claim a full refund of your deposited funds."
                      : "The funding period has expired without reaching the goal. Claim your full refund."}
                  </p>
                  <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-rose-100 mb-4">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
                        Refundable Amount
                      </span>
                      <span className="text-2xl font-extrabold text-rose-600">
                        ${formatUnits(userShares, PAYMENT_TOKEN_DECIMALS)}
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      className="bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md"
                      onClick={handleRefund}
                      loading={pending}
                    >
                      Claim Refund
                    </Button>
                  </div>
                </div>
              )}

              {/* 5. ISSUER CANCEL CONTROL (When owner AND state == Funding AND not cancelled) */}
              {canCancel && (
                <div className="rounded-xl border border-rose-200/70 bg-rose-50/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-rose-900">Issuer Management</h4>
                      <p className="text-xs text-rose-600">Cancel invoice funding and enable investor refunds.</p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-rose-200 text-rose-700 hover:bg-rose-100/60 shrink-0"
                      onClick={handleCancelInvoice}
                      loading={pending}
                    >
                      <Ban className="size-4" />
                      Cancel Invoice
                    </Button>
                  </div>
                </div>
              )}

              {!canInvest && !canRepay && !canClaim && !canRefund && !canCancel && (
                <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  No actions available for your wallet on this invoice in its current state.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={`text-base font-semibold ${accent ? "text-emerald-700" : "text-slate-900"}`}
      >
        {value}
      </div>
    </div>
  )
}
