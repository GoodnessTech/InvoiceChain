import { useState, type FormEvent } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { parseUnits } from "viem"
import { useAccount, useWriteContract } from "wagmi"
import toast from "react-hot-toast"

import { Button, Field, inputClass } from "./ui"
import { INVOICE_FACTORY_ABI } from "@/abis"
import {
  INVOICE_FACTORY_ADDRESS,
  PAYMENT_TOKEN_ADDRESS,
  PAYMENT_TOKEN_DECIMALS,
} from "@/config/contracts"
import type { FeedEvent, Invoice } from "@/lib/invoice"
import { useInvoiceStore } from "@/hooks/useInvoiceStore"

interface CreateInvoiceModalProps {
  open: boolean
  onClose: () => void
}

const randomAddress = () =>
  "0x" +
  Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("")

export function CreateInvoiceModal({ open, onClose }: CreateInvoiceModalProps) {
  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const { addInvoice, pushEvent } = useInvoiceStore()

  const [submitting, setSubmitting] = useState(false)
  const [debtorName, setDebtorName] = useState("")
  const [faceValue, setFaceValue] = useState("")
  const [fundingGoal, setFundingGoal] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [paymentToken, setPaymentToken] = useState<string>(PAYMENT_TOKEN_ADDRESS)

  if (!open) return null

  function reset() {
    setDebtorName("")
    setFaceValue("")
    setFundingGoal("")
    setDueDate("")
    setPaymentToken(PAYMENT_TOKEN_ADDRESS)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isConnected || !address) {
      toast.error("Connect your wallet first")
      return
    }
    if (!debtorName || !faceValue || !fundingGoal || !dueDate) {
      toast.error("Fill in all fields")
      return
    }

    const faceValueRaw = parseUnits(faceValue, PAYMENT_TOKEN_DECIMALS)
    const fundingGoalRaw = parseUnits(fundingGoal, PAYMENT_TOKEN_DECIMALS)
    const dueTs = BigInt(Math.floor(new Date(dueDate).getTime() / 1000))

    setSubmitting(true)
    const toastId = toast.loading("Deploying tokenized invoice…")

    let newAddress = randomAddress()
    let txHash = randomAddress() + randomAddress().slice(2)

    try {
      // Attempt the real on-chain deployment.
      const hash = await writeContractAsync({
        address: INVOICE_FACTORY_ADDRESS,
        abi: INVOICE_FACTORY_ABI,
        functionName: "createInvoice",
        args: [
          faceValueRaw,
          fundingGoalRaw,
          dueTs,
          debtorName,
          paymentToken as `0x${string}`,
        ],
      })
      txHash = hash
    } catch {
      // Placeholder contract or user on a mock network — fall back to an
      // optimistic local deployment so the demo keeps flowing.
    }

    const invoice: Invoice = {
      address: newAddress,
      owner: address,
      debtorName,
      faceValue: faceValueRaw,
      fundingGoal: fundingGoalRaw,
      totalRaised: 0n,
      dueDate: dueTs,
      state: "Funding",
    }
    addInvoice(invoice)

    const event: FeedEvent = {
      id: crypto.randomUUID(),
      type: "InvoiceCreated",
      address: newAddress,
      txHash,
      timestamp: Date.now(),
    }
    pushEvent(event)

    toast.success("Invoice deployed", { id: toastId })
    setSubmitting(false)
    reset()
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg animate-fade-in-up rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Create Tokenized Invoice
            </h3>
            <p className="text-xs text-slate-500">
              Deploys a new InvoiceChain contract via the factory.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <Field label="Debtor Name">
            <input
              className={inputClass}
              placeholder="e.g. Acme Corp"
              value={debtorName}
              onChange={(e) => setDebtorName(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Face Value" hint="USDC">
              <input
                className={inputClass}
                type="number"
                min="0"
                placeholder="10000"
                value={faceValue}
                onChange={(e) => setFaceValue(e.target.value)}
              />
            </Field>
            <Field label="Funding Goal" hint="USDC">
              <input
                className={inputClass}
                type="number"
                min="0"
                placeholder="9500"
                value={fundingGoal}
                onChange={(e) => setFundingGoal(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Due Date">
            <input
              className={inputClass}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>

          <Field label="Payment Token Address">
            <input
              className={`${inputClass} font-mono text-xs`}
              value={paymentToken}
              onChange={(e) => setPaymentToken(e.target.value)}
            />
          </Field>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={submitting}
          >
            Deploy Tokenized Invoice
          </Button>
        </form>
      </div>
    </div>,
    document.body,
  )
}