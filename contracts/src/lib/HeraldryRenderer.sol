// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {BioSparkDNA} from "./BioSparkDNA.sol";

/// @notice Generates on-chain SVG Coat of Arms for each pet NFT.
library HeraldryRenderer {
    using Strings for uint256;
    using Strings for uint8;

    // ── Shield tier thresholds (USDC saved, 6 decimals) ──────────────────────
    uint256 internal constant TIER_SILVER   = 100   * 1e6;
    uint256 internal constant TIER_GOLD     = 1_000  * 1e6;
    uint256 internal constant TIER_PLATINUM = 10_000 * 1e6;

    // ── Charge bitmask ────────────────────────────────────────────────────────
    uint256 internal constant CHARGE_CREDIT    = 1 << 0; // ⚡ ever borrowed
    uint256 internal constant CHARGE_SAVINGS   = 1 << 1; // ♥ vault deposit
    uint256 internal constant CHARGE_YIELD     = 1 << 2; // ★ yield earned
    uint256 internal constant CHARGE_SOVEREIGN = 1 << 3; // ♛ vault sovereign (10k+ USDC)
    uint256 internal constant CHARGE_PACK      = 1 << 4; // ✦ pack founder

    struct HeraldryInput {
        uint256 dna;
        uint256 charges;       // bitmask from PetHeraldry
        uint256 usdcSaved;     // raw USDC units (6 dec)
        string  petName;
        uint256 tokenId;
    }

    // ─────────────────────────────────────────────────────────────────────────

    function buildTokenURI(HeraldryInput memory h) internal pure returns (string memory) {
        BioSparkDNA.Traits memory t = BioSparkDNA.decode(h.dna);
        string memory svg = buildSVG(h, t);
        string memory tier = _tier(h.usdcSaved);

        string memory json = string(abi.encodePacked(
            '{"name":"Heraldry of ',  _escape(h.petName), ' #', h.tokenId.toString(), '",'
            '"description":"On-chain BioSpark Coat of Arms",'
            '"attributes":['
                '{"trait_type":"Species","value":"', t.species, '"},'
                '{"trait_type":"Generation","value":"Gen', uint256(t.generation).toString(), '"},'
                '{"trait_type":"Senior Risk","value":"', t.riskLabel, '"},'
                '{"trait_type":"DeFi Resonance","value":"', t.resonanceLabel, '"},'
                '{"trait_type":"Vitality","value":', uint256(t.vitality).toString(), '},'
                '{"trait_type":"Intelligence","value":', uint256(t.intelligence).toString(), '},'
                '{"trait_type":"Loyalty","value":', uint256(t.loyalty).toString(), '},'
                '{"trait_type":"Shield Tier","value":"', tier, '"}'
            '],'
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }

    function buildSVG(HeraldryInput memory h, BioSparkDNA.Traits memory t) internal pure returns (string memory) {
        string memory shieldColor = _shieldColor(h.usdcSaved);
        string memory speciesGlyph = _speciesGlyph(t.speciesRaw);
        string memory chargeRow = _chargeRow(h.charges);
        string memory tier = _tier(h.usdcSaved);
        string memory dnaSnippet = _dnaSnippet(h.dna);

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">',
            '<defs>',
              '<radialGradient id="bg" cx="50%" cy="40%" r="70%">',
                '<stop offset="0%" stop-color="#1a1a2e"/>',
                '<stop offset="100%" stop-color="#0d0d1a"/>',
              '</radialGradient>',
              '<filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/>',
                '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>',
              '</filter>',
            '</defs>',
            '<rect width="400" height="500" fill="url(#bg)"/>',
            // Outer ring
            '<circle cx="200" cy="200" r="155" fill="none" stroke="', shieldColor, '" stroke-width="2" opacity="0.4"/>',
            '<circle cx="200" cy="200" r="148" fill="none" stroke="', shieldColor, '" stroke-width="0.5" opacity="0.2"/>',
            // Shield body
            _shield(shieldColor),
            // Species glyph
            '<text x="200" y="215" text-anchor="middle" font-size="72" filter="url(#glow)">', speciesGlyph, '</text>',
            // Tier banner
            '<rect x="100" y="305" width="200" height="28" rx="4" fill="', shieldColor, '" opacity="0.15"/>',
            '<text x="200" y="324" text-anchor="middle" font-size="13" fill="', shieldColor,
                '" font-family="monospace" letter-spacing="3">', tier, '</text>',
            // Charge badges row
            chargeRow,
            // DNA strip
            '<text x="200" y="430" text-anchor="middle" font-size="7" fill="#4a9eff" opacity="0.6"',
                ' font-family="monospace">', dnaSnippet, '</text>',
            // Token id
            '<text x="200" y="448" text-anchor="middle" font-size="9" fill="#ffffff" opacity="0.35"',
                ' font-family="monospace">TOKEN #', h.tokenId.toString(), '</text>',
            // Stats row
            _statsRow(t),
            '</svg>'
        ));
    }

    // ── Internal SVG parts ───────────────────────────────────────────────────

    function _shield(string memory color) private pure returns (string memory) {
        // Classic heater shield shape via path
        return string(abi.encodePacked(
            '<path d="M200,80 L310,120 L310,230 Q310,310 200,360 Q90,310 90,230 L90,120 Z"'
            ' fill="', color, '" fill-opacity="0.08" stroke="', color,
            '" stroke-width="2.5" filter="url(#glow)"/>'
        ));
    }

    function _speciesGlyph(uint8 raw) private pure returns (string memory) {
        if (raw <= 85)  return unicode"🐕";
        if (raw <= 170) return unicode"🐈";
        return unicode"🐎";
    }

    function _chargeRow(uint256 charges) private pure returns (string memory) {
        string memory badges = "";
        uint256 x = 140;
        if (charges & CHARGE_CREDIT    != 0) { badges = string(abi.encodePacked(badges, _badge(x, unicode"⚡", "#f59e0b")));  x += 30; }
        if (charges & CHARGE_SAVINGS   != 0) { badges = string(abi.encodePacked(badges, _badge(x, unicode"♥",  "#ef4444"))); x += 30; }
        if (charges & CHARGE_YIELD     != 0) { badges = string(abi.encodePacked(badges, _badge(x, unicode"★",  "#22c55e"))); x += 30; }
        if (charges & CHARGE_SOVEREIGN != 0) { badges = string(abi.encodePacked(badges, _badge(x, unicode"♛",  "#a855f7"))); x += 30; }
        if (charges & CHARGE_PACK      != 0) { badges = string(abi.encodePacked(badges, _badge(x, unicode"✦",  "#06b6d4"))); }
        return badges;
    }

    function _badge(uint256 x, string memory glyph, string memory color) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<circle cx="', x.toString(), '" cy="382" r="11" fill="', color, '" fill-opacity="0.2"/>',
            '<text x="', x.toString(), '" y="387" text-anchor="middle" font-size="13" fill="', color, '">', glyph, '</text>'
        ));
    }

    function _statsRow(BioSparkDNA.Traits memory t) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<text x="200" y="468" text-anchor="middle" font-size="8" fill="#94a3b8" font-family="monospace">',
            'VIT:', uint256(t.vitality).toString(),
            '  INT:', uint256(t.intelligence).toString(),
            '  LOY:', uint256(t.loyalty).toString(),
            '</text>'
        ));
    }

    function _tier(uint256 usdcSaved) private pure returns (string memory) {
        if (usdcSaved >= TIER_PLATINUM) return "PLATINUM";
        if (usdcSaved >= TIER_GOLD)     return "GOLD";
        if (usdcSaved >= TIER_SILVER)   return "SILVER";
        return "BRONZE";
    }

    function _shieldColor(uint256 usdcSaved) private pure returns (string memory) {
        if (usdcSaved >= TIER_PLATINUM) return "#e2e8f0"; // platinum/white
        if (usdcSaved >= TIER_GOLD)     return "#fbbf24"; // gold
        if (usdcSaved >= TIER_SILVER)   return "#94a3b8"; // silver
        return "#b45309"; // bronze
    }

    function _dnaSnippet(uint256 dna) private pure returns (string memory) {
        // Show first 40 bits as binary for visual flair
        bytes memory bits = new bytes(40);
        for (uint256 i = 0; i < 40; i++) {
            bits[i] = (dna >> i) & 1 == 1 ? bytes1("1") : bytes1("0");
        }
        return string(bits);
    }

    function _escape(string memory s) private pure returns (string memory) {
        // Minimal JSON escape: replace " with '
        bytes memory b = bytes(s);
        bytes memory out = new bytes(b.length);
        for (uint256 i = 0; i < b.length; i++) {
            out[i] = b[i] == '"' ? bytes1("'") : b[i];
        }
        return string(out);
    }
}
