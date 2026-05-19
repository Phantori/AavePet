// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Royalty} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BioSparkDNA} from "./lib/BioSparkDNA.sol";

/// @notice ERC-721 pet NFTs with on-chain royalties (EIP-2981) and BioSpark DNA.
/// Owners mint their own pets; the marketplace honours royalties on secondary sales.
contract PetNFT is ERC721, ERC721URIStorage, ERC721Royalty, Ownable {
    uint256 private _nextTokenId;

    // Per-token creator, so royalties go back to the original minter
    mapping(uint256 => address) public creator;
    // Immutable 256-bit BioSpark DNA, generated at mint
    mapping(uint256 => uint256) public tokenDNA;

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
