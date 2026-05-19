// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IGenesisCapsule {
    function mintCapsule(
        address to,
        uint256 capsuleId,
        uint256 dna,
        uint256 lifetimeUsdcSaved,
        uint256 charges
    ) external;
}

interface IPetNFTDNA {
    function tokenDNA(uint256 tokenId) external view returns (uint256);
}

/// @notice Immutable pet memorial contract.
/// When a pet passes, the owner transfers the NFT here permanently — it can never leave.
/// The owner can append a final tribute and direct the vault's accumulated yield to charity.
/// All data is on-chain and eternal.
contract RainbowBridge is IERC721Receiver, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC721 public immutable petNFT;

    /// @notice GenesisCapsule contract; mints an ancestor capsule on archive. Optional.
    address public genesisCapsule;

    /// @notice PetNFT contract used to read tokenDNA during archive. Optional.
    IPetNFTDNA public petNFTContract;

    struct Memorial {
        address originalOwner;
        uint256 archivedAt;       // block timestamp
        string epitaph;           // immutable farewell message
        string[] memoryCids;      // IPFS CIDs of photos/memories added by owner
        address charityWallet;    // yield beneficiary (pet shelter, rescue, etc.)
        bool yieldStreamActive;   // whether yield is streaming to charity
    }

    // tokenId => Memorial
    mapping(uint256 => Memorial) public memorials;

    // tokenId => vault => whether yield from that vault streams to charity
    mapping(uint256 => mapping(address => bool)) public yieldStream;

    event PetArchived(uint256 indexed tokenId, address indexed originalOwner, string epitaph);
    event MemoryAdded(uint256 indexed tokenId, string cid);
    event CharitySet(uint256 indexed tokenId, address indexed charity);
    event YieldDonated(uint256 indexed tokenId, address indexed charity, address asset, uint256 amount);

    error NotOriginalOwner();
    error NotArchived();
    error AlreadyArchived();

    constructor(address _petNFT, address initialOwner)
        Ownable(initialOwner)
    {
        petNFT = IERC721(_petNFT);
    }

    /// @notice Set the GenesisCapsule contract address. Owner only.
    function setGenesisCapsule(address gc) external onlyOwner {
        genesisCapsule = gc;
    }

    /// @notice Set the PetNFT contract used to read tokenDNA. Owner only.
    function setPetNFTContract(address petNFT_) external onlyOwner {
        petNFTContract = IPetNFTDNA(petNFT_);
    }

    /// @notice Archive a pet NFT as a memorial. The NFT is locked here forever.
    /// @param tokenId  The pet's token ID.
    /// @param epitaph  A final, immutable message. Choose carefully — it cannot be changed.
    /// @param charity  A wallet address to receive donated yield (shelter, rescue org, etc.).
    function archive(uint256 tokenId, string calldata epitaph, address charity) external nonReentrant {
        if (memorials[tokenId].archivedAt != 0) revert AlreadyArchived();

        // Transfer NFT into this contract permanently
        petNFT.safeTransferFrom(msg.sender, address(this), tokenId);

        memorials[tokenId] = Memorial({
            originalOwner: msg.sender,
            archivedAt: block.timestamp,
            epitaph: epitaph,
            memoryCids: new string[](0),
            charityWallet: charity,
            yieldStreamActive: charity != address(0)
        });

        emit PetArchived(tokenId, msg.sender, epitaph);
        if (charity != address(0)) emit CharitySet(tokenId, charity);

        // Mint a Genesis Capsule to the original owner so they can pass traits to a successor.
        if (genesisCapsule != address(0)) {
            uint256 dna = address(petNFTContract) != address(0)
                ? petNFTContract.tokenDNA(tokenId)
                : 0;
            IGenesisCapsule(genesisCapsule).mintCapsule(
                msg.sender, // original owner receives the capsule
                tokenId,    // capsule id = archived tokenId
                dna,
                0,          // lifetimeUsdcSaved — snapshot deferred (requires oracle)
                0           // charges — snapshot deferred
            );
        }
    }

    /// @notice Append a photo or memory CID to the memorial. Only the original owner.
    function addMemory(uint256 tokenId, string calldata cid) external {
        Memorial storage m = memorials[tokenId];
        if (m.archivedAt == 0) revert NotArchived();
        if (m.originalOwner != msg.sender) revert NotOriginalOwner();
        m.memoryCids.push(cid);
        emit MemoryAdded(tokenId, cid);
    }

    /// @notice Update the charity wallet. Only the original owner.
    function setCharity(uint256 tokenId, address charity) external {
        Memorial storage m = memorials[tokenId];
        if (m.archivedAt == 0) revert NotArchived();
        if (m.originalOwner != msg.sender) revert NotOriginalOwner();
        m.charityWallet = charity;
        m.yieldStreamActive = charity != address(0);
        emit CharitySet(tokenId, charity);
    }

    /// @notice Donate accrued yield from a vault to the memorial's charity.
    /// Anyone can trigger this — the yield goes from the vault to charity, not to this contract.
    /// @param tokenId     The archived pet's token ID.
    /// @param vaultToken  The aToken (aUSDC or aWETH) held by the vault.
    /// @param vault       The PetVault contract address.
    /// @param amount      Amount of yield to donate (caller determines based on yieldForPet()).
    function donateYield(
        uint256 tokenId,
        address vaultToken,
        address vault,
        uint256 amount
    ) external nonReentrant {
        Memorial storage m = memorials[tokenId];
        if (m.archivedAt == 0) revert NotArchived();
        require(m.yieldStreamActive && m.charityWallet != address(0), "RainbowBridge: no charity set");
        require(amount > 0, "RainbowBridge: amount must be > 0");

        // Pull the yield token from the vault (vault must have approved this contract)
        IERC20(vaultToken).safeTransferFrom(vault, m.charityWallet, amount);

        emit YieldDonated(tokenId, m.charityWallet, vaultToken, amount);
    }

    function getMemoryCids(uint256 tokenId) external view returns (string[] memory) {
        return memorials[tokenId].memoryCids;
    }

    function isArchived(uint256 tokenId) external view returns (bool) {
        return memorials[tokenId].archivedAt != 0;
    }

    // NFTs sent here are permanently locked — this contract never calls safeTransferFrom out.
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
