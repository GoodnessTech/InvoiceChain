// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract InvoiceChain is Ownable, ReentrancyGuard {
    enum State { Funding, Funded, Repaid, Distributed, Cancelled }

    uint256 public immutable faceValue;
    uint256 public immutable fundingGoal;
    uint256 public immutable dueDate;
    string public debtorName;
    IERC20 public immutable paymentToken;

    State public state;
    uint256 public totalRaised;

    mapping(address => uint256) public shares;

    event Invested(address indexed investor, uint256 amount, uint256 totalRaised);
    event Funded(address indexed owner, uint256 totalRaised);
    event Repaid(address indexed owner, uint256 amount);
    event Claimed(address indexed investor, uint256 amount);
    event Refunded(address indexed investor, uint256 amount);
    event InvoiceCancelled(address indexed owner);

    constructor(
        uint256 _faceValue,
        uint256 _fundingGoal,
        uint256 _dueDate,
        string memory _debtorName,
        address _paymentToken,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_faceValue > 0, "Face value must be > 0");
        require(_fundingGoal > 0, "Funding goal must be > 0");
        require(_paymentToken != address(0), "Invalid token address");
        require(initialOwner != address(0), "Invalid owner address");

        faceValue = _faceValue;
        fundingGoal = _fundingGoal;
        dueDate = _dueDate;
        debtorName = _debtorName;
        paymentToken = IERC20(_paymentToken);
        state = State.Funding;
    }

    function invest(uint256 amount) external {
        require(state == State.Funding, "Not in Funding state");
        require(block.timestamp <= dueDate, "Funding period has ended");
        require(amount > 0, "Amount must be > 0");

        bool success = paymentToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");

        shares[msg.sender] += amount;
        totalRaised += amount;

        emit Invested(msg.sender, amount, totalRaised);

        if (totalRaised >= fundingGoal) {
            state = State.Funded;
            bool ownerTransfer = paymentToken.transfer(owner(), totalRaised);
            require(ownerTransfer, "Transfer to owner failed");
            emit Funded(owner(), totalRaised);
        }
    }

    function cancelInvoice() external onlyOwner {
        require(state == State.Funding, "Can only cancel in Funding state");
        state = State.Cancelled;
        emit InvoiceCancelled(msg.sender);
    }

    function refund() external nonReentrant {
        require(
            state == State.Cancelled || (state == State.Funding && block.timestamp > dueDate),
            "Refund not available"
        );
        uint256 userShares = shares[msg.sender];
        require(userShares > 0, "No shares to refund");

        shares[msg.sender] = 0;
        bool success = paymentToken.transfer(msg.sender, userShares);
        require(success, "Token transfer failed");

        emit Refunded(msg.sender, userShares);
    }

    function repay(uint256 amount) external onlyOwner {
        require(state == State.Funded, "Not in Funded state");
        require(amount >= faceValue, "Amount less than face value");

        bool success = paymentToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");

        state = State.Repaid;

        emit Repaid(msg.sender, amount);
    }

    function claim() external nonReentrant {
        require(state == State.Repaid || state == State.Distributed, "Not in Repaid or Distributed state");
        uint256 userShares = shares[msg.sender];
        require(userShares > 0, "No shares to claim");

        uint256 payout = (userShares * faceValue) / totalRaised;
        shares[msg.sender] = 0;

        bool success = paymentToken.transfer(msg.sender, payout);
        require(success, "Token transfer failed");

        emit Claimed(msg.sender, payout);
    }

    function getInvoiceDetails()
        external
        view
        returns (
            uint256 _faceValue,
            uint256 _fundingGoal,
            uint256 _dueDate,
            string memory _debtorName,
            State _state,
            uint256 _totalRaised
        )
    {
        return (faceValue, fundingGoal, dueDate, debtorName, state, totalRaised);
    }

    function getInvestorShare(address investor)
        external
        view
        returns (uint256 shareAmount, uint256 pendingPayout)
    {
        shareAmount = shares[investor];
        if (totalRaised > 0) {
            pendingPayout = (shareAmount * faceValue) / totalRaised;
        } else {
            pendingPayout = 0;
        }
    }
}
