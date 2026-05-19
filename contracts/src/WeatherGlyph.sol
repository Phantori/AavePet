// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Owner-declared climate zone + season overrides for L4 Environmental Glyphs.
/// Privacy-preserving: owners self-declare their zone; no on-chain geo-tracking.
/// The frontend reads this + UTC month to derive ambient theme for HeraldryDisplay.
contract WeatherGlyph is Ownable {

    // ── Climate zones ─────────────────────────────────────────────────────────
    // 0 = Unset, 1 = Temperate, 2 = Tropical, 3 = Arid, 4 = Arctic, 5 = Oceanic
    uint8 public constant ZONE_UNSET     = 0;
    uint8 public constant ZONE_TEMPERATE = 1;
    uint8 public constant ZONE_TROPICAL  = 2;
    uint8 public constant ZONE_ARID      = 3;
    uint8 public constant ZONE_ARCTIC    = 4;
    uint8 public constant ZONE_OCEANIC   = 5;

    // ── Hemisphere ────────────────────────────────────────────────────────────
    // 0 = Northern (default), 1 = Southern
    uint8 public constant HEMI_NORTH = 0;
    uint8 public constant HEMI_SOUTH = 1;

    // ── Storage ───────────────────────────────────────────────────────────────

    struct GlyphConfig {
        uint8 zone;        // climate zone (0–5)
        uint8 hemisphere;  // 0=North, 1=South
        bool  set;
    }

    mapping(address => GlyphConfig) public configs;

    // ── Events ────────────────────────────────────────────────────────────────

    event GlyphConfigured(address indexed owner, uint8 zone, uint8 hemisphere);

    // ── Errors ────────────────────────────────────────────────────────────────

    error InvalidZone();
    error InvalidHemisphere();

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ── Functions ─────────────────────────────────────────────────────────────

    /// @notice Owner sets their climate zone and hemisphere.
    function configure(uint8 zone, uint8 hemisphere) external {
        if (zone > ZONE_OCEANIC)      revert InvalidZone();
        if (hemisphere > HEMI_SOUTH)  revert InvalidHemisphere();
        configs[msg.sender] = GlyphConfig({ zone: zone, hemisphere: hemisphere, set: true });
        emit GlyphConfigured(msg.sender, zone, hemisphere);
    }

    /// @notice Returns a 4-element packed config: [zone, hemisphere, isSet, reserved].
    function getConfig(address owner) external view returns (uint8 zone, uint8 hemisphere, bool isSet) {
        GlyphConfig memory c = configs[owner];
        return (c.zone, c.hemisphere, c.set);
    }

    /// @notice Helper for frontend: derive current season (0=Spring 1=Summer 2=Autumn 3=Winter)
    ///         given UTC month (1–12) and hemisphere (0=North 1=South).
    ///         Not stored on-chain — call as a pure view to avoid oracle cost.
    function currentSeason(uint8 utcMonth, uint8 hemisphere) external pure returns (uint8) {
        // Northern hemisphere seasons:  Mar-May=0(Spring), Jun-Aug=1(Summer), Sep-Nov=2(Autumn), Dec-Feb=3(Winter)
        // Southern hemisphere: inverted
        uint8 northSeason;
        if (utcMonth >= 3 && utcMonth <= 5)        northSeason = 0; // Spring
        else if (utcMonth >= 6 && utcMonth <= 8)   northSeason = 1; // Summer
        else if (utcMonth >= 9 && utcMonth <= 11)  northSeason = 2; // Autumn
        else                                        northSeason = 3; // Winter

        return hemisphere == HEMI_SOUTH ? (northSeason + 2) % 4 : northSeason;
    }
}
