// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RainbowBridge} from "../src/RainbowBridge.sol";
import {PetNFT} from "../src/PetNFT.sol";

contract RainbowBridgeTest is Test {
    RainbowBridge bridge;
    PetNFT nft;

    address owner = address(1);
    address alice = address(2);
    address charity = address(3);

    uint256 TOKEN_ID;

    function setUp() public {
        vm.prank(owner);
        nft = new PetNFT(owner);
        bridge = new RainbowBridge(address(nft));

        vm.prank(alice);
        TOKEN_ID = nft.mint("ipfs://pet");
    }

    function test_archive() public {
        vm.startPrank(alice);
        nft.approve(address(bridge), TOKEN_ID);
        bridge.archive(TOKEN_ID, "Forever in our hearts.", charity);
        vm.stopPrank();

        assertTrue(bridge.isArchived(TOKEN_ID));
        assertEq(nft.ownerOf(TOKEN_ID), address(bridge));

        (address originalOwner, uint256 archivedAt, string memory epitaph,,, ) =
            bridge.memorials(TOKEN_ID);
        assertEq(originalOwner, alice);
        assertGt(archivedAt, 0);
        assertEq(epitaph, "Forever in our hearts.");
    }

    function test_addMemory() public {
        vm.startPrank(alice);
        nft.approve(address(bridge), TOKEN_ID);
        bridge.archive(TOKEN_ID, "Goodbye.", charity);
        bridge.addMemory(TOKEN_ID, "ipfs://photo1");
        bridge.addMemory(TOKEN_ID, "ipfs://photo2");
        vm.stopPrank();

        string[] memory cids = bridge.getMemoryCids(TOKEN_ID);
        assertEq(cids.length, 2);
        assertEq(cids[0], "ipfs://photo1");
    }

    function test_addMemory_revertsIfNotOwner() public {
        vm.startPrank(alice);
        nft.approve(address(bridge), TOKEN_ID);
        bridge.archive(TOKEN_ID, "Goodbye.", charity);
        vm.stopPrank();

        vm.prank(address(99));
        vm.expectRevert(RainbowBridge.NotOriginalOwner.selector);
        bridge.addMemory(TOKEN_ID, "ipfs://hack");
    }

    function test_archive_revertsIfAlreadyArchived() public {
        vm.startPrank(alice);
        nft.approve(address(bridge), TOKEN_ID);
        bridge.archive(TOKEN_ID, "First.", charity);
        vm.expectRevert(RainbowBridge.AlreadyArchived.selector);
        bridge.archive(TOKEN_ID, "Second.", charity);
        vm.stopPrank();
    }

    function test_setCharity() public {
        address newCharity = address(42);
        vm.startPrank(alice);
        nft.approve(address(bridge), TOKEN_ID);
        bridge.archive(TOKEN_ID, "Rest.", charity);
        bridge.setCharity(TOKEN_ID, newCharity);
        vm.stopPrank();

        (, , , , address c, ) = bridge.memorials(TOKEN_ID);
        assertEq(c, newCharity);
    }
}
