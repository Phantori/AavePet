// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {BioSparkDNA} from "./BioSparkDNA.sol";

/// @notice Generates on-chain BioSpark-styled SVG Coat of Arms (320×380, static).
library HeraldryRenderer {
    using Strings for uint256;
    using Strings for uint8;

    // ── Shield tier thresholds (USDC, 6 decimals) ─────────────────────────────
    uint256 internal constant TIER_SILVER   = 100   * 1e6;
    uint256 internal constant TIER_GOLD     = 1_000  * 1e6;
    uint256 internal constant TIER_PLATINUM = 10_000 * 1e6;

    // ── Charge bitmask ────────────────────────────────────────────────────────
    uint256 internal constant CHARGE_CREDIT    = 1 << 0;
    uint256 internal constant CHARGE_SAVINGS   = 1 << 1;
    uint256 internal constant CHARGE_YIELD     = 1 << 2;
    uint256 internal constant CHARGE_SOVEREIGN = 1 << 3;
    uint256 internal constant CHARGE_PACK      = 1 << 4;

    struct HeraldryInput {
        uint256 dna;
        uint256 charges;
        uint256 usdcSaved;
        string  petName;
        uint256 tokenId;
    }

    // ─────────────────────────────────────────────────────────────────────────

    function buildTokenURI(HeraldryInput memory h) internal pure returns (string memory) {
        BioSparkDNA.Traits memory t = BioSparkDNA.decode(h.dna);
        string memory svg = buildSVG(h, t);
        string memory tier = _tier(h.usdcSaved);

        string memory json = string(abi.encodePacked(
            '{"name":"Heraldry of ', _escape(h.petName), ' #', h.tokenId.toString(), '",'
            '"description":"On-chain BioSpark Coat of Arms",'
            '"attributes":['
                '{"trait_type":"Species","value":"',      t.species,   '"},'
                '{"trait_type":"Generation","value":"Gen', uint256(t.generation).toString(), '"},'
                '{"trait_type":"Senior Risk","value":"',  t.riskLabel, '"},'
                '{"trait_type":"DeFi Resonance","value":"', t.resonanceLabel, '"},'
                '{"trait_type":"Vitality","value":',      uint256(t.vitality).toString(),     '},'
                '{"trait_type":"Intelligence","value":',  uint256(t.intelligence).toString(), '},'
                '{"trait_type":"Loyalty","value":',       uint256(t.loyalty).toString(),      '},'
                '{"trait_type":"Shield Tier","value":"',  tier, '"}'
            '],'
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function buildSVG(HeraldryInput memory h, BioSparkDNA.Traits memory t) internal pure returns (string memory) {
        string memory sc  = _shieldColor(h.usdcSaved);   // tier accent color
        string memory bg  = _bgColor(h.usdcSaved);        // dark tinted bg
        string memory glyph = _speciesGlyph(t.speciesRaw);
        string memory tier  = _tier(h.usdcSaved);

        // Split into parts to avoid Solidity stack-too-deep
        string memory part1 = _svgHead(bg, sc);
        string memory part2 = _svgShield(sc, glyph);
        string memory part3 = _svgBottom(h, sc, tier, t);

        return string(abi.encodePacked(part1, part2, part3));
    }

    // ── SVG sections ──────────────────────────────────────────────────────────

    function _svgHead(string memory bg, string memory sc) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="380" viewBox="0 0 320 380">',
            '<defs>',
              '<radialGradient id="bg" cx="50%" cy="35%" r="70%">',
                '<stop offset="0%" stop-color="', bg, '"/>',
                '<stop offset="100%" stop-color="#090910"/>',
              '</radialGradient>',
              '<radialGradient id="vig" cx="50%" cy="50%" r="65%">',
                '<stop offset="0%" stop-color="transparent" stop-opacity="0"/>',
                '<stop offset="100%" stop-color="#090910" stop-opacity="0.75"/>',
              '</radialGradient>',
              '<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">',
                '<path d="M 20 0 L 0 0 0 20" fill="none" stroke="', sc,
                  '" stroke-width="0.3" opacity="0.12"/>',
              '</pattern>',
              '<filter id="glow">',
                '<feGaussianBlur stdDeviation="2.5" result="b"/>',
                '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>',
              '</filter>',
            '</defs>',
            '<rect width="320" height="380" fill="url(#bg)"/>',
            '<rect width="320" height="380" fill="url(#grid)"/>',
            // Ambient glow blob top-center
            '<ellipse cx="160" cy="55" rx="110" ry="60" fill="', sc, '" fill-opacity="0.07"/>'
        ));
    }

    function _svgShield(string memory sc, string memory glyph) private pure returns (string memory) {
        return string(abi.encodePacked(
            // Outer glow ring
            '<circle cx="160" cy="172" r="148" fill="none" stroke="', sc,
              '" stroke-width="1.5" opacity="0.15"/>',
            '<circle cx="160" cy="172" r="140" fill="none" stroke="', sc,
              '" stroke-width="0.5" opacity="0.08"/>',
            // Shield fill
            '<path d="M160,52 L252,88 L252,176 Q252,248 160,294 Q68,248 68,176 L68,88 Z"'
              ' fill="', sc, '" fill-opacity="0.07"'
              ' stroke="', sc, '" stroke-width="2.5" filter="url(#glow)"/>',
            // Inner shield detail
            '<path d="M160,68 L238,100 L238,175 Q238,237 160,278 Q82,237 82,175 L82,100 Z"'
              ' fill="none" stroke="', sc, '" stroke-width="0.6" opacity="0.25"/>',
            // Center division line (faint)
            '<line x1="160" y1="68" x2="160" y2="278" stroke="', sc,
              '" stroke-width="0.5" opacity="0.12"/>',
            // Species glyph
            '<text x="160" y="192" text-anchor="middle" font-size="72"'
              ' filter="url(#glow)">', glyph, '</text>'
        ));
    }

    function _svgBottom(
        HeraldryInput memory h,
        string memory sc,
        string memory tier,
        BioSparkDNA.Traits memory t
    ) private pure returns (string memory) {
        string memory charges = _chargeRow(h.charges);
        string memory dnaStr  = _dnaSnippet(h.dna);

        return string(abi.encodePacked(
            // Tier banner
            '<rect x="70" y="240" width="180" height="24" rx="4" fill="', sc, '" fill-opacity="0.12"/>',
            '<text x="160" y="257" text-anchor="middle" font-size="10" fill="', sc,
              '" font-family="monospace" letter-spacing="4">', tier, '</text>',
            // Charge badges
            charges,
            // Vignette on top of content (lens effect)
            '<rect width="320" height="380" fill="url(#vig)"/>',
            // DNA strip
            '<text x="160" y="334" text-anchor="middle" font-size="6" fill="', sc,
              '" fill-opacity="0.45" font-family="monospace">', dnaStr, '</text>',
            // Token ID
            '<text x="160" y="347" text-anchor="middle" font-size="8" fill="#ffffff"'
              ' fill-opacity="0.28" font-family="monospace">TOKEN #', h.tokenId.toString(), '</text>',
            // Stats
            '<text x="160" y="364" text-anchor="middle" font-size="7.5" fill="#94a3b8"'
              ' font-family="monospace">',
              'VIT:', uint256(t.vitality).toString(),
              '  INT:', uint256(t.intelligence).toString(),
              '  LOY:', uint256(t.loyalty).toString(),
            '</text>',
            '</svg>'
        ));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function _chargeRow(uint256 charges) private pure returns (string memory) {
        string memory out = "";
        uint256 x = 108;
        if (charges & CHARGE_CREDIT    != 0) { out = string(abi.encodePacked(out, _badge(x, unicode"⚡", "#f59e0b"))); x += 30; }
        if (charges & CHARGE_SAVINGS   != 0) { out = string(abi.encodePacked(out, _badge(x, unicode"♥",  "#ef4444"))); x += 30; }
        if (charges & CHARGE_YIELD     != 0) { out = string(abi.encodePacked(out, _badge(x, unicode"★",  "#22c55e"))); x += 30; }
        if (charges & CHARGE_SOVEREIGN != 0) { out = string(abi.encodePacked(out, _badge(x, unicode"♛",  "#a855f7"))); x += 30; }
        if (charges & CHARGE_PACK      != 0) { out = string(abi.encodePacked(out, _badge(x, unicode"✦",  "#06b6d4"))); }
        return out;
    }

    function _badge(uint256 x, string memory glyph, string memory color) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<circle cx="', x.toString(), '" cy="302" r="10"'
              ' fill="', color, '" fill-opacity="0.18"/>',
            '<text x="', x.toString(), '" cy="302" y="307"'
              ' text-anchor="middle" font-size="12" fill="', color, '">', glyph, '</text>'
        ));
    }

    function _tier(uint256 u) private pure returns (string memory) {
        if (u >= TIER_PLATINUM) return "PLATINUM";
        if (u >= TIER_GOLD)     return "GOLD";
        if (u >= TIER_SILVER)   return "SILVER";
        return "BRONZE";
    }

    function _shieldColor(uint256 u) private pure returns (string memory) {
        if (u >= TIER_PLATINUM) return "#e2e8f0";
        if (u >= TIER_GOLD)     return "#fbbf24";
        if (u >= TIER_SILVER)   return "#94a3b8";
        return "#b45309";
    }

    function _bgColor(uint256 u) private pure returns (string memory) {
        if (u >= TIER_PLATINUM) return "#0a0820";
        if (u >= TIER_GOLD)     return "#080500";
        if (u >= TIER_SILVER)   return "#060810";
        return "#080400";
    }

    function _speciesGlyph(uint8 raw) private pure returns (string memory) {
        if (raw <= 85)  return unicode"🐕";
        if (raw <= 170) return unicode"🐈";
        return unicode"🐎";
    }

    function _dnaSnippet(uint256 dna) private pure returns (string memory) {
        bytes memory bits = new bytes(40);
        for (uint256 i = 0; i < 40; i++) {
            bits[i] = (dna >> i) & 1 == 1 ? bytes1("1") : bytes1("0");
        }
        return string(bits);
    }

    function _escape(string memory s) private pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory out = new bytes(b.length);
        for (uint256 i = 0; i < b.length; i++) {
            out[i] = b[i] == '"' ? bytes1("'") : b[i];
        }
        return string(out);
    }
}
