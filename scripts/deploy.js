const { ethers } = require("hardhat");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy MockERC20
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Test USDC", "USDC", 6);
  await mockToken.waitForDeployment();
  const mockTokenAddress = await mockToken.getAddress();
  console.log("MockERC20 deployed to:", mockTokenAddress);

  // Mint 1,000,000 tokens (with 6 decimals) to deployer
  const mintAmount = ethers.parseUnits("1000000", 6);
  const mintTx = await mockToken.mint(deployer.address, mintAmount);
  await mintTx.wait();
  console.log(`Minted 1,000,000 USDC tokens to deployer (${deployer.address})`);

  // 2. Deploy InvoiceFactory
  const InvoiceFactory = await ethers.getContractFactory("InvoiceFactory");
  const factory = await InvoiceFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("InvoiceFactory deployed to:", factoryAddress);

  // 3. Create Sample Invoice via Factory
  const faceValue = 10000000000n; // 10,000 * 10^6
  const fundingGoal = 9500000000n; // 9,500 * 10^6
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const dueDate = currentTimestamp + (60 * 24 * 60 * 60); // now + 60 days
  const debtorName = "Acme Corp";

  const createTx = await factory.createInvoice(
    faceValue,
    fundingGoal,
    dueDate,
    debtorName,
    mockTokenAddress
  );
  await createTx.wait();

  const allInvoices = await factory.getAllInvoices();
  const sampleInvoiceAddress = allInvoices[0];

  console.log("\n================ DEPLOYMENT SUMMARY ================");
  console.log("MockERC20 Address:      ", mockTokenAddress);
  console.log("InvoiceFactory Address: ", factoryAddress);
  console.log("Sample Invoice Address: ", sampleInvoiceAddress);
  console.log("Face Value:             ", faceValue.toString(), "(10,000 USDC)");
  console.log("Funding Goal:           ", fundingGoal.toString(), "(9,500 USDC)");
  console.log("Due Date (unix):        ", dueDate);
  console.log("Debtor Name:            ", debtorName);
  console.log("====================================================\n");

  const factoryAbiPath = path.resolve(__dirname, "../artifacts/contracts/InvoiceFactory.sol/InvoiceFactory.json");
  const invoiceChainAbiPath = path.resolve(__dirname, "../artifacts/contracts/InvoiceChain.sol/InvoiceChain.json");
  const mockTokenAbiPath = path.resolve(__dirname, "../artifacts/contracts/MockERC20.sol/MockERC20.json");
  console.log("ABI Locations:");
  console.log("InvoiceFactory ABI: ", factoryAbiPath);
  console.log("InvoiceChain ABI:   ", invoiceChainAbiPath);
  console.log("MockERC20 ABI:      ", mockTokenAbiPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
