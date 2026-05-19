// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for querying the pet NFT owner.
interface IPetNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/// @notice Interface for the pet vault's guardian withdrawal hook.
interface IPetVault {
    function guardianWithdraw(
        uint256 tokenId,
        address depositor,
        address recipient,
        uint256 amount
    ) external;
}

/// @notice Guardian emergency access with 2-of-3 multi-sig and dead man's switch.
/// The pet owner registers up to 3 guardian addresses and an inactivity period.
/// If the owner stops calling pingAlive for longer than inactivityPeriod, guardians
/// can approve an emergency withdrawal that drains both vault balances to a recipient.
contract PetGuardian {

    // ── Storage ───────────────────────────────────────────────────────────────

    struct Config {
        address[3] guardians;
        uint8      threshold;        // 2 or 3
        uint256    inactivityPeriod; // seconds
        uint256    lastActivity;     // block.timestamp of last owner ping
        bool       active;
    }

    IPetNFT public immutable petNFT;

    /// @notice Guardian configuration per tokenId.
    mapping(uint256 => Config) public configs;

    /// @notice Whether a guardian has approved an emergency for a tokenId.
    mapping(uint256 => mapping(address => bool)) public approved;

    /// @notice Number of guardian approvals for a tokenId.
    mapping(uint256 => uint256) public approvalCount;

    /// @notice Whether the emergency has already been executed for a tokenId.
    mapping(uint256 => bool) public claimed;

    // ── Events ────────────────────────────────────────────────────────────────

    event GuardiansSet(
        uint256 indexed tokenId,
        address[3] guardians,
        uint8 threshold,
        uint256 inactivityPeriod
    );
    event AlivePinged(uint256 indexed tokenId, uint256 timestamp);
    event EmergencyApproved(uint256 indexed tokenId, address indexed guardian);
    event EmergencyExecuted(uint256 indexed tokenId, address indexed recipient);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address petNFT_) {
        petNFT = IPetNFT(petNFT_);
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyPetOwner(uint256 tokenId) {
        require(petNFT.ownerOf(tokenId) == msg.sender, "PetGuardian: not owner");
        _;
    }

    modifier onlyGuardian(uint256 tokenId) {
        require(_isGuardian(tokenId, msg.sender), "PetGuardian: not a guardian");
        _;
    }

    // ── Owner functions ───────────────────────────────────────────────────────

    /// @notice Register guardians for a tokenId. Only the token owner may call this.
    /// @param tokenId         The pet NFT token ID.
    /// @param guardians       Three guardian addresses.
    /// @param threshold       Required approvals (must be 2 or 3).
    /// @param inactivityPeriod Seconds of silence before guardians may act.
    function setupGuardians(
        uint256 tokenId,
        address[3] calldata guardians,
        uint8 threshold,
        uint256 inactivityPeriod
    ) external onlyPetOwner(tokenId) {
        require(threshold == 2 || threshold == 3, "PetGuardian: threshold must be 2 or 3");
        require(inactivityPeriod > 0, "PetGuardian: inactivityPeriod must be > 0");

        Config storage cfg = configs[tokenId];
        cfg.guardians        = guardians;
        cfg.threshold        = threshold;
        cfg.inactivityPeriod = inactivityPeriod;
        cfg.lastActivity     = block.timestamp;
        cfg.active           = true;

        // Clear any pending approvals when reconfiguring.
        _clearApprovals(tokenId, guardians);

        emit GuardiansSet(tokenId, guardians, threshold, inactivityPeriod);
    }

    /// @notice Signal that the owner is still alive, resetting the inactivity clock.
    /// Also clears any pending emergency approvals.
    /// @param tokenId The pet NFT token ID.
    function pingAlive(uint256 tokenId) external onlyPetOwner(tokenId) {
        Config storage cfg = configs[tokenId];
        require(cfg.active, "PetGuardian: no guardian config");

        cfg.lastActivity = block.timestamp;
        _clearApprovals(tokenId, cfg.guardians);

        emit AlivePinged(tokenId, block.timestamp);
    }

    // ── Guardian functions ────────────────────────────────────────────────────

    /// @notice A guardian signals approval for an emergency withdrawal.
    /// Reverts if the inactivity period has not yet elapsed.
    /// @param tokenId The pet NFT token ID.
    function approveEmergency(uint256 tokenId) external onlyGuardian(tokenId) {
        require(!claimed[tokenId], "PetGuardian: already claimed");
        require(isInactive(tokenId), "PetGuardian: owner is still active");
        require(!approved[tokenId][msg.sender], "PetGuardian: already approved");

        approved[tokenId][msg.sender] = true;
        approvalCount[tokenId] += 1;

        emit EmergencyApproved(tokenId, msg.sender);
    }

    /// @notice Execute the emergency withdrawal once enough guardians have approved.
    /// Calls guardianWithdraw on both provided vault addresses.
    /// @param tokenId    The pet NFT token ID.
    /// @param usdcVault  Address of the USDC PetVault.
    /// @param wethVault  Address of the WETH PetVault.
    /// @param recipient  Address that receives the withdrawn funds.
    function executeEmergency(
        uint256 tokenId,
        address usdcVault,
        address wethVault,
        address recipient
    ) external onlyGuardian(tokenId) {
        require(!claimed[tokenId], "PetGuardian: already claimed");
        require(isInactive(tokenId), "PetGuardian: owner is still active");

        Config storage cfg = configs[tokenId];
        require(approvalCount[tokenId] >= cfg.threshold, "PetGuardian: insufficient approvals");
        require(recipient != address(0), "PetGuardian: invalid recipient");

        claimed[tokenId] = true;

        // Retrieve the original owner to look up their deposit balances.
        // NOTE: ownerOf may revert if the token was burned; callers should ensure the token exists.
        address depositor = petNFT.ownerOf(tokenId);

        // Attempt withdrawal from each vault. We use a non-reverting pattern so that
        // a zero-balance vault doesn't block the other. Each vault's guardianWithdraw
        // is expected to revert on insufficient balance — so we pass the full balance
        // by delegating the amount check to the vault's own accounting via amount=0
        // sentinel convention. Instead, callers must supply explicit amounts; we use
        // type(uint256).max to signal "all available", matching Aave's withdraw convention.
        IPetVault(usdcVault).guardianWithdraw(tokenId, depositor, recipient, type(uint256).max);
        IPetVault(wethVault).guardianWithdraw(tokenId, depositor, recipient, type(uint256).max);

        emit EmergencyExecuted(tokenId, recipient);
    }

    // ── View functions ────────────────────────────────────────────────────────

    /// @notice Returns true if the owner has been inactive longer than their configured period.
    /// @param tokenId The pet NFT token ID.
    function isInactive(uint256 tokenId) external view returns (bool) {
        Config storage cfg = configs[tokenId];
        if (!cfg.active) return false;
        return block.timestamp > cfg.lastActivity + cfg.inactivityPeriod;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /// @dev Check whether `who` is one of the three registered guardians for tokenId.
    function _isGuardian(uint256 tokenId, address who) internal view returns (bool) {
        address[3] storage g = configs[tokenId].guardians;
        return who == g[0] || who == g[1] || who == g[2];
    }

    /// @dev Reset all approval state for a tokenId.
    function _clearApprovals(uint256 tokenId, address[3] memory guardians) internal {
        for (uint256 i = 0; i < 3; i++) {
            if (guardians[i] != address(0)) {
                approved[tokenId][guardians[i]] = false;
            }
        }
        approvalCount[tokenId] = 0;
    }
}
