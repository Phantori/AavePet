// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {APTToken} from "../src/APTToken.sol";
import {PetNFT} from "../src/PetNFT.sol";
import {PetMarketplace} from "../src/PetMarketplace.sol";

contract PetMarketplaceTest is Test {
    APTToken apt;
    PetNFT nft;
    PetMarketplace marketplace;

    address owner = address(1);
    address seller = address(2);
    address buyer = address(3);
    address feeRecipient = address(4);

    uint256 TOKEN_ID;
    uint256 PRICE = 1000 ether;

    function setUp() public {
        vm.startPrank(owner);
        apt = new APTToken(owner);
        nft = new PetNFT(owner);
        marketplace = new PetMarketplace(address(apt), address(nft), feeRecipient, owner);
        vm.stopPrank();

        // Seller mints a pet NFT
        vm.prank(seller);
        TOKEN_ID = nft.mint("ipfs://pet");

        // Owner gives buyer enough APT
        vm.prank(owner);
        apt.transfer(buyer, 10_000 ether);
    }

    function test_listAndBuy() public {
        // Seller approves marketplace and lists
        vm.startPrank(seller);
        nft.setApprovalForAll(address(marketplace), true);
        marketplace.list(TOKEN_ID, PRICE);
        vm.stopPrank();

        // Buyer approves APT and buys
        vm.startPrank(buyer);
        apt.approve(address(marketplace), PRICE);
        marketplace.buy(TOKEN_ID);
        vm.stopPrank();

        assertEq(nft.ownerOf(TOKEN_ID), buyer);

        // Protocol fee: 2.5% of 1000 = 25
        assertEq(apt.balanceOf(feeRecipient), 25 ether);
        // Royalty: 5% of 1000 = 50 (goes to seller as they are creator)
        // Seller proceeds: 1000 - 25 - 50 = 925, plus 50 royalty = 975
        assertEq(apt.balanceOf(seller), 925 ether + 50 ether);
    }

    function test_delist() public {
        vm.startPrank(seller);
        nft.setApprovalForAll(address(marketplace), true);
        marketplace.list(TOKEN_ID, PRICE);
        marketplace.delist(TOKEN_ID);
        vm.stopPrank();

        (,, bool active) = marketplace.listings(TOKEN_ID);
        assertFalse(active);
    }

    function test_buy_revertsIfNotListed() public {
        vm.prank(buyer);
        vm.expectRevert("Marketplace: not listed");
        marketplace.buy(TOKEN_ID);
    }

    function test_list_revertsIfNotOwner() public {
        vm.prank(buyer);
        vm.expectRevert("Marketplace: not owner");
        marketplace.list(TOKEN_ID, PRICE);
    }
}
