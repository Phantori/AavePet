// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PetNFT} from "../src/PetNFT.sol";

contract PetNFTTest is Test {
    PetNFT nft;
    address owner = address(1);
    address alice = address(2);

    function setUp() public {
        vm.prank(owner);
        nft = new PetNFT(owner);
    }

    function test_mint() public {
        vm.prank(alice);
        uint256 tokenId = nft.mint("ipfs://Qm.../metadata.json");
        assertEq(nft.ownerOf(tokenId), alice);
        assertEq(nft.creator(tokenId), alice);
        assertEq(nft.totalSupply(), 1);
    }

    function test_tokenURI() public {
        vm.prank(alice);
        uint256 tokenId = nft.mint("ipfs://Qm.../pet.json");
        assertEq(nft.tokenURI(tokenId), "ipfs://Qm.../pet.json");
    }

    function test_royaltyInfo() public {
        vm.prank(alice);
        uint256 tokenId = nft.mint("ipfs://Qm...");
        (address recipient, uint256 amount) = nft.royaltyInfo(tokenId, 10_000);
        assertEq(recipient, alice);
        assertEq(amount, 500); // 5% of 10_000
    }

    function test_sequentialTokenIds() public {
        vm.startPrank(alice);
        uint256 id0 = nft.mint("ipfs://a");
        uint256 id1 = nft.mint("ipfs://b");
        vm.stopPrank();
        assertEq(id0, 0);
        assertEq(id1, 1);
    }
}
