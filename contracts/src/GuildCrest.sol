// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

// ── External interfaces ──────────────────────────────────────────────────────

interface IPetHeraldry {
    function packOf(address member) external view returns (bytes32);
    function packFounder(bytes32 packId) external view returns (address);
}

interface IPetVault {
    function deposits(uint256 tokenId, address depositor) external view returns (uint256);
    function yieldForPet(uint256 tokenId) external view returns (uint256);
}

interface IERC20Short {
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

// ── GuildCrest ───────────────────────────────────────────────────────────────

/// @notice ERC-721 where each token IS the guild's on-chain banner.
///         Max 16 guilds. Guild members pledge a percentage of vault yield
///         to the guild treasury and the SVG banner evolves as the treasury grows.
contract GuildCrest is ERC721, Ownable {
    using Strings for uint256;

    // ── Structs ──────────────────────────────────────────────────────────────

    struct Guild {
        string  name;          // e.g. "The Aethelgard Guard"
        bytes32 packId;        // the underlying PackHeraldry pack this guild maps to
        address founder;
        uint256 treasuryUsdc;  // total USDC pledged to guild (principal only)
        uint256 memberCount;
        uint256 createdAt;
    }

    // ── Constants ────────────────────────────────────────────────────────────

    uint256 public constant MAX_GUILDS    = 16;
    uint256 public constant MAX_PLEDGE_BPS = 2000; // 20%

    // Tier thresholds in USDC (6-decimal). 1 000 / 10 000 / 100 000 USDC.
    uint256 private constant SILVER_THRESHOLD   = 1_000e6;
    uint256 private constant GOLD_THRESHOLD     = 10_000e6;
    uint256 private constant PLATINUM_THRESHOLD = 100_000e6;

    // ── Immutables ───────────────────────────────────────────────────────────

    address public immutable usdc;
    address public immutable heraldry;

    // ── State ────────────────────────────────────────────────────────────────

    address public protocolTreasury;
    uint256 public guildCount;

    /// guildId (tokenId) => Guild
    mapping(uint256 => Guild) public guilds;
    /// member address => guildId they pledged to
    mapping(address => uint256) public memberGuild;
    /// member => pledged bps (0-2000 max)
    mapping(address => uint256) public pledgeBps;
    /// total USDC ever swept to each guild
    mapping(uint256 => uint256) public totalSwept;

    // ── Errors ───────────────────────────────────────────────────────────────

    error MaxGuildsReached();
    error NotPackFounder();
    error InvalidGuildId();
    error BpsExceedsMax();
    error InsufficientTreasury();
    error NotGuildOwner();
    error NoPledge();
    error ZeroAddress();

    // ── Events ───────────────────────────────────────────────────────────────

    event GuildCreated(uint256 indexed guildId, string name, bytes32 indexed packId, address indexed founder);
    event YieldPledged(address indexed member, uint256 indexed guildId, uint256 bps);
    event YieldSwept(uint256 indexed petTokenId, address indexed depositor, uint256 indexed guildId, uint256 amount);
    event FundsWithdrawn(uint256 indexed guildId, address indexed recipient, uint256 amount);

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address usdc_,
        address heraldry_,
        address protocolTreasury_,
        address initialOwner
    ) ERC721("GuildCrest", "GCREST") Ownable(initialOwner) {
        if (usdc_ == address(0) || heraldry_ == address(0) || protocolTreasury_ == address(0)) {
            revert ZeroAddress();
        }
        usdc             = usdc_;
        heraldry         = heraldry_;
        protocolTreasury = protocolTreasury_;
    }

    // ── Guild management ─────────────────────────────────────────────────────

    /// @notice Create a new guild. Caller must be the founder of the underlying pack.
    /// @param name   Human-readable guild name.
    /// @param packId The PackHeraldry pack this guild represents.
    /// @return guildId The newly minted ERC-721 token id.
    function createGuild(string calldata name, bytes32 packId) external returns (uint256 guildId) {
        if (guildCount >= MAX_GUILDS) revert MaxGuildsReached();
        if (IPetHeraldry(heraldry).packFounder(packId) != msg.sender) revert NotPackFounder();

        unchecked { guildId = ++guildCount; }

        guilds[guildId] = Guild({
            name:         name,
            packId:       packId,
            founder:      msg.sender,
            treasuryUsdc: 0,
            memberCount:  0,
            createdAt:    block.timestamp
        });

        _mint(msg.sender, guildId);

        emit GuildCreated(guildId, name, packId, msg.sender);
    }

    /// @notice Pledge a percentage of your vault yield to a guild.
    /// @param guildId Target guild (1-indexed).
    /// @param bps     Pledge in basis points (0 = remove pledge, max 2000 = 20%).
    function pledgeYield(uint256 guildId, uint256 bps) external {
        if (bps > MAX_PLEDGE_BPS) revert BpsExceedsMax();
        if (guildId == 0 || guildId > guildCount) revert InvalidGuildId();

        bool hadPledge = memberGuild[msg.sender] == guildId && pledgeBps[msg.sender] > 0;

        memberGuild[msg.sender] = guildId;
        pledgeBps[msg.sender]   = bps;

        // Increment member count only on the first non-zero pledge to this guild.
        if (bps > 0 && !hadPledge) {
            unchecked { guilds[guildId].memberCount++; }
        }

        emit YieldPledged(msg.sender, guildId, bps);
    }

