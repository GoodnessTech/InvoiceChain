import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Droplet, Plus, ScrollText } from "lucide-react"
import { useState } from "react"
import { useAccount, useChainId, useWriteContract } from "wagmi"
import toast from "react-hot-toast"
import { parseUnits } from "viem"
import { Button } from "./ui"
import { useMounted } from "@/hooks/useMounted"
import { PAYMENT_TOKEN_ADDRESS, PAYMENT_TOKEN_DECIMALS } from "@/config/contracts"

// Minimal ABI just for the testnet mock token's public, unrestricted mint()
// function — this is a testnet-only dev convenience, NOT part of the real
// InvoiceChain protocol ABI. Never used against mainnet (button is hidden
// there — see chainId check below).
const MOCK_MINT_ABI = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

const BOT_TESTNET_CHAIN_ID = 968
const BOT_MAINNET_CHAIN_ID = 677

function NetworkBadge() {
  const chainId = useChainId()
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">
        Not Connected
      </span>
    )
  }

  if (chainId === BOT_MAINNET_CHAIN_ID) {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        BOT Chain Mainnet
      </span>
    )
  }

  if (chainId === BOT_TESTNET_CHAIN_ID) {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        BOT Chain Testnet
      </span>
    )
  }

  return (
    <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
      Wrong Network
    </span>
  )
}

function GetTestUsdcButton() {
  const chainId = useChainId()
  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const [minting, setMinting] = useState(false)

  // Testnet only — this must never render (or be callable) on mainnet.
  if (chainId !== BOT_TESTNET_CHAIN_ID || !isConnected || !address) {
    return null
  }

  async function handleMint() {
    setMinting(true)
    const id = toast.loading("Minting test USDC…")
    try {
      await writeContractAsync({
        address: PAYMENT_TOKEN_ADDRESS,
        abi: MOCK_MINT_ABI,
        functionName: "mint",
        args: [address!, parseUnits("5000", PAYMENT_TOKEN_DECIMALS)],
      })
      toast.success("Minted 5,000 test USDC to your wallet", { id })
    } catch (err) {
      const message =
        (err as { shortMessage?: string; message?: string })?.shortMessage ??
        "Mint failed"
      toast.error(message, { id })
    }
    setMinting(false)
  }

  return (
    <Button onClick={handleMint} variant="outline" loading={minting}>
      <Droplet className="size-4" />
      <span className="hidden sm:inline">Get Test USDC</span>
      <span className="sm:hidden">Test USDC</span>
    </Button>
  )
}

export function Header({ onCreate }: { onCreate: () => void }) {
  const isMounted = useMounted()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
            <ScrollText className="size-5" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              InvoiceChain
            </span>
            {isMounted ? (
              <NetworkBadge />
            ) : (
              <span className="h-5 w-32 animate-pulse rounded-full bg-slate-100" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isMounted && <GetTestUsdcButton />}
          <Button onClick={onCreate} variant="primary">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create Invoice</span>
            <span className="sm:hidden">Create</span>
          </Button>
          {isMounted ? (
            <ConnectButton
              showBalance={false}
              accountStatus="address"
              chainStatus="icon"
            />
          ) : (
            <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-100" />
          )}
        </div>
      </div>
    </header>
  )
}