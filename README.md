# InvoiceChain 🧾⛓️

**InvoiceChain** is a smart contract protocol deployed on **BOT Chain** (EVM-compatible) that allows businesses to tokenize unpaid invoices. Investors buy fractional claims on invoices upfront at a discount, and automatically receive pro-rata repayment yield when the business repays the invoice.

---

## 🌟 Overview

1. **Tokenize Invoice**: A business creates an `InvoiceChain` contract with a `faceValue` (e.g. 10,000 USDC) and a discounted `fundingGoal` (e.g. 9,500 USDC).
2. **Fractional Funding**: Investors call `invest()` to contribute funds.
3. **Auto-Funded**: Once `totalRaised >= fundingGoal`, the contract automatically transitions state to `Funded` and forwards the raised funds directly to the business owner.
4. **Repayment**: On or before the due date, the business owner calls `repay()` with the full `faceValue` (10,000 USDC).
5. **Yield Claim**: Investors call `claim()` to withdraw their pro-rata payout based on their initial funding share, earning the yield difference.

---

## 🛠️ Project Structure

```
InvoiceChain/
├── contracts/
│   ├── InvoiceChain.sol    # Main factoring smart contract
│   └── MockERC20.sol       # Test token (6 decimals like USDC)
├── scripts/
│   └── deploy.js           # Deployment script
├── test/
│   └── InvoiceChain.test.js # Hardhat test suite
├── .env.example            # Environment variables template
├── hardhat.config.js       # Hardhat config pre-configured for BOT Chain
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Install Dependencies

Ensure Node.js (v18+) is installed, then run:

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and set your deployer wallet private key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

---

## 🧪 Running Tests

Run the Hardhat unit test suite:

```bash
npx hardhat test
```

The test suite covers:
- Partial investments during `Funding` state.
- Reaching the funding goal (auto-transition to `Funded` + instant transfer of raised funds to owner).
- Rejection of `claim()` prior to repayment.
- Business owner repayment of full `faceValue`.
- Investors claiming pro-rata payouts and zeroing of shares.

---

## 🌐 Networks & Deployment

### Network Details

| Network | Chain ID | RPC URL |
| :--- | :--- | :--- |
| **BOT Testnet** | `968` | `https://rpc.bohr.life` |
| **BOT Mainnet** | `677` | `https://rpc.botchain.ai` |

### Deploy to BOT Testnet

```bash
npx hardhat run scripts/deploy.js --network botTestnet
```

### Deploy to BOT Mainnet

```bash
npx hardhat run scripts/deploy.js --network botMainnet
```

The deploy script will:
1. Deploy `MockERC20` (6 decimals).
2. Mint 1,000,000 USDC tokens to the deployer.
3. Deploy `InvoiceChain` with `faceValue` = 10,000 USDC, `fundingGoal` = 9,500 USDC, `dueDate` = 60 days, and `debtorName` = "Acme Corp".
4. Print deployed contract addresses and artifact ABI paths.

---

## 📜 License

MIT
