// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface IPetNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IPetCreditLine {
    function borrows(uint256 tokenId, address borrower) external view returns (uint256);
}

// ---------------------------------------------------------------------------
// StasisPod
// ---------------------------------------------------------------------------

/// @title  StasisPod
/// @notice Temporarily holds pet NFTs in stasis, freezing wellness decay while
///         the underlying PetVault continues compounding Aave yield. A 10%
///         preservation fee of accrued yield is redirectable to the protocol
///         treasury. Pets cannot be sold while held by this contract.
contract StasisPod is IERC721Receiver, Ownable, ReentrancyGuard {

    // -----------------------------------------------------------------------
    // Custom errors
    // -----------------------------------------------------------------------

    error AlreadyInStasis();
    error NotInStasis();
    error NotPodOwner();
    error OutstandingDebt();
    error InvalidDuration();

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event PetLocked(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 plannedDuration,
        uint256 lockedAt
    );

    event PetUnlocked(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 duration
    );

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    struct Pod {
        address owner;           // original owner who locked the pet
        uint256 lockedAt;        // block.timestamp at lock time
        uint256 plannedDuration; // intended stasis duration in seconds (informational)
        bool    active;
    }

    mapping(uint256 => Pod) public pods;            // tokenId => Pod
    mapping(address => uint256[]) public ownerPods; // owner => list of locked tokenIds

    address public immutable petNFT;
    address public immutable creditLine;
    address public protocolTreasury;

    uint256 public constant PRESERVATION_FEE_BPS = 1000; // 10%
    uint256 public constant MIN_STASIS_DURATION  = 7 days;
    uint256 public constant MAX_STASIS_DURATION  = 730 days; // 2 years

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(
        address petNFT_,
        address creditLine_,
        address protocolTreasury_,
        address initialOwner
    ) Ownable(initialOwner) {
        petNFT           = petNFT_;
        creditLine       = creditLine_;
        protocolTreasury = protocolTreasury_;
    }

    // -----------------------------------------------------------------------
    // External — stasis management
    // -----------------------------------------------------------------------

    /// @notice Lock a pet NFT into stasis. The caller must own the token and
    ///         have no outstanding debt against it.
    /// @param tokenId        The NFT token ID to lock.
    /// @param plannedDuration Intended stasis duration in seconds (informational).
    function lockPet(uint256 tokenId, uint256 plannedDuration) external nonReentrant {
        if (plannedDuration < MIN_STASIS_DURATION || plannedDuration > MAX_STASIS_DURATION) {
            revert InvalidDuration();
        }
        if (IPetNFT(petNFT).ownerOf(tokenId) != msg.sender) {
            revert NotPodOwner();
        }
        if (IPetCreditLine(creditLine).borrows(tokenId, msg.sender) != 0) {
            revert OutstandingDebt();
        }
        if (pods[tokenId].active) {
            revert AlreadyInStasis();
        }

        pods[tokenId] = Pod({
            owner:           msg.sender,
            lockedAt:        block.timestamp,
            plannedDuration: plannedDuration,
            active:          true
        });
        ownerPods[msg.sender].push(tokenId);

        IPetNFT(petNFT).safeTransferFrom(msg.sender, address(this), tokenId);

        emit PetLocked(tokenId, msg.sender, plannedDuration, block.timestamp);
    }

    /// @notice Release a pet NFT from stasis back to its original owner.
    /// @param tokenId The NFT token ID to unlock.
    function unlockPet(uint256 tokenId) external nonReentrant {
        Pod storage pod = pods[tokenId];
        if (!pod.active) {
            revert NotInStasis();
        }
        if (pod.owner != msg.sender) {
            revert NotPodOwner();
        }

        uint256 duration = block.timestamp - pod.lockedAt;
        pod.active = false;

        // Swap-and-pop to remove tokenId from ownerPods[msg.sender]
        uint256[] storage list = ownerPods[msg.sender];
        uint256 len = list.length;
        for (uint256 i = 0; i < len; ) {
            if (list[i] == tokenId) {
                list[i] = list[len - 1];
                list.pop();
                break;
            }
            unchecked { ++i; }
        }

        IPetNFT(petNFT).safeTransferFrom(address(this), msg.sender, tokenId);

        emit PetUnlocked(tokenId, msg.sender, duration);
    }

    // -----------------------------------------------------------------------
    // External — view / pure helpers
    // -----------------------------------------------------------------------

    /// @notice Compute the preservation fee for a given gross yield amount.
    ///         Pure helper used by the frontend to display the fee.
    /// @param grossYield The gross yield amount (in token units).
    /// @return fee       10% of grossYield (PRESERVATION_FEE_BPS / 10000).
    function computePreservationFee(
        uint256 tokenId,
        uint256 grossYield
    ) external pure returns (uint256 fee) {
        // tokenId parameter retained for ABI clarity / future per-pod rates
        (tokenId); // silence unused-variable warning
        fee = grossYield * PRESERVATION_FEE_BPS / 10000;
    }

    /// @notice Return all currently active pod token IDs for an owner.
    /// @param owner The address to query.
    /// @return active Array of token IDs that are still in stasis.
    function getActivePods(address owner) external view returns (uint256[] memory active) {
        uint256[] storage list = ownerPods[owner];
        uint256 len = list.length;

        // Count actives first to size the result array.
        uint256 count;
        for (uint256 i = 0; i < len; ) {
            if (pods[list[i]].active) ++count;
            unchecked { ++i; }
        }

        active = new uint256[](count);
        uint256 idx;
        for (uint256 i = 0; i < len; ) {
            if (pods[list[i]].active) {
                active[idx] = list[i];
                unchecked { ++idx; }
            }
            unchecked { ++i; }
        }
    }

    /// @notice Returns true if the given token is currently held in stasis.
    function isInStasis(uint256 tokenId) external view returns (bool) {
        return pods[tokenId].active;
    }

    /// @notice Returns how long the token has been in stasis (0 if not active).
    function stasisDuration(uint256 tokenId) external view returns (uint256) {
        if (!pods[tokenId].active) return 0;
        return block.timestamp - pods[tokenId].lockedAt;
    }

    // -----------------------------------------------------------------------
    // External — admin
    // -----------------------------------------------------------------------

    /// @notice Update the protocol treasury address. Only callable by the owner.
    /// @param newTreasury The new treasury address.
    function setProtocolTreasury(address newTreasury) external onlyOwner {
        emit TreasuryUpdated(protocolTreasury, newTreasury);
        protocolTreasury = newTreasury;
    }

    // -----------------------------------------------------------------------
    // IERC721Receiver
    // -----------------------------------------------------------------------

    /// @inheritdoc IERC721Receiver
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
