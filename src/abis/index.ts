// Exact ABIs for the InvoiceChain protocol on BOT Chain Mainnet.

export const INVOICE_FACTORY_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "_faceValue", type: "uint256" },
      { internalType: "uint256", name: "_fundingGoal", type: "uint256" },
      { internalType: "uint256", name: "_dueDate", type: "uint256" },
      { internalType: "string", name: "_debtorName", type: "string" },
      { internalType: "address", name: "_paymentToken", type: "address" },
    ],
    name: "createInvoice",
    outputs: [
      { internalType: "address", name: "invoiceAddress", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllInvoices",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "getInvoicesByOwner",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "invoiceAddress",
        type: "address",
      },
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "faceValue",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "fundingGoal",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "dueDate",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "debtorName",
        type: "string",
      },
    ],
    name: "InvoiceCreated",
    type: "event",
  },
] as const

export const INVOICE_CHAIN_ABI = [
  {
    inputs: [],
    name: "getInvoiceDetails",
    stateMutability: "view",
    type: "function",
    outputs: [
      { internalType: "uint256", name: "_faceValue", type: "uint256" },
      { internalType: "uint256", name: "_fundingGoal", type: "uint256" },
      { internalType: "uint256", name: "_dueDate", type: "uint256" },
      { internalType: "string", name: "_debtorName", type: "string" },
      { internalType: "uint8", name: "_state", type: "uint8" },
      { internalType: "uint256", name: "_totalRaised", type: "uint256" },
    ],
  },
  {
    inputs: [{ internalType: "address", name: "investor", type: "address" }],
    name: "getInvestorShare",
    stateMutability: "view",
    type: "function",
    outputs: [
      { internalType: "uint256", name: "shareAmount", type: "uint256" },
      { internalType: "uint256", name: "pendingPayout", type: "uint256" },
    ],
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "invest",
    stateMutability: "nonpayable",
    type: "function",
    outputs: [],
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "repay",
    stateMutability: "nonpayable",
    type: "function",
    outputs: [],
  },
  {
    inputs: [],
    name: "claim",
    stateMutability: "nonpayable",
    type: "function",
    outputs: [],
  },
  {
    inputs: [],
    name: "cancelInvoice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "refund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    stateMutability: "view",
    type: "function",
    outputs: [{ internalType: "address", name: "", type: "address" }],
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "investor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalRaised",
        type: "uint256",
      },
    ],
    name: "Invested",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalRaised",
        type: "uint256",
      },
    ],
    name: "Funded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Repaid",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "investor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Claimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "investor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Refunded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "InvoiceCancelled",
    type: "event",
  },
] as const

// Minimal ERC-20 ABI for approvals / balances on the payment token.
export const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const
