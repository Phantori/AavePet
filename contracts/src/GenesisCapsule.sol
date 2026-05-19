// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @notice ERC-1155 ancestor capsule minted by RainbowBridge when a pet is archived.
/// One capsule type per archived pet (id = original tokenId). Transferable.
/// Burns when used to mint a successor pet via PetNFT.mintWithLineage().
contract GenesisCapsule is ERC1155, Ownable {
    using Strings for uint256;

    // ── Storage ──────────────────────────────────────────────────────────────

    struct AncestorData {
        uint256 dna;
        uint256 lifetimeUsdcSaved;
        uint256 charges;
        uint256 archivedAt;
    }

    /// @notice Ancestor metadata keyed by capsule id (= original tokenId).
    mapping(uint256 => AncestorData) public ancestors;

    /// @notice Only this address may call mintCapsule().
    address public immutable rainbowBridge;

    /// @notice Only this address may call burn().
    address public petNFT;

    // ── Thresholds for tier calculation (in USDC with 6 decimals) ─────────

    uint256 private constant TIER1_THRESHOLD  = 100e6;    // $100
    uint256 private constant TIER2_THRESHOLD  = 1_000e6;  // $1 000
    uint256 private constant TIER3_THRESHOLD  = 10_000e6; // $10 000

    // ── Errors ───────────────────────────────────────────────────────────────

    error OnlyRainbowBridge();
    error OnlyPetNFT();
    error CapsuleNotFound();

    // ── Events ───────────────────────────────────────────────────────────────

    event CapsuleMinted(uint256 indexed capsuleId, address indexed to, uint256 dna);
    event CapsuleBurned(uint256 indexed capsuleId, address indexed burner);

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(address rainbowBridge_, address initialOwner)
        ERC1155("")
        Ownable(initialOwner)
    {
        rainbowBridge = rainbowBridge_;
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    /// @notice Set the PetNFT contract address — the only address permitted to burn capsules.
    function setPetNFT(address petNFT_) external onlyOwner {
        petNFT = petNFT_;
    }

    // ── Minting (RainbowBridge only) ─────────────────────────────────────────

    /// @notice Mint one capsule of id=capsuleId to `to`. Called exclusively by RainbowBridge.
    /// @param to               Recipient of the capsule (the original pet owner).
    /// @param capsuleId        Capsule id — matches the archived pet's tokenId.
    /// @param dna              256-bit BioSpark DNA of the archived pet.
    /// @param lifetimeUsdcSaved Lifetime USDC savings snapshot (may be 0 at archive time).
    /// @param charges          Lifetime charge count snapshot (may be 0 at archive time).
    function mintCapsule(
        address to,
        uint256 capsuleId,
        uint256 dna,
        uint256 lifetimeUsdcSaved,
        uint256 charges
    ) external {
        if (msg.sender != rainbowBridge) revert OnlyRainbowBridge();

        ancestors[capsuleId] = AncestorData({
            dna: dna,
            lifetimeUsdcSaved: lifetimeUsdcSaved,
            charges: charges,
            archivedAt: block.timestamp
        });

        _mint(to, capsuleId, 1, "");

        emit CapsuleMinted(capsuleId, to, dna);
    }

    // ── Burning (PetNFT only) ─────────────────────────────────────────────────

    /// @notice Burn one capsule of id=capsuleId from `from`. Called exclusively by PetNFT.
    /// @param from      Current holder of the capsule.
    /// @param capsuleId Capsule id to burn.
    function burn(address from, uint256 capsuleId) external {
        if (msg.sender != petNFT) revert OnlyPetNFT();
        if (ancestors[capsuleId].archivedAt == 0) revert CapsuleNotFound();

        _burn(from, capsuleId, 1);

        emit CapsuleBurned(capsuleId, from);
    }

    // ── Metadata ─────────────────────────────────────────────────────────────

    /// @notice Returns a base64-encoded JSON data URI for the capsule.
    function uri(uint256 capsuleId) public view override returns (string memory) {
        AncestorData memory data = ancestors[capsuleId];
        if (data.archivedAt == 0) revert CapsuleNotFound();

        // Decode species from DNA byte 0 (bits 0-7)
        uint256 speciesIndex = data.dna & 0xFF;
        string memory speciesName = _speciesName(speciesIndex);

        // Decode generation from DNA byte 1 (bits 8-15)
        uint256 generation = (data.dna >> 8) & 0xFF;

        // Compute tier from lifetime USDC saved
        string memory tierName = _tierName(data.lifetimeUsdcSaved);

        string memory json = string.concat(
            '{"name":"Genesis Capsule #',
            capsuleId.toString(),
            '","description":"Ancestor lineage capsule. Burn to pass traits to your next pet."',
            ',"attributes":[',
            '{"trait_type":"Species","value":"', speciesName, '"},',
            '{"trait_type":"Generation","value":', generation.toString(), '},',
            '{"trait_type":"Tier","value":"', tierName, '"},',
            '{"trait_type":"Archived At","value":', data.archivedAt.toString(),
            '}]}'
        );

        return string.concat(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        );
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _speciesName(uint256 index) internal pure returns (string memory) {
        // Eight canonical species cycling over the lower 3 bits
        uint256 s = index % 8;
        if (s == 0) return "Aqua Pup";
        if (s == 1) return "Ember Fox";
        if (s == 2) return "Gale Hawk";
        if (s == 3) return "Terra Bear";
        if (s == 4) return "Lumen Lynx";
        if (s == 5) return "Void Serpent";
        if (s == 6) return "Storm Elk";
        return "Crystal Drake";
    }

    function _tierName(uint256 lifetimeUsdcSaved) internal pure returns (string memory) {
        if (lifetimeUsdcSaved >= TIER3_THRESHOLD) return "Legendary";
        if (lifetimeUsdcSaved >= TIER2_THRESHOLD) return "Rare";
        if (lifetimeUsdcSaved >= TIER1_THRESHOLD) return "Uncommon";
        return "Common";
    }
}
