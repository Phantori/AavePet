// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Peer-to-peer marketplace for PetNFTs denominated in APT tokens.
/// Sellers list NFTs at a fixed APT price; buyers pay in one tx.
/// Respects EIP-2981 royalties and deducts a protocol fee.
contract PetMarketplace is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable aptToken;
    IERC721 public immutable petNFT;

    uint256 public protocolFeeBps = 250; // 2.5%
    address public feeRecipient;

    struct Listing {
        address seller;
        uint256 price; // in APT (wei)
        bool active;
    }

    // tokenId => Listing
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Delisted(uint256 indexed tokenId, address indexed seller);
    event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event ProtocolFeeUpdated(uint256 newBps);

    constructor(address _aptToken, address _petNFT, address _feeRecipient, address _owner)
        Ownable(_owner)
    {
        aptToken = IERC20(_aptToken);
        petNFT = IERC721(_petNFT);
        feeRecipient = _feeRecipient;
    }

    /// @notice List a pet NFT for sale. NFT must be approved to this contract first.
    function list(uint256 tokenId, uint256 price) external {
        require(price > 0, "Marketplace: price must be > 0");
        require(petNFT.ownerOf(tokenId) == msg.sender, "Marketplace: not owner");
        require(
            petNFT.isApprovedForAll(msg.sender, address(this)) ||
            petNFT.getApproved(tokenId) == address(this),
            "Marketplace: not approved"
        );

        listings[tokenId] = Listing({seller: msg.sender, price: price, active: true});
        emit Listed(tokenId, msg.sender, price);
    }

    /// @notice Remove a listing.
    function delist(uint256 tokenId) external {
        Listing storage l = listings[tokenId];
        require(l.active, "Marketplace: not listed");
        require(l.seller == msg.sender, "Marketplace: not seller");

        l.active = false;
        emit Delisted(tokenId, msg.sender);
    }

    /// @notice Purchase a listed NFT with APT tokens.
    function buy(uint256 tokenId) external nonReentrant {
        Listing storage l = listings[tokenId];
        require(l.active, "Marketplace: not listed");

        address seller = l.seller;
        uint256 price = l.price;
        l.active = false;

        // Protocol fee
        uint256 fee = (price * protocolFeeBps) / 10_000;

        // Royalty (EIP-2981)
        uint256 royalty;
        address royaltyRecipient;
        try IERC2981(address(petNFT)).royaltyInfo(tokenId, price) returns (address r, uint256 amount) {
            royaltyRecipient = r;
            royalty = amount;
        } catch {}

        uint256 sellerProceeds = price - fee - royalty;

        // Collect full price from buyer
        aptToken.safeTransferFrom(msg.sender, address(this), price);

        // Distribute
        if (fee > 0) aptToken.safeTransfer(feeRecipient, fee);
        if (royalty > 0 && royaltyRecipient != address(0)) aptToken.safeTransfer(royaltyRecipient, royalty);
        aptToken.safeTransfer(seller, sellerProceeds);

        // Transfer NFT
        petNFT.safeTransferFrom(seller, msg.sender, tokenId);

        emit Sold(tokenId, seller, msg.sender, price);
    }

    function setProtocolFee(uint256 newBps) external onlyOwner {
        require(newBps <= 1000, "Marketplace: fee too high"); // max 10%
        protocolFeeBps = newBps;
        emit ProtocolFeeUpdated(newBps);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        feeRecipient = newRecipient;
    }
}
