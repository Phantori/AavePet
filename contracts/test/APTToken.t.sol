// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {APTToken} from "../src/APTToken.sol";

contract APTTokenTest is Test {
    APTToken apt;
    address owner = address(1);
    address alice = address(2);

    function setUp() public {
        vm.prank(owner);
        apt = new APTToken(owner);
    }

    function test_initialSupply() public view {
        assertEq(apt.totalSupply(), 100_000_000 ether);
        assertEq(apt.balanceOf(owner), 100_000_000 ether);
    }

    function test_mint() public {
        vm.prank(owner);
        apt.mint(alice, 1000 ether);
        assertEq(apt.balanceOf(alice), 1000 ether);
    }

    function test_mint_revertsOnMaxSupply() public {
        vm.prank(owner);
        vm.expectRevert("APT: max supply exceeded");
        apt.mint(alice, 1_000_000_000 ether); // would exceed max
    }

    function test_mint_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        apt.mint(alice, 1 ether);
    }
}