    /// @notice Sweep a depositor's pledged yield share from a pet vault into the guild treasury.
    /// @param tokenId   Pet tokenId (not guildId).
    /// @param depositor The pet owner whose yield is being swept.
    /// @param usdcVault Address of the IPetVault to query for yield.
    function sweepYield(uint256 tokenId, address depositor, address usdcVault) external {
        uint256 guildId = memberGuild[depositor];
        if (guildId == 0 || pledgeBps[depositor] == 0) revert NoPledge();

        uint256 yield         = IPetVault(usdcVault).yieldForPet(tokenId);
        uint256 pledgeAmount  = yield * pledgeBps[depositor] / 10_000;
        if (pledgeAmount == 0) return;

        IERC20Short(usdc).transferFrom(depositor, address(this), pledgeAmount);

        unchecked {
            guilds[guildId].treasuryUsdc += pledgeAmount;
            totalSwept[guildId]          += pledgeAmount;
        }

        emit YieldSwept(tokenId, depositor, guildId, pledgeAmount);
    }

    /// @notice Withdraw USDC from the guild treasury. Caller must hold the guild ERC-721.
    /// @param guildId   Target guild.
    /// @param amount    Amount of USDC (6-decimal) to withdraw.
    /// @param recipient Destination address.
    function withdrawGuildFunds(uint256 guildId, uint256 amount, address recipient) external {
        if (ownerOf(guildId) != msg.sender) revert NotGuildOwner();
        if (guilds[guildId].treasuryUsdc < amount) revert InsufficientTreasury();

        unchecked { guilds[guildId].treasuryUsdc -= amount; }

        IERC20Short(usdc).transfer(recipient, amount);

        emit FundsWithdrawn(guildId, recipient, amount);
    }

    // ── ERC-721 metadata ─────────────────────────────────────────────────────

    /// @notice Returns an on-chain SVG banner as a data URI.
    function tokenURI(uint256 guildId) public view override returns (string memory) {
        _requireOwned(guildId);

        Guild storage g  = guilds[guildId];
        uint256 swept    = totalSwept[guildId];

        (string memory tierName, string memory tierColor) = _tier(swept);

        string memory svg = _buildSvg(g.name, tierName, tierColor, g.memberCount, g.treasuryUsdc);

        string memory json = string(abi.encodePacked(
            '{"name":"', g.name, ' #', guildId.toString(), '",',
            '"description":"AavePet Guild Banner",',
            '"attributes":[',
                '{"trait_type":"Tier","value":"', tierName, '"},',
                '{"trait_type":"Members","value":', g.memberCount.toString(), '},',
                '{"trait_type":"Total Swept USDC","value":', swept.toString(), '}',
            '],',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    /// @dev Returns tier label and hex color based on total swept USDC.
    function _tier(uint256 swept) internal pure returns (string memory name, string memory color) {
        if (swept >= PLATINUM_THRESHOLD) return ("Platinum", "#e2e8f0");
        if (swept >= GOLD_THRESHOLD)     return ("Gold",     "#fbbf24");
        if (swept >= SILVER_THRESHOLD)   return ("Silver",   "#94a3b8");
        return ("Bronze", "#b45309");
    }

    /// @dev Formats a USDC 6-decimal amount as "X.XX" string (truncated to cents).
    function _formatUsdc(uint256 amount) internal pure returns (string memory) {
        uint256 whole = amount / 1e6;
        uint256 frac  = (amount % 1e6) / 10_000; // two decimal places
        string memory fracStr = frac < 10
            ? string(abi.encodePacked("0", frac.toString()))
            : frac.toString();
        return string(abi.encodePacked(whole.toString(), ".", fracStr));
    }

    /// @dev Build the 400x200 SVG banner.
    function _buildSvg(
        string memory guildName,
        string memory tierName,
        string memory tierColor,
        uint256 memberCount,
        uint256 treasuryUsdc
    ) internal pure returns (string memory) {
        // Shield path: compact pentagon
        string memory shield = string(abi.encodePacked(
            '<polygon points="200,140 185,120 185,105 215,105 215,120" fill="',
            tierColor, '" opacity="0.85"/>'
        ));

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">',
            // Background
            '<rect width="400" height="200" rx="12" fill="#080510"/>',
            // Decorative horizontal lines
            '<line x1="0" y1="40" x2="400" y2="40" stroke="', tierColor, '" stroke-width="1" opacity="0.3"/>',
            '<line x1="0" y1="160" x2="400" y2="160" stroke="', tierColor, '" stroke-width="1" opacity="0.3"/>',
            // Shield icon
            shield,
            // Guild name
            '<text x="200" y="72" text-anchor="middle" font-family="Cinzel, serif" ',
                'font-size="22" font-weight="700" fill="', tierColor, '">', guildName, '</text>',
            // Tier label
            '<text x="200" y="96" text-anchor="middle" font-family="Cinzel, serif" ',
                'font-size="11" letter-spacing="3" fill="', tierColor, '" opacity="0.75">',
                tierName, ' GUILD</text>',
            // Member count
            '<text x="60" y="155" text-anchor="middle" font-family="Cinzel, serif" ',
                'font-size="10" fill="#94a3b8">MEMBERS</text>',
            '<text x="60" y="172" text-anchor="middle" font-family="Cinzel, serif" ',
                'font-size="18" font-weight="700" fill="', tierColor, '">', memberCount.toString(), '</text>',
            // Treasury
            '<text x="340" y="155" text-anchor="middle" font-family="Cinzel, serif" ',
                'font-size="10" fill="#94a3b8">TREASURY</text>',
            '<text x="340" y="172" text-anchor="middle" font-family="Cinzel, serif" ',
                'font-size="13" font-weight="700" fill="', tierColor, '">$', _formatUsdc(treasuryUsdc), '</text>',
            '</svg>'
        ));
    }
}
