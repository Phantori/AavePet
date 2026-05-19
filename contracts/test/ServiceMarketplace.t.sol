// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ServiceMarketplace} from "../src/ServiceMarketplace.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") { _mint(msg.sender, 1_000_000 * 1e6); }
    function decimals() public pure override returns (uint8) { return 6; }
}

contract ServiceMarketplaceTest is Test {
    ServiceMarketplace marketplace;
    MockUSDC usdc;

    address owner    = address(1);
    address provider = address(2);
    address client   = address(3);
    address shelter  = address(4);

    uint256 VOUCHER_PRICE = 50 * 1e6; // 50 USDC

    function setUp() public {
        vm.prank(owner);
        usdc = new MockUSDC();
        marketplace = new ServiceMarketplace(address(usdc), owner);

        // Distribute USDC
        vm.startPrank(owner);
        usdc.transfer(client, 10_000 * 1e6);
        vm.stopPrank();
    }

    function test_createAndBuyVoucher() public {
        vm.prank(provider);
        uint256 id = marketplace.createVoucherType("ipfs://voucher", VOUCHER_PRICE, 100, false);

        vm.startPrank(client);
        usdc.approve(address(marketplace), VOUCHER_PRICE);
        marketplace.buyVoucher(id, 1);
        vm.stopPrank();

        assertEq(marketplace.balanceOf(client, id), 1);
        assertEq(usdc.balanceOf(provider), VOUCHER_PRICE);
    }

    function test_redeemVoucher() public {
        vm.prank(provider);
        uint256 id = marketplace.createVoucherType("ipfs://voucher", VOUCHER_PRICE, 100, false);

        vm.startPrank(client);
        usdc.approve(address(marketplace), VOUCHER_PRICE);
        marketplace.buyVoucher(id, 1);
        marketplace.redeemVoucher(id);
        vm.stopPrank();

        assertEq(marketplace.balanceOf(client, id), 0);
    }

    function test_adoptionLock() public {
        vm.prank(shelter);
        uint256 id = marketplace.createVoucherType("ipfs://adopt", 0, 50, true);

        // Client acquires free adoption voucher
        vm.prank(client);
        marketplace.buyVoucher(id, 1);

        // Attempt to transfer during lock period should fail
        address newOwner = address(99);
        vm.prank(client);
        vm.expectRevert("ServiceMarketplace: adoption lock active");
        marketplace.safeTransferFrom(client, newOwner, id, 1, "");

        // Warp past lock period — should succeed
        vm.warp(block.timestamp + 365 days + 1);
        vm.prank(client);
        marketplace.safeTransferFrom(client, newOwner, id, 1, "");
        assertEq(marketplace.balanceOf(newOwner, id), 1);
    }

    function test_milestoneAgreement() public {
        string[] memory descs = new string[](3);
        descs[0] = "Pre-op bloodwork";
        descs[1] = "Surgery";
        descs[2] = "Recovery check";

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 200 * 1e6;
        amounts[1] = 2000 * 1e6;
        amounts[2] = 300 * 1e6;

        uint256 total = 2500 * 1e6;

        vm.startPrank(client);
        usdc.approve(address(marketplace), total);
        uint256 id = marketplace.createAgreement(provider, descs, amounts);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(marketplace)), total);

        // Provider releases milestone 0
        vm.prank(provider);
        marketplace.releaseMilestone(id, 0);
        assertEq(usdc.balanceOf(provider), 200 * 1e6);

        // Provider releases milestone 1
        vm.prank(provider);
        marketplace.releaseMilestone(id, 1);
        assertEq(usdc.balanceOf(provider), 2200 * 1e6);
    }

    function test_cancelAgreementRefundsUnreleased() public {
        string[] memory descs = new string[](2);
        descs[0] = "Stage 1"; descs[1] = "Stage 2";
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 500 * 1e6; amounts[1] = 500 * 1e6;

        vm.startPrank(client);
        usdc.approve(address(marketplace), 1000 * 1e6);
        uint256 id = marketplace.createAgreement(provider, descs, amounts);
        vm.stopPrank();

        vm.prank(provider);
        marketplace.releaseMilestone(id, 0); // release first

        uint256 balBefore = usdc.balanceOf(client);
        vm.prank(client);
        marketplace.cancelAgreement(id);

        // Only unreleased milestone (500) refunded
        assertEq(usdc.balanceOf(client), balBefore + 500 * 1e6);
    }
}
