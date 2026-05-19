// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PetVault} from "../src/PetVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 10_000_000 * 1e6); // 10M with 6 decimals (like USDC)
    }
    function decimals() public pure override returns (uint8) { return 6; }
}

contract MockAavePool {
    mapping(address => uint256) public poolBalance;

    function supply(address asset, uint256 amount, address, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        poolBalance[asset] += amount;
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        poolBalance[asset] -= amount;
        IERC20(asset).transfer(to, amount);
        return amount;
    }
}

contract PetVaultTest is Test {
    MockToken usdc;
    MockToken aUsdc; // aToken mock — same decimals
    MockAavePool pool;
    PetVault vault;

    address owner = address(1);
    address alice = address(2);
    address bob = address(3);

    uint256 constant ONE = 100 * 1e6; // 100 USDC

    function setUp() public {
        vm.startPrank(owner);
        usdc = new MockToken("USD Coin", "USDC");
        aUsdc = new MockToken("Aave USDC", "aUSDC");
        pool = new MockAavePool();

        vault = new PetVault(address(usdc), address(aUsdc), address(pool), "USDC", owner);

        usdc.transfer(alice, 10_000 * 1e6);
        usdc.transfer(bob, 10_000 * 1e6);
        // seed aToken into vault to simulate yield accrual
        aUsdc.transfer(address(vault), 1_000 * 1e6);
        vm.stopPrank();
    }

    function test_deposit() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), ONE);
        vault.deposit(1, ONE);
        vm.stopPrank();

        assertEq(vault.deposits(1, alice), ONE);
        assertEq(vault.totalDeposited(1), ONE);
        assertEq(vault.grandTotalDeposited(), ONE);
    }

    function test_withdraw() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), ONE);
        vault.deposit(1, ONE);

        uint256 balBefore = usdc.balanceOf(alice);
        vault.withdraw(1, ONE / 2);
        vm.stopPrank();

        assertEq(usdc.balanceOf(alice), balBefore + ONE / 2);
        assertEq(vault.deposits(1, alice), ONE / 2);
    }

    function test_withdraw_revertsIfInsufficientBalance() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), ONE);
        vault.deposit(1, ONE);
        vm.expectRevert("PetVault: insufficient balance");
        vault.withdraw(1, ONE + 1);
        vm.stopPrank();
    }

    function test_multipleDepositors() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), ONE * 5);
        vault.deposit(1, ONE * 5);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), ONE * 3);
        vault.deposit(1, ONE * 3);
        vm.stopPrank();

        assertEq(vault.totalDeposited(1), ONE * 8);
        assertEq(vault.grandTotalDeposited(), ONE * 8);
    }

    function test_yieldForPet() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), ONE);
        vault.deposit(1, ONE);
        vm.stopPrank();

        // aToken balance in vault = ONE (deposited) + 1000 USDC (seeded yield in setUp)
        // yield = aTokenShare - principal
        uint256 yield = vault.yieldForPet(1);
        assertGt(yield, 0);
    }

    function test_assetSymbol() public view {
        assertEq(vault.assetSymbol(), "USDC");
    }
}
