import type { ButtonHTMLAttributes, ReactNode } from "react"
import type { InvoiceState } from "@/lib/invoice"

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/10 focus-visible:ring-emerald-500",
  secondary:
    "bg-slate-900 hover:bg-slate-800 text-white font-medium focus-visible:ring-slate-500",
  outline:
    "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-medium focus-visible:ring-slate-300",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium",
}

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
}

const stateStyles: Record<InvoiceState, string> = {
  Funding: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Funded: "bg-blue-50 text-blue-700 border-blue-200",
  Repaid: "bg-violet-50 text-violet-700 border-violet-200",
  Distributed: "bg-slate-100 text-slate-600 border-slate-200",
  Cancelled: "bg-rose-50 text-rose-700 border-rose-200",
}

export function StatusBadge({ state }: { state: InvoiceState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        stateStyles[state] ?? stateStyles.Funding,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          state === "Funding" && "bg-emerald-500",
          state === "Funded" && "bg-blue-500",
          state === "Repaid" && "bg-violet-500",
          state === "Distributed" && "bg-slate-400",
          state === "Cancelled" && "bg-rose-500",
        )}
      />
      {state}
    </span>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-emerald-600 transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700">
        {label}
        {hint && <span className="text-xs font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
