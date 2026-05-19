// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PetVault} from "../src/PetVault.sol";
import {APTToken} from "../src/APTToken.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Mock Aave Pool — tracks supplied/withdrawn amounts without real yield.
contract MockAavePool {
    mapping(address => uint256) public supplied;

    function supply(address asset, uint256 amount, address, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        supplied[asset] += amount;
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        supplied[asset] -= amount;
        IERC20(asset).transfer(to, amount);
        return amount;
    }
}

contract PetVaultTest is Test {
    APTToken apt;
    MockAavePool pool;
    PetVault vault;

    address owner = address(1);
    address alice = address(2);
    address bob = address(3);

    function setUp() public {
        vm.startPrank(owner);
        apt = new APTToken(owner);
        pool = new MockAavePool();

        // aAptToken = apt itself in mock (simplification)
        vault = new PetVault(address(apt), address(apt), address(pool), owner);

        apt.transfer(alice, 1_000 ether);
        apt.transfer(bob, 1_000 ether);
        vm.stopPrank();
    }

    function test_deposit() public {
        vm.startPrank(alice);
        apt.approve(address(vault), 500 ether);
        vault.deposit(1, 500 ether);
        vm.stopPrank();

        assertEq(vault.deposits(1, alice), 500 ether);
        assertEq(vault.totalDeposited(1), 500 ether);
    }

    function test_withdraw() public {
        vm.startPrank(alice);
        apt.approve(address(vault), 500 ether);
        vault.deposit(1, 500 ether);
        vault.withdraw(1, 200 ether);
        vm.stopPrank();

        assertEq(vault.deposits(1, alice), 300 ether);
        assertEq(apt.balanceOf(alice), 700 ether); // started with 1000, deposited 500, withdrew 200
    }

    function test_withdraw_revertsIfInsufficientBalance() public {
        vm.startPrank(alice);
        apt.approve(address(vault), 100 ether);
        vault.deposit(1, 100 ether);
        vm.expectRevert("PetVault: insufficient balance");
        vault.withdraw(1, 101 ether);
        vm.stopPrank();
    }

    function test_multipleDepositors() public {
        vm.startPrank(alice);
        apt.approve(address(vault), 500 ether);
        vault.deposit(1, 500 ether);
        vm.stopPrank();

        vm.startPrank(bob);
        apt.approve(address(vault), 300 ether);
        vault.deposit(1, 300 ether);
        vm.stopPrank();

        assertEq(vault.totalDeposited(1), 800 ether);
        assertEq(vault.deposits(1, alice), 500 ether);
        assertEq(vault.deposits(1, bob), 300 ether);
    }
}
