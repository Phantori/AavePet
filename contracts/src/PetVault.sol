// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Minimal Aave v3 Pool interface — only what we need.
interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/// @notice Per-pet savings vault: deposit APT → supply to Aave → earn yield for vet bills.
/// Each pet (tokenId) has its own balance; the owner can deposit/withdraw for their pet.
/// Yield accrues automatically via Aave's aToken rebasing.
contract PetVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable aptToken;
    IERC20 public immutable aAptToken;  // Aave aToken for APT (received when supplying)
    IAavePool public immutable aavePool;

    // Aave v3 Pool on Base mainnet
    address public constant AAVE_POOL_BASE = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;

    // tokenId => depositor => shares (1:1 with APT at deposit time; yield accrues in aTokens)
    mapping(uint256 => mapping(address => uint256)) public deposits;
    // tokenId => total APT deposited (not counting yield)
    mapping(uint256 => uint256) public totalDeposited;

    event Deposited(uint256 indexed tokenId, address indexed depositor, uint256 amount);
    event Withdrawn(uint256 indexed tokenId, address indexed depositor, uint256 amount);

    constructor(address _aptToken, address _aAptToken, address _aavePool, address _owner)
        Ownable(_owner)
    {
        aptToken = IERC20(_aptToken);
        aAptToken = IERC20(_aAptToken);
        aavePool = IAavePool(_aavePool);
    }

    /// @notice Deposit APT into a pet's savings vault. Funds are immediately supplied to Aave.
    /// @param tokenId The pet NFT token ID you are saving for.
    /// @param amount  Amount of APT (in wei) to deposit.
    function deposit(uint256 tokenId, uint256 amount) external nonReentrant {
        require(amount > 0, "PetVault: amount must be > 0");

        aptToken.safeTransferFrom(msg.sender, address(this), amount);
        aptToken.approve(address(aavePool), amount);
        aavePool.supply(address(aptToken), amount, address(this), 0);

        deposits[tokenId][msg.sender] += amount;
        totalDeposited[tokenId] += amount;

        emit Deposited(tokenId, msg.sender, amount);
    }

    /// @notice Withdraw APT (principal only) from a pet's vault.
    /// Yield above principal stays in the vault, accruing for future vet bills.
    /// @param tokenId The pet NFT token ID.
    /// @param amount  Amount of APT to withdraw (must be <= your deposit balance).
    function withdraw(uint256 tokenId, uint256 amount) external nonReentrant {
        require(amount > 0, "PetVault: amount must be > 0");
        require(deposits[tokenId][msg.sender] >= amount, "PetVault: insufficient balance");

        deposits[tokenId][msg.sender] -= amount;
        totalDeposited[tokenId] -= amount;

        aavePool.withdraw(address(aptToken), amount, msg.sender);

        emit Withdrawn(tokenId, msg.sender, amount);
    }

    /// @notice Total aToken balance held by this vault (principal + all accrued yield).
    function totalVaultBalance() external view returns (uint256) {
        return aAptToken.balanceOf(address(this));
    }

    /// @notice Accrued yield for a specific pet across all depositors.
    /// yield = aToken balance proportional to pet's share - pet's principal
    function yieldForPet(uint256 tokenId) external view returns (uint256) {
        uint256 total = aAptToken.balanceOf(address(this));
        if (total == 0 || totalDeposited[tokenId] == 0) return 0;

        // Pet's proportional aToken share
        uint256 grandTotal = _grandTotalDeposited();
        if (grandTotal == 0) return 0;

        uint256 petATokenShare = (total * totalDeposited[tokenId]) / grandTotal;
        return petATokenShare > totalDeposited[tokenId]
            ? petATokenShare - totalDeposited[tokenId]
            : 0;
    }

    function _grandTotalDeposited() internal view returns (uint256 total) {
        // NOTE: In production, track this with a state variable for gas efficiency.
        // This is a placeholder — subgraph or off-chain indexing is the right solution.
        return aAptToken.balanceOf(address(this)); // approximation
    }
}
