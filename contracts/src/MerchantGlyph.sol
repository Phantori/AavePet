// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ── External interfaces ──────────────────────────────────────────────────────

interface IPetNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IPetVault {
    function yieldForPet(uint256 tokenId) external view returns (uint256);
}

interface IUSDC {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

// ── MerchantGlyph ────────────────────────────────────────────────────────────

/// @title  MerchantGlyph — L4 Glyph for the Aegis Rover portable kiosk system.
/// @notice Tracks deployable real-world pet sanctuaries (rolling suitcase kiosks).
///         When a kiosk is active its owner becomes a discoverable on-trail merchant.
///         Guests can check in, paying a USDC hospitality fee that streams to the host.
///         Milestone hospitality counts earn immutable on-chain badge levels.
///         Max 4 096 simultaneous active kiosks (regional network capsule ceiling).
contract MerchantGlyph is Ownable, ReentrancyGuard {

    // ── Enums ────────────────────────────────────────────────────────────────

    /// @notice Physical chassis size of the Aegis Rover unit.
    enum KioskSize { Sprite, Ranger, Behemoth }

    /// @notice Operational deployment state.
    enum OperationalState { Dormant, Active, RestStation }

    // ── Structs ──────────────────────────────────────────────────────────────

    struct KioskGlyph {
        KioskSize        size;
        OperationalState state;
        int32            lat;               // latitude  × 1e7 (self-reported)
        int32            lon;               // longitude × 1e7 (self-reported)
        uint256          lifetimeHospitality; // total guest check-ins ever
        uint256          lastDeployAt;      // block.timestamp of last deploy (anti-spam)
        uint256          activeGuests;      // guests currently checked in
    }

    struct InventoryPurchase {
        bytes32 itemBatchId;
        uint256 amount;
        uint256 timestamp;
        address vendor;
    }

    // ── Constants ────────────────────────────────────────────────────────────

    uint256 public constant MAX_ACTIVE_KIOSKS   = 4_096;
    uint256 public constant DEPLOY_COOLDOWN      = 5 minutes;
    uint256 public constant HOSPITALITY_FEE_USDC = 1e6; // 1 USDC (6-decimal)

    // Hospitality milestone thresholds → badge levels 1–5
    uint256 private constant BADGE_L1 =  1;
    uint256 private constant BADGE_L2 =  5;
    uint256 private constant BADGE_L3 = 10;
    uint256 private constant BADGE_L4 = 25;
    uint256 private constant BADGE_L5 = 50;

    // ── Immutables ───────────────────────────────────────────────────────────

    address public immutable petNFT;
    address public immutable usdcVault; // used to verify yield > 0 before deploy
    address public immutable usdc;

    // ── State ────────────────────────────────────────────────────────────────

    uint256 public activeKioskCount;

    /// petTokenId => KioskGlyph
    mapping(uint256 => KioskGlyph) public merchantGlyphs;

    /// guestTokenId => true while checked into a sanctuary
    mapping(uint256 => bool) public inSanctuary;

    /// guestTokenId => hostTokenId (only valid when inSanctuary[guest] == true)
    mapping(uint256 => uint256) public sanctuaryHost;

    /// petTokenId => highest earned hospitality badge level (0 = none, max 5)
    mapping(uint256 => uint256) public hospitalityBadge;

    /// vendor address => approved for wholesale transactions
    mapping(address => bool) public approvedVendors;

    /// petTokenId => list of settled wholesale purchases
    mapping(uint256 => InventoryPurchase[]) private _wholesalePurchases;

    // ── Errors ───────────────────────────────────────────────────────────────

    error NotPetOwner();
    error KioskNotActive();
    error KioskAlreadyActive();
    error DeployCooldown();
    error MaxKiosksReached();
    error NoYieldToDeploy();
    error GuestNotInSanctuary();
    error HostKioskNotActive();
    error VendorNotApproved();
    error GuestAlreadyInSanctuary();
    error ZeroAmount();
    error Unauthorized();

    // ── Events ───────────────────────────────────────────────────────────────

    event KioskDeployed(uint256 indexed tokenId, int32 lat, int32 lon, KioskSize size);
    event KioskRetracted(uint256 indexed tokenId);
    event GuestCheckedIn(uint256 indexed guestTokenId, uint256 indexed hostTokenId, uint256 feePaid);
    event GuestCheckedOut(uint256 indexed guestTokenId, uint256 indexed hostTokenId);
    event HospitalityBadgeEarned(uint256 indexed tokenId, uint256 badgeLevel, uint256 lifetimeHospitality);
    event WholesalePurchase(uint256 indexed tokenId, bytes32 indexed itemBatchId, uint256 amount, address vendor);
    event VendorApprovalSet(address indexed vendor, bool approved);

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address petNFT_,
        address usdcVault_,
        address usdc_,
        address initialOwner
    ) Ownable(initialOwner) {
        petNFT    = petNFT_;
        usdcVault = usdcVault_;
        usdc      = usdc_;
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    /// @notice Approve or revoke a wholesale vendor address.
    function setVendorApproval(address vendor, bool approved) external onlyOwner {
        approvedVendors[vendor] = approved;
        emit VendorApprovalSet(vendor, approved);
    }

    // ── Kiosk management ─────────────────────────────────────────────────────

    /// @notice Deploy the Aegis Rover kiosk on-trail.
    ///         Requires the pet vault to have non-zero yield as capital proof.
    /// @param tokenId Pet NFT token ID.
    /// @param size    Physical chassis size.
    /// @param lat     Latitude × 1e7 (e.g. 37_7749000 for 37.7749°N).
    /// @param lon     Longitude × 1e7 (e.g. -122_4194000 for -122.4194°W).
    function deployKiosk(
        uint256 tokenId,
        KioskSize size,
        int32 lat,
        int32 lon
    ) external nonReentrant {
        if (IPetNFT(petNFT).ownerOf(tokenId) != msg.sender)   revert NotPetOwner();
        KioskGlyph storage g = merchantGlyphs[tokenId];
        if (g.state != OperationalState.Dormant)               revert KioskAlreadyActive();
        if (block.timestamp < g.lastDeployAt + DEPLOY_COOLDOWN) revert DeployCooldown();
        if (activeKioskCount >= MAX_ACTIVE_KIOSKS)             revert MaxKiosksReached();
        if (IPetVault(usdcVault).yieldForPet(tokenId) == 0)   revert NoYieldToDeploy();

        g.size         = size;
        g.state        = OperationalState.Active;
        g.lat          = lat;
        g.lon          = lon;
        g.lastDeployAt = block.timestamp;
        unchecked { activeKioskCount++; }

        emit KioskDeployed(tokenId, lat, lon, size);
    }

    /// @notice Pack up and retract the kiosk.
    function retractKiosk(uint256 tokenId) external nonReentrant {
        if (IPetNFT(petNFT).ownerOf(tokenId) != msg.sender) revert NotPetOwner();
        KioskGlyph storage g = merchantGlyphs[tokenId];
        if (g.state == OperationalState.Dormant) revert KioskNotActive();

        g.state = OperationalState.Dormant;
        unchecked { if (activeKioskCount > 0) activeKioskCount--; }

        emit KioskRetracted(tokenId);
    }

    // ── Hospitality ──────────────────────────────────────────────────────────

    /// @notice Check a tired/injured guest pet into an active trail sanctuary.
    ///         Transfers HOSPITALITY_FEE_USDC from the caller to the host owner.
    ///         Advances the host's lifetimeHospitality and awards badge milestones.
    /// @param guestTokenId Guest pet NFT ID (caller must own it).
    /// @param hostTokenId  Host pet NFT ID (its kiosk must be Active or RestStation).
    function checkInGuest(uint256 guestTokenId, uint256 hostTokenId) external nonReentrant {
        if (IPetNFT(petNFT).ownerOf(guestTokenId) != msg.sender) revert NotPetOwner();
        if (inSanctuary[guestTokenId])                            revert GuestAlreadyInSanctuary();

        KioskGlyph storage host = merchantGlyphs[hostTokenId];
        if (host.state != OperationalState.Active && host.state != OperationalState.RestStation) {
            revert HostKioskNotActive();
        }

        address hostOwner = IPetNFT(petNFT).ownerOf(hostTokenId);
        IUSDC(usdc).transferFrom(msg.sender, hostOwner, HOSPITALITY_FEE_USDC);

        inSanctuary[guestTokenId]  = true;
        sanctuaryHost[guestTokenId] = hostTokenId;
        host.state = OperationalState.RestStation;
        unchecked {
            host.activeGuests++;
            host.lifetimeHospitality++;
        }

        // Badge milestone check
        uint256 newLevel = _hospitalityLevel(host.lifetimeHospitality);
        if (newLevel > hospitalityBadge[hostTokenId]) {
            hospitalityBadge[hostTokenId] = newLevel;
            emit HospitalityBadgeEarned(hostTokenId, newLevel, host.lifetimeHospitality);
        }

        emit GuestCheckedIn(guestTokenId, hostTokenId, HOSPITALITY_FEE_USDC);
    }

    /// @notice Release a guest from the sanctuary. Callable by guest owner or host owner.
    function checkOutGuest(uint256 guestTokenId) external nonReentrant {
        if (!inSanctuary[guestTokenId]) revert GuestNotInSanctuary();

        uint256 hostTokenId = sanctuaryHost[guestTokenId];
        bool isGuestOwner = IPetNFT(petNFT).ownerOf(guestTokenId) == msg.sender;
        bool isHostOwner  = IPetNFT(petNFT).ownerOf(hostTokenId)  == msg.sender;
        if (!isGuestOwner && !isHostOwner) revert Unauthorized();

        inSanctuary[guestTokenId] = false;
        delete sanctuaryHost[guestTokenId];

        KioskGlyph storage host = merchantGlyphs[hostTokenId];
        if (host.activeGuests > 0) {
            unchecked { host.activeGuests--; }
        }
        if (host.activeGuests == 0 && host.state == OperationalState.RestStation) {
            host.state = OperationalState.Active;
        }

        emit GuestCheckedOut(guestTokenId, hostTokenId);
    }

    // ── Wholesale inventory ──────────────────────────────────────────────────

    /// @notice Settle a wholesale supply purchase, routing USDC to an approved vendor.
    ///         The owner calls this from their own USDC (yield withdrawn separately)
    ///         and receives an on-chain inventory receipt linked to their pet.
    /// @param tokenId     Pet NFT ID (caller must own it).
    /// @param itemBatchId Off-chain item batch identifier (e.g. keccak of vendor SKU).
    /// @param amount      USDC amount (6-decimal) to transfer to vendor.
    /// @param vendor      Approved vendor address.
    function syncWholesaleInventory(
        uint256 tokenId,
        bytes32 itemBatchId,
        uint256 amount,
        address vendor
    ) external nonReentrant {
        if (IPetNFT(petNFT).ownerOf(tokenId) != msg.sender) revert NotPetOwner();
        if (amount == 0)                                     revert ZeroAmount();
        if (!approvedVendors[vendor])                        revert VendorNotApproved();

        IUSDC(usdc).transferFrom(msg.sender, vendor, amount);
        _wholesalePurchases[tokenId].push(InventoryPurchase({
            itemBatchId: itemBatchId,
            amount:      amount,
            timestamp:   block.timestamp,
            vendor:      vendor
        }));

        emit WholesalePurchase(tokenId, itemBatchId, amount, vendor);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    /// @notice Return all wholesale purchase receipts for a pet.
    function getWholesalePurchases(uint256 tokenId) external view returns (InventoryPurchase[] memory) {
        return _wholesalePurchases[tokenId];
    }

    /// @notice Human-readable badge title for a hospitality level.
    function badgeTitle(uint256 level) external pure returns (string memory) {
        if (level == 1) return "Trail Helper";
        if (level == 2) return "Trail Friend";
        if (level == 3) return "Trail Medic";
        if (level == 4) return "Trail Guardian";
        if (level == 5) return "Sovereign Trail-Medic";
        return "None";
    }

    // ── Internal ────────────────────────────────────────────────────────────

    function _hospitalityLevel(uint256 total) internal pure returns (uint256) {
        if (total >= BADGE_L5) return 5;
        if (total >= BADGE_L4) return 4;
        if (total >= BADGE_L3) return 3;
        if (total >= BADGE_L2) return 2;
        if (total >= BADGE_L1) return 1;
        return 0;
    }
}
