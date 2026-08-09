const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InvoiceFactory", function () {
  let mockToken;
  let factory;
  let owner1;
  let owner2;

  const faceValue = 10000000000n; // 10,000 USDC
  const fundingGoal = 9500000000n; // 9,500 USDC
  const debtorName = "Acme Corp";
  let dueDate;

  beforeEach(async function () {
    [owner1, owner2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Test USDC", "USDC", 6);
    await mockToken.waitForDeployment();

    const InvoiceFactory = await ethers.getContractFactory("InvoiceFactory");
    factory = await InvoiceFactory.deploy();
    await factory.waitForDeployment();

    const block = await ethers.provider.getBlock("latest");
    dueDate = block.timestamp + 60 * 24 * 60 * 60;
  });

  describe("Invoice Creation", function () {
    it("should deploy a new InvoiceChain contract and set creator as owner", async function () {
      const mockTokenAddress = await mockToken.getAddress();

      await expect(
        factory.connect(owner1).createInvoice(
          faceValue,
          fundingGoal,
          dueDate,
          debtorName,
          mockTokenAddress
        )
      ).to.emit(factory, "InvoiceCreated");

      const allInvoices = await factory.getAllInvoices();
      expect(allInvoices.length).to.equal(1);

      const invoiceAddress = allInvoices[0];
      const invoiceChain = await ethers.getContractAt("InvoiceChain", invoiceAddress);

      // Verify ownership belongs to owner1 (the caller), NOT the factory
      expect(await invoiceChain.owner()).to.equal(owner1.address);

      const details = await invoiceChain.getInvoiceDetails();
      expect(details._faceValue).to.equal(faceValue);
      expect(details._fundingGoal).to.equal(fundingGoal);
      expect(details._debtorName).to.equal(debtorName);
    });

    it("should track invoices per user", async function () {
      const mockTokenAddress = await mockToken.getAddress();

      await factory.connect(owner1).createInvoice(faceValue, fundingGoal, dueDate, "Debtor 1", mockTokenAddress);
      await factory.connect(owner1).createInvoice(faceValue, fundingGoal, dueDate, "Debtor 2", mockTokenAddress);
      await factory.connect(owner2).createInvoice(faceValue, fundingGoal, dueDate, "Debtor 3", mockTokenAddress);

      const count = await factory.getInvoiceCount();
      expect(count).to.equal(3);

      const owner1Invoices = await factory.getInvoicesByOwner(owner1.address);
      expect(owner1Invoices.length).to.equal(2);

      const owner2Invoices = await factory.getInvoicesByOwner(owner2.address);
      expect(owner2Invoices.length).to.equal(1);
    });
  });
});
