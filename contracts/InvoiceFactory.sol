// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./InvoiceChain.sol";

contract InvoiceFactory {
    address[] public allInvoices;
    mapping(address => address[]) public userInvoices;

    event InvoiceCreated(
        address indexed invoiceAddress,
        address indexed owner,
        uint256 faceValue,
        uint256 fundingGoal,
        uint256 dueDate,
        string debtorName
    );

    function createInvoice(
        uint256 _faceValue,
        uint256 _fundingGoal,
        uint256 _dueDate,
        string memory _debtorName,
        address _paymentToken
    ) external returns (address invoiceAddress) {
        InvoiceChain invoice = new InvoiceChain(
            _faceValue,
            _fundingGoal,
            _dueDate,
            _debtorName,
            _paymentToken,
            msg.sender
        );

        invoiceAddress = address(invoice);
        allInvoices.push(invoiceAddress);
        userInvoices[msg.sender].push(invoiceAddress);

        emit InvoiceCreated(
            invoiceAddress,
            msg.sender,
            _faceValue,
            _fundingGoal,
            _dueDate,
            _debtorName
        );
    }

    function getAllInvoices() external view returns (address[] memory) {
        return allInvoices;
    }

    function getInvoicesByOwner(address owner) external view returns (address[] memory) {
        return userInvoices[owner];
    }

    function getInvoiceCount() external view returns (uint256) {
        return allInvoices.length;
    }
}
