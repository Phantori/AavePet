// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Royalty} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BioSparkDNA} from "./lib/BioSparkDNA.sol";

interface IGenesisCapsule {
    function burn(address from, uint256 capsuleId) external;
}

interface IGenesisCapsule2 {
    struct AncestorData {
        uint256 dna;
        uint256 lifetimeUsdcSaved;
        uint256 charges;
        uint256 archivedAt;
    }
    function ancestors(uint256 capsuleId) external view returns (AncestorData memory);
}

/// @notice ERC-721 pet NFTs with on-chain royalties (EIP-2981) and BioSpark DNA.
/// Owners mint their own pets; the marketplace honours royalties on secondary sales.
contract PetNFT is ERC721, ERC721URIStorage, ERC721Royalty, Ownable {
    uint256 private _nextTokenId;

    // Per-token creator, so royalties go back to the original minter
    mapping(uint256 => address) public creator;
    // Immutable 256-bit BioSpark DNA, generated at mint
    mapping(uint256 => uint256) public tokenDNA;
    // Records which ancestor capsule id was consumed when minting a lineage pet (0 = no lineage)
    mapping(uint256 => uint256) public ancestorTokenId;

    /// @notice GenesisCapsule contract. Optional — enables mintWithLineage().
    address public genesisCapsule;

    uint96 public constant DEFAULT_ROYALTY_BPS = 500; // 5%

    event PetMinted(uint256 indexed tokenId, address indexed owner, string tokenURI, uint256 dna);

    constructor(address initialOwner)
        ERC721("AavePet NFT", "APNFT")
        Ownable(initialOwner)
    {}

    /// @notice Mint a pet NFT. The caller becomes owner and royalty recipient.
    /// DNA is deterministically generated from block entropy + minter address.
    /// @param tokenURI_ IPFS URI pointing to the pet metadata JSON.
    function mint(string calldata tokenURI_) external returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        creator[tokenId] = msg.sender;

        uint256 dna = BioSparkDNA.generate(tokenId, msg.sender);
        tokenDNA[tokenId] = dna;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        _setTokenRoyalty(tokenId, msg.sender, DEFAULT_ROYALTY_BPS);

        emit PetMinted(tokenId, msg.sender, tokenURI_, dna);
    }

    /// @notice Set the GenesisCapsule contract address. Owner only.
    function setGenesisCapsule(address gc) external onlyOwner {
        genesisCapsule = gc;
    }

    /// @notice Mint a pet NFT using an ancestor capsule for lineage inheritance.
    /// Burns the capsule and blends ancestor traits into the new pet's DNA.
    /// @param tokenURI_         IPFS URI pointing to the pet metadata JSON.
    /// @param ancestorCapsuleId The GenesisCapsule id to burn for lineage.
    function mintWithLineage(
        string calldata tokenURI_,
        uint256 ancestorCapsuleId
    ) external returns (uint256 tokenId) {
        require(genesisCapsule != address(0), "PetNFT: genesisCapsule not set");

        // Fetch ancestor DNA before the capsule is burned
        IGenesisCapsule2.AncestorData memory ancestorData =
            IGenesisCapsule2(genesisCapsule).ancestors(ancestorCapsuleId);
        require(ancestorData.archivedAt != 0, "PetNFT: capsule not found");

        // Burn the capsule — reverts if msg.sender does not hold it
        IGenesisCapsule(genesisCapsule).burn(msg.sender, ancestorCapsuleId);

        tokenId = _nextTokenId++;
        creator[tokenId] = msg.sender;

        // Generate fresh entropy-based DNA
        uint256 freshDNA = BioSparkDNA.generate(tokenId, msg.sender);

        // Blend: preserve ancestor species, generation, and resonance (bits 0-31);
        // the upper 224 bits come from fresh entropy.
        uint256 dna = (freshDNA & ~uint256(0xFFFFFFFF)) | (ancestorData.dna & 0xFFFFFFFF);

        tokenDNA[tokenId] = dna;
        ancestorTokenId[tokenId] = ancestorCapsuleId;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        _setTokenRoyalty(tokenId, msg.sender, DEFAULT_ROYALTY_BPS);

        emit PetMinted(tokenId, msg.sender, tokenURI_, dna);
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
}
