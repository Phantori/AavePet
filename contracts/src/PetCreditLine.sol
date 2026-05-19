// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IAavePool {
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
    function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256);
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    );
}

interface ICreditDelegation {
    function approveDelegation(address delegatee, uint256 amount) external;
    function borrowAllowance(address fromUser, address toUser) external view returns (uint256);
}

/// @notice Emergency line of credit: borrow USDC against WETH deposited in PetVault.
///
/// Architecture:
///   1. User's WETH vault supplies WETH to Aave → aWETH accrues as collateral.
///   2. The vault calls `variableDebtUSDC.approveDelegation(creditLine, amount)` to
///      grant this contract the ability to borrow USDC on the vault's behalf.
///   3. User calls `borrow(tokenId, amount)` here → USDC sent directly to user.
///   4. User repays via `repay(tokenId, amount)` → credit delegation restored.
///
/// Max borrow: 50% of the user's WETH principal at the time of borrowing (conservative LTV).
/// Aave's own liquidation logic protects the vault's solvency.
///
/// Base mainnet:
///   Aave Pool         0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
///   USDC              0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
///   Variable Debt USDC 0x59dca05b6c26dbd64b5381374aAaC5CD05644C28
contract PetCreditLine is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IAavePool public immutable aavePool;
    IERC20 public immutable usdc;
    ICreditDelegation public immutable variableDebtUsdc;

    // Reference to WETH PetVault (the collateral source)
    address public immutable wethVault;

    uint256 public constant MAX_LTV_BPS = 5000;   // 50%
    uint256 public constant VARIABLE_RATE = 2;     // Aave variable interest rate mode

    // tokenId => depositor => outstanding borrow (in USDC, 6 decimals)
    mapping(uint256 => mapping(address => uint256)) public borrows;

    event Borrowed(uint256 indexed tokenId, address indexed borrower, uint256 amount);
    event Repaid(uint256 indexed tokenId, address indexed borrower, uint256 amount);

    constructor(
        address _aavePool,
        address _usdc,
        address _variableDebtUsdc,
        address _wethVault,
        address _owner
    ) Ownable(_owner) {
        aavePool = IAavePool(_aavePool);
        usdc = IERC20(_usdc);
        variableDebtUsdc = ICreditDelegation(_variableDebtUsdc);
        wethVault = _wethVault;
    }

    /// @notice Borrow USDC against your WETH vault deposit.
    /// Prerequisites:
    ///   - You must have WETH deposited in the wethVault.
    ///   - The wethVault must have called `variableDebtUsdc.approveDelegation(creditLine, amount)`.
    /// @param tokenId  Your pet's token ID (determines which vault balance is your collateral).
    /// @param amount   USDC amount to borrow (6 decimals). Must be <= maxBorrow(tokenId, msg.sender).
    function borrow(uint256 tokenId, uint256 amount) external nonReentrant {
        require(amount > 0, "PetCreditLine: amount must be > 0");
        require(amount <= maxBorrow(tokenId, msg.sender), "PetCreditLine: exceeds max LTV");

        // Verify credit delegation is in place
        uint256 delegated = variableDebtUsdc.borrowAllowance(wethVault, address(this));
        require(delegated >= amount, "PetCreditLine: insufficient credit delegation");

        borrows[tokenId][msg.sender] += amount;

        // Borrow USDC using the wethVault's Aave collateral, send to borrower
        aavePool.borrow(address(usdc), amount, VARIABLE_RATE, 0, wethVault);
        usdc.safeTransfer(msg.sender, amount);

        emit Borrowed(tokenId, msg.sender, amount);
    }

    /// @notice Repay outstanding USDC debt.
    /// @param tokenId Your pet's token ID.
    /// @param amount  USDC amount to repay. Pass type(uint256).max to repay all.
    function repay(uint256 tokenId, uint256 amount) external nonReentrant {
        uint256 outstanding = borrows[tokenId][msg.sender];
        require(outstanding > 0, "PetCreditLine: nothing to repay");

        uint256 toRepay = amount > outstanding ? outstanding : amount;

        usdc.safeTransferFrom(msg.sender, address(this), toRepay);
        usdc.approve(address(aavePool), toRepay);
        aavePool.repay(address(usdc), toRepay, VARIABLE_RATE, wethVault);

        borrows[tokenId][msg.sender] -= toRepay;

        emit Repaid(tokenId, msg.sender, toRepay);
    }

    /// @notice Maximum USDC the caller can borrow for a given pet (50% of WETH principal).
    /// This is a conservative on-chain estimate; Aave's health factor is the true limit.
    function maxBorrow(uint256 tokenId, address user) public view returns (uint256) {
        // Read the user's WETH principal from the vault
        // PetVault.deposits(tokenId, user) returns WETH in 18 decimals
        (bool ok, bytes memory data) = wethVault.staticcall(
            abi.encodeWithSignature("deposits(uint256,address)", tokenId, user)
        );
        if (!ok || data.length == 0) return 0;

        uint256 wethPrincipal = abi.decode(data, (uint256));
        if (wethPrincipal == 0) return 0;

        // Use Aave's available borrows (in USD base units, 8 decimals) as the authoritative ceiling
        (, , uint256 availableBorrowsBase, , , ) = aavePool.getUserAccountData(wethVault);

        // Convert from 8-decimal USD to 6-decimal USDC and apply LTV cap
        uint256 availableUsdc = (availableBorrowsBase * 1e6) / 1e8;
        uint256 alreadyBorrowed = borrows[tokenId][user];

        // Cap at LTV % of WETH principal (rough USD value using Aave's own data)
        // Note: in production, integrate a Chainlink price feed for precision
        uint256 maxByLtv = (availableUsdc * MAX_LTV_BPS) / 10_000;

        return maxByLtv > alreadyBorrowed ? maxByLtv - alreadyBorrowed : 0;
    }
}
