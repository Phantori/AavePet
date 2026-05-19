// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BioSparkDNA} from "./lib/BioSparkDNA.sol";
import {HeraldryRenderer} from "./lib/HeraldryRenderer.sol";
import {CipherRunes} from "./lib/CipherRunes.sol";

interface IPetNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function tokenDNA(uint256 tokenId) external view returns (uint256);
}

interface IPetVault {
    function deposits(uint256 tokenId, address owner) external view returns (uint256);
    function yieldForPet(uint256 tokenId) external view returns (uint256);
}

interface IPetCreditLine {
    function borrows(uint256 tokenId, address owner) external view returns (uint256);
}

/// @notice Tracks per-pet milestones (charges) and generates on-chain heraldry SVGs.
contract PetHeraldry is Ownable {
    IPetNFT      public petNFT;
    IPetVault    public usdcVault;
    IPetVault    public wethVault;
    IPetCreditLine public creditLine;

    // Pack membership: each address may belong to one pack
    mapping(address => bytes32) public packOf;
    // Pack founders
    mapping(bytes32 => address) public packFounder;
    // Cached charges per tokenId (updated on evaluateMilestones)
    mapping(uint256 => uint256) public charges;

    event MilestonesEvaluated(uint256 indexed tokenId, uint256 charges);
    event PackFounded(bytes32 indexed packId, address indexed founder);
    event PackJoined(bytes32 indexed packId, address indexed member);

    constructor(
        address initialOwner,
        address petNFT_,
        address usdcVault_,
        address wethVault_,
        address creditLine_
    ) Ownable(initialOwner) {
        petNFT     = IPetNFT(petNFT_);
        usdcVault  = IPetVault(usdcVault_);
        wethVault  = IPetVault(wethVault_);
        creditLine = IPetCreditLine(creditLine_);
    }

    // ── Milestone evaluation ─────────────────────────────────────────────────

    /// @notice Evaluate and cache milestone charges for a tokenId.
    /// Anyone can call this to update the on-chain state.
    function evaluateMilestones(uint256 tokenId) external returns (uint256 newCharges) {
        address owner = petNFT.ownerOf(tokenId);

        uint256 usdcSaved = usdcVault.deposits(tokenId, owner);
        uint256 wethSaved = wethVault.deposits(tokenId, owner);
        uint256 usdcYield = usdcVault.yieldForPet(tokenId);
        uint256 debt      = creditLine.borrows(tokenId, owner);

        newCharges = 0;
        if (debt > 0)                               newCharges |= HeraldryRenderer.CHARGE_CREDIT;
        if (usdcSaved > 0 || wethSaved > 0)         newCharges |= HeraldryRenderer.CHARGE_SAVINGS;
        if (usdcYield > 0)                           newCharges |= HeraldryRenderer.CHARGE_YIELD;
        if (usdcSaved >= HeraldryRenderer.TIER_PLATINUM) newCharges |= HeraldryRenderer.CHARGE_SOVEREIGN;

        // Pack founder charge
        bytes32 pack = packOf[owner];
        if (pack != bytes32(0) && packFounder[pack] == owner) {
            newCharges |= HeraldryRenderer.CHARGE_PACK;
        }

        charges[tokenId] = newCharges;
        emit MilestonesEvaluated(tokenId, newCharges);
    }

    // ── Heraldry token URI ────────────────────────────────────────────────────

    /// @notice Return a base64-encoded data URI with the heraldry SVG + metadata.
    function getHeraldryURI(uint256 tokenId, string calldata petName) external view returns (string memory) {
        address owner = petNFT.ownerOf(tokenId);
        uint256 dna   = petNFT.tokenDNA(tokenId);
        uint256 usdcSaved = usdcVault.deposits(tokenId, owner);

        return HeraldryRenderer.buildTokenURI(HeraldryRenderer.HeraldryInput({
            dna:       dna,
            charges:   charges[tokenId],
            usdcSaved: usdcSaved,
            petName:   petName,
            tokenId:   tokenId
        }));
    }

    /// @notice Return only the raw SVG string.
    function getHeraldrySVG(uint256 tokenId, string calldata petName) external view returns (string memory) {
        address owner = petNFT.ownerOf(tokenId);
        uint256 dna   = petNFT.tokenDNA(tokenId);
        uint256 usdcSaved = usdcVault.deposits(tokenId, owner);

        BioSparkDNA.Traits memory t = BioSparkDNA.decode(dna);
        return HeraldryRenderer.buildSVG(
            HeraldryRenderer.HeraldryInput({
                dna:       dna,
                charges:   charges[tokenId],
                usdcSaved: usdcSaved,
                petName:   petName,
                tokenId:   tokenId
            }),
            t
        );
    }

    // ── Pack system ───────────────────────────────────────────────────────────

    /// @notice Create a new pack. Caller becomes founder.
    function foundPack(bytes32 packId) external {
        require(packFounder[packId] == address(0), "PetHeraldry: pack exists");
        require(packOf[msg.sender] == bytes32(0),  "PetHeraldry: already in a pack");
        packFounder[packId] = msg.sender;
        packOf[msg.sender]  = packId;
        emit PackFounded(packId, msg.sender);
    }

    /// @notice Join an existing pack (invite-free; packs are social).
    function joinPack(bytes32 packId) external {
        require(packFounder[packId] != address(0), "PetHeraldry: pack not found");
        packOf[msg.sender] = packId;
        emit PackJoined(packId, msg.sender);
    }

    // ── Rune name ─────────────────────────────────────────────────────────────

    /// @notice Return the 40-rune secret name derived from a pet's on-chain DNA.
    /// @param tokenId The pet NFT token ID.
    /// @return        The 40-rune string (120 UTF-8 bytes).
    function getRuneName(uint256 tokenId) external view returns (string memory) {
        uint256 dna = petNFT.tokenDNA(tokenId);
        return CipherRunes.getRuneName(dna);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setContracts(
        address petNFT_,
        address usdcVault_,
        address wethVault_,
        address creditLine_
    ) external onlyOwner {
        petNFT     = IPetNFT(petNFT_);
        usdcVault  = IPetVault(usdcVault_);
        wethVault  = IPetVault(wethVault_);
        creditLine = IPetCreditLine(creditLine_);
    }
}
