// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/// @notice Per-pet savings vault: deposit a whitelisted token → supply to Aave v3 → earn yield.
/// Deploy one instance per asset (e.g. USDC vault, WETH vault).
/// Base mainnet addresses:
///   USDC  0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  aUSDC 0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB
///   WETH  0x4200000000000000000000000000000000000006  aWETH 0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7
///   Aave v3 Pool 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
contract PetVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable depositToken;   // USDC or WETH
    IERC20 public immutable aToken;         // corresponding Aave aToken
    IAavePool public immutable aavePool;
    string public assetSymbol;              // "USDC" or "WETH" — for frontend display

    // tokenId => depositor => principal deposited
    mapping(uint256 => mapping(address => uint256)) public deposits;
    // tokenId => total principal across all depositors
    mapping(uint256 => uint256) public totalDeposited;
    // grand total principal across all pets (tracked to avoid O(n) scans)
    uint256 public grandTotalDeposited;

    // tokenId => depositor => guardian contract authorised to withdraw on their behalf
    mapping(uint256 => mapping(address => address)) public authorizedGuardian;

    event Deposited(uint256 indexed tokenId, address indexed depositor, uint256 amount);
    event Withdrawn(uint256 indexed tokenId, address indexed depositor, uint256 amount);
    event GuardianSet(uint256 indexed tokenId, address indexed depositor, address guardian);

    constructor(
        address _depositToken,
        address _aToken,
        address _aavePool,
        string memory _assetSymbol,
        address _owner
    ) Ownable(_owner) {
        depositToken = IERC20(_depositToken);
        aToken = IERC20(_aToken);
        aavePool = IAavePool(_aavePool);
        assetSymbol = _assetSymbol;
    }

    /// @notice Deposit tokens into a pet's savings vault. Funds are immediately supplied to Aave.
    function deposit(uint256 tokenId, uint256 amount) external nonReentrant {
        require(amount > 0, "PetVault: amount must be > 0");

        depositToken.safeTransferFrom(msg.sender, address(this), amount);
        depositToken.forceApprove(address(aavePool), amount);
        aavePool.supply(address(depositToken), amount, address(this), 0);

        deposits[tokenId][msg.sender] += amount;
        totalDeposited[tokenId] += amount;
        grandTotalDeposited += amount;

        emit Deposited(tokenId, msg.sender, amount);
    }

    /// @notice Withdraw principal. Yield above principal stays in the vault accruing for vet bills.
    function withdraw(uint256 tokenId, uint256 amount) external nonReentrant {
        require(amount > 0, "PetVault: amount must be > 0");
        require(deposits[tokenId][msg.sender] >= amount, "PetVault: insufficient balance");

        deposits[tokenId][msg.sender] -= amount;
        totalDeposited[tokenId] -= amount;
        grandTotalDeposited -= amount;

        aavePool.withdraw(address(depositToken), amount, msg.sender);

        emit Withdrawn(tokenId, msg.sender, amount);
    }

    /// @notice Register a guardian contract that is allowed to withdraw on behalf of the depositor.
    /// @param tokenId          The pet NFT token ID.
    /// @param guardianContract The PetGuardian contract address (or address(0) to clear).
    function setGuardian(uint256 tokenId, address guardianContract) external {
        authorizedGuardian[tokenId][msg.sender] = guardianContract;
        emit GuardianSet(tokenId, msg.sender, guardianContract);
    }

    /// @notice Guardian-initiated withdrawal. Sends funds to a recipient chosen by the guardian.
    /// The guardian contract must have been pre-registered by the depositor via setGuardian().
    /// Passing type(uint256).max withdraws the depositor's full principal balance.
    /// @param tokenId   The pet NFT token ID.
    /// @param depositor The original depositor whose balance is being withdrawn.
    /// @param recipient The address that should receive the withdrawn tokens.
    /// @param amount    Amount to withdraw, or type(uint256).max for full balance.
    function guardianWithdraw(
        uint256 tokenId,
        address depositor,
        address recipient,
        uint256 amount
    ) external nonReentrant {
        require(
            msg.sender == authorizedGuardian[tokenId][depositor],
            "PetVault: caller is not authorized guardian"
        );
        require(recipient != address(0), "PetVault: invalid recipient");

        uint256 balance = deposits[tokenId][depositor];
        if (amount == type(uint256).max) {
            amount = balance;
        }
        require(amount > 0, "PetVault: amount must be > 0");
        require(balance >= amount, "PetVault: insufficient balance");

        deposits[tokenId][depositor] -= amount;
        totalDeposited[tokenId]      -= amount;
        grandTotalDeposited          -= amount;

        aavePool.withdraw(address(depositToken), amount, recipient);

        emit Withdrawn(tokenId, depositor, amount);
    }

    /// @notice Total aToken balance held by this vault (principal + all accrued yield).
    function totalVaultBalance() external view returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    /// @notice Estimated yield accrued for a specific pet (proportional share of vault yield).
    function yieldForPet(uint256 tokenId) external view returns (uint256) {
        if (grandTotalDeposited == 0 || totalDeposited[tokenId] == 0) return 0;

        uint256 vaultATokenBal = aToken.balanceOf(address(this));
        uint256 petATokenShare = (vaultATokenBal * totalDeposited[tokenId]) / grandTotalDeposited;

        return petATokenShare > totalDeposited[tokenId]
            ? petATokenShare - totalDeposited[tokenId]
            : 0;
    }
}
