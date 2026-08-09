const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InvoiceChain", function () {
  let mockToken;
  let invoiceChain;
  let owner;
  let investor1;
  let investor2;

  const faceValue = 10000000000n; // 10,000 USDC (6 decimals)
  const fundingGoal = 9500000000n; // 9,500 USDC
  const debtorName = "Acme Corp";
  let dueDate;

  beforeEach(async function () {
    [owner, investor1, investor2] = await ethers.getSigners();

    // Deploy Mock ERC20 Token (6 decimals)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Test USDC", "USDC", 6);
    await mockToken.waitForDeployment();

    // Mint tokens to investors and owner for testing
    await mockToken.mint(investor1.address, ethers.parseUnits("10000", 6));
    await mockToken.mint(investor2.address, ethers.parseUnits("10000", 6));
    await mockToken.mint(owner.address, ethers.parseUnits("20000", 6));

    // Calculate due date (now + 60 days)
    const block = await ethers.provider.getBlock("latest");
    dueDate = block.timestamp + 60 * 24 * 60 * 60;

    // Deploy InvoiceChain with owner.address
    const InvoiceChain = await ethers.getContractFactory("InvoiceChain");
    invoiceChain = await InvoiceChain.deploy(
      faceValue,
      fundingGoal,
      dueDate,
      debtorName,
      await mockToken.getAddress(),
      owner.address
    );
    await invoiceChain.waitForDeployment();
  });

  describe("Deployment & Initial State", function () {
    it("should set the correct initial parameters", async function () {
      const details = await invoiceChain.getInvoiceDetails();
      expect(details._faceValue).to.equal(faceValue);
      expect(details._fundingGoal).to.equal(fundingGoal);
      expect(details._dueDate).to.equal(dueDate);
      expect(details._debtorName).to.equal(debtorName);
      expect(details._state).to.equal(0); // State.Funding
      expect(details._totalRaised).to.equal(0);
    });
  });

  describe("Investing", function () {
    it("should allow partial investment while in Funding state", async function () {
      const investAmount = 4000000000n; // 4,000 USDC
      const invoiceChainAddress = await invoiceChain.getAddress();

      await mockToken.connect(investor1).approve(invoiceChainAddress, investAmount);

      await expect(invoiceChain.connect(investor1).invest(investAmount))
        .to.emit(invoiceChain, "Invested")
        .withArgs(investor1.address, investAmount, investAmount);

      const details = await invoiceChain.getInvoiceDetails();
      expect(details._totalRaised).to.equal(investAmount);
      expect(details._state).to.equal(0); // Still Funding

      const [shares, pendingPayout] = await invoiceChain.getInvestorShare(investor1.address);
      expect(shares).to.equal(investAmount);
      // Pro-rata pending payout = (4,000 * 10,000) / 4,000 = 10,000
      expect(pendingPayout).to.equal(10000000000n);
    });

    it("should reach funding goal, transition state to Funded, and transfer funds to owner", async function () {
      const invoiceChainAddress = await invoiceChain.getAddress();

      const amount1 = 5000000000n; // 5,000 USDC
      const amount2 = 4500000000n; // 4,500 USDC (Total = 9,500 USDC = fundingGoal)

      await mockToken.connect(investor1).approve(invoiceChainAddress, amount1);
      await mockToken.connect(investor2).approve(invoiceChainAddress, amount2);

      await invoiceChain.connect(investor1).invest(amount1);

      const initialOwnerBalance = await mockToken.balanceOf(owner.address);

      await expect(invoiceChain.connect(investor2).invest(amount2))
        .to.emit(invoiceChain, "Funded")
        .withArgs(owner.address, fundingGoal);

      const details = await invoiceChain.getInvoiceDetails();
      expect(details._state).to.equal(1); // State.Funded
      expect(details._totalRaised).to.equal(fundingGoal);

      // Owner should have received totalRaised (9,500 USDC)
      const finalOwnerBalance = await mockToken.balanceOf(owner.address);
      expect(finalOwnerBalance - initialOwnerBalance).to.equal(fundingGoal);
    });

    it("should revert investment if block.timestamp exceeds dueDate", async function () {
      const invoiceChainAddress = await invoiceChain.getAddress();
      const investAmount = 1000000000n;

      await mockToken.connect(investor1).approve(invoiceChainAddress, investAmount);

      // Fast forward time past dueDate
      await ethers.provider.send("evm_increaseTime", [60 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        invoiceChain.connect(investor1).invest(investAmount)
      ).to.be.revertedWith("Funding period has ended");
    });
  });

  describe("Cancellation & Refunds", function () {
    it("should allow owner to cancel funding and allow investors to claim refund", async function () {
      const invoiceChainAddress = await invoiceChain.getAddress();
      const amount = 3000000000n;

      await mockToken.connect(investor1).approve(invoiceChainAddress, amount);
      await invoiceChain.connect(investor1).invest(amount);

      // Owner cancels invoice
      await expect(invoiceChain.connect(owner).cancelInvoice())
        .to.emit(invoiceChain, "InvoiceCancelled")
        .withArgs(owner.address);

      const details = await invoiceChain.getInvoiceDetails();
      expect(details._state).to.equal(4); // State.Cancelled

      // Investor claims refund
      const balBefore = await mockToken.balanceOf(investor1.address);
      await expect(invoiceChain.connect(investor1).refund())
        .to.emit(invoiceChain, "Refunded")
        .withArgs(investor1.address, amount);

      const balAfter = await mockToken.balanceOf(investor1.address);
      expect(balAfter - balBefore).to.equal(amount);
    });

    it("should revert cancellation attempt by non-owner", async function () {
      await expect(
        invoiceChain.connect(investor1).cancelInvoice()
      ).to.be.revertedWithCustomError(invoiceChain, "OwnableUnauthorizedAccount");
    });

    it("should allow refund if funding period expires without reaching goal", async function () {
      const invoiceChainAddress = await invoiceChain.getAddress();
      const amount = 3000000000n;

      await mockToken.connect(investor1).approve(invoiceChainAddress, amount);
      await invoiceChain.connect(investor1).invest(amount);

      // Attempt refund before expiry (should fail)
      await expect(invoiceChain.connect(investor1).refund()).to.be.revertedWith(
        "Refund not available"
      );

      // Fast forward past due date
      await ethers.provider.send("evm_increaseTime", [60 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // Now refund should succeed
      const balBefore = await mockToken.balanceOf(investor1.address);
      await expect(invoiceChain.connect(investor1).refund())
        .to.emit(invoiceChain, "Refunded")
        .withArgs(investor1.address, amount);

      const balAfter = await mockToken.balanceOf(investor1.address);
      expect(balAfter - balBefore).to.equal(amount);
    });
  });

  describe("Claiming before repayment (Failure case)", function () {
    it("should revert if an investor tries to claim before repayment", async function () {
      const invoiceChainAddress = await invoiceChain.getAddress();

      // Invest to reach Funded state
      await mockToken.connect(investor1).approve(invoiceChainAddress, fundingGoal);
      await invoiceChain.connect(investor1).invest(fundingGoal);

      // Try to claim while state is Funded
      await expect(invoiceChain.connect(investor1).claim()).to.be.revertedWith(
        "Not in Repaid or Distributed state"
      );
    });
  });

  describe("Repayment & Claiming Payouts", function () {
    beforeEach(async function () {
      const invoiceChainAddress = await invoiceChain.getAddress();

      const inv1Amount = 5700000000n;
      const inv2Amount = 3800000000n;

      await mockToken.connect(investor1).approve(invoiceChainAddress, inv1Amount);
      await mockToken.connect(investor2).approve(invoiceChainAddress, inv2Amount);

      await invoiceChain.connect(investor1).invest(inv1Amount);
      await invoiceChain.connect(investor2).invest(inv2Amount); // Transitions to Funded
    });

    it("should allow owner to repay faceValue and transition to Repaid", async function () {
      const invoiceChainAddress = await invoiceChain.getAddress();

      await mockToken.connect(owner).approve(invoiceChainAddress, faceValue);

      await expect(invoiceChain.connect(owner).repay(faceValue))
        .to.emit(invoiceChain, "Repaid")
        .withArgs(owner.address, faceValue);

      const details = await invoiceChain.getInvoiceDetails();
      expect(details._state).to.equal(2); // State.Repaid
    });

    it("should allow investors to claim pro-rata payouts", async function () {
      const invoiceChainAddress = await invoiceChain.getAddress();

      // Owner repays faceValue (10,000 USDC)
      await mockToken.connect(owner).approve(invoiceChainAddress, faceValue);
      await invoiceChain.connect(owner).repay(faceValue);

      // Check investor1 share & pending payout (60% of 10,000 = 6,000 USDC)
      const expectedPayout1 = 6000000000n;
      const expectedPayout2 = 4000000000n;

      const [inv1Shares, inv1Pending] = await invoiceChain.getInvestorShare(investor1.address);
      expect(inv1Shares).to.equal(5700000000n);
      expect(inv1Pending).to.equal(expectedPayout1);

      // Investor 1 claims
      const inv1BalBefore = await mockToken.balanceOf(investor1.address);
      await expect(invoiceChain.connect(investor1).claim())
        .to.emit(invoiceChain, "Claimed")
        .withArgs(investor1.address, expectedPayout1);

      const inv1BalAfter = await mockToken.balanceOf(investor1.address);
      expect(inv1BalAfter - inv1BalBefore).to.equal(expectedPayout1);

      // Investor 1 shares should now be zero
      const [inv1SharesAfter] = await invoiceChain.getInvestorShare(investor1.address);
      expect(inv1SharesAfter).to.equal(0);

      // Investor 1 cannot claim twice
      await expect(invoiceChain.connect(investor1).claim()).to.be.revertedWith(
        "No shares to claim"
      );

      // Investor 2 claims (40% of 10,000 = 4,000 USDC)
      const inv2BalBefore = await mockToken.balanceOf(investor2.address);
      await expect(invoiceChain.connect(investor2).claim())
        .to.emit(invoiceChain, "Claimed")
        .withArgs(investor2.address, expectedPayout2);

      const inv2BalAfter = await mockToken.balanceOf(investor2.address);
      expect(inv2BalAfter - inv2BalBefore).to.equal(expectedPayout2);
    });
  });
});
