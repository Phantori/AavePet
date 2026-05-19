// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Pure library that generates a 40-character runic "secret name" from a pet's 256-bit DNA.
/// Extracts bits 56–255 (200 bits of entropy), takes 40 groups of 5 bits each, and maps each
/// 5-bit value (0-31) to a Unicode rune string. Each rune is 3 bytes in UTF-8, so the output
/// string is 120 bytes.
library CipherRunes {
    /// @notice Generate a 40-rune secret name from a pet's DNA.
    /// @param dna The 256-bit DNA value.
    /// @return The 40-rune string (120 UTF-8 bytes).
    function getRuneName(uint256 dna) internal pure returns (string memory) {
        // Extract bits 56–255: shift right by 56 to discard bits 0-55, leaving 200 bits.
        // We then read 40 groups of 5 bits from the most-significant side of those 200 bits.
        uint256 entropy = dna >> 56;

        // Build the name by concatenating 40 runes.
        // We process groups from the top of the 200-bit window downward.
        // Bit positions within `entropy`: the topmost 5 bits are bits 199-195, etc.
        // We extract group i as: (entropy >> (195 - 5*i)) & 0x1F
        bytes memory result = abi.encodePacked(
            _runeAt(uint8((entropy >> 195) & 0x1F)),
            _runeAt(uint8((entropy >> 190) & 0x1F)),
            _runeAt(uint8((entropy >> 185) & 0x1F)),
            _runeAt(uint8((entropy >> 180) & 0x1F)),
            _runeAt(uint8((entropy >> 175) & 0x1F)),
            _runeAt(uint8((entropy >> 170) & 0x1F)),
            _runeAt(uint8((entropy >> 165) & 0x1F)),
            _runeAt(uint8((entropy >> 160) & 0x1F)),
            _runeAt(uint8((entropy >> 155) & 0x1F)),
            _runeAt(uint8((entropy >> 150) & 0x1F))
        );
        result = abi.encodePacked(
            result,
            _runeAt(uint8((entropy >> 145) & 0x1F)),
            _runeAt(uint8((entropy >> 140) & 0x1F)),
            _runeAt(uint8((entropy >> 135) & 0x1F)),
            _runeAt(uint8((entropy >> 130) & 0x1F)),
            _runeAt(uint8((entropy >> 125) & 0x1F)),
            _runeAt(uint8((entropy >> 120) & 0x1F)),
            _runeAt(uint8((entropy >> 115) & 0x1F)),
            _runeAt(uint8((entropy >> 110) & 0x1F)),
            _runeAt(uint8((entropy >> 105) & 0x1F)),
            _runeAt(uint8((entropy >> 100) & 0x1F))
        );
        result = abi.encodePacked(
            result,
            _runeAt(uint8((entropy >>  95) & 0x1F)),
            _runeAt(uint8((entropy >>  90) & 0x1F)),
            _runeAt(uint8((entropy >>  85) & 0x1F)),
            _runeAt(uint8((entropy >>  80) & 0x1F)),
            _runeAt(uint8((entropy >>  75) & 0x1F)),
            _runeAt(uint8((entropy >>  70) & 0x1F)),
            _runeAt(uint8((entropy >>  65) & 0x1F)),
            _runeAt(uint8((entropy >>  60) & 0x1F)),
            _runeAt(uint8((entropy >>  55) & 0x1F)),
            _runeAt(uint8((entropy >>  50) & 0x1F))
        );
        result = abi.encodePacked(
            result,
            _runeAt(uint8((entropy >>  45) & 0x1F)),
            _runeAt(uint8((entropy >>  40) & 0x1F)),
            _runeAt(uint8((entropy >>  35) & 0x1F)),
            _runeAt(uint8((entropy >>  30) & 0x1F)),
            _runeAt(uint8((entropy >>  25) & 0x1F)),
            _runeAt(uint8((entropy >>  20) & 0x1F)),
            _runeAt(uint8((entropy >>  15) & 0x1F)),
            _runeAt(uint8((entropy >>  10) & 0x1F)),
            _runeAt(uint8((entropy >>   5) & 0x1F)),
            _runeAt(uint8( entropy         & 0x1F))
        );

        return string(result);
    }

    /// @dev Map a 5-bit index (0–31) to its Unicode rune string.
    function _runeAt(uint8 idx) private pure returns (string memory) {
        if (idx == 0)  return unicode"ᚠ";
        if (idx == 1)  return unicode"ᚢ";
        if (idx == 2)  return unicode"ᚦ";
        if (idx == 3)  return unicode"ᚨ";
        if (idx == 4)  return unicode"ᚱ";
        if (idx == 5)  return unicode"ᚲ";
        if (idx == 6)  return unicode"ᚷ";
        if (idx == 7)  return unicode"ᚹ";
        if (idx == 8)  return unicode"ᚺ";
        if (idx == 9)  return unicode"ᚾ";
        if (idx == 10) return unicode"ᛁ";
        if (idx == 11) return unicode"ᛃ";
        if (idx == 12) return unicode"ᛇ";
        if (idx == 13) return unicode"ᛈ";
        if (idx == 14) return unicode"ᛉ";
        if (idx == 15) return unicode"ᛊ";
        if (idx == 16) return unicode"ᛏ";
        if (idx == 17) return unicode"ᛒ";
        if (idx == 18) return unicode"ᛖ";
        if (idx == 19) return unicode"ᛗ";
        if (idx == 20) return unicode"ᛚ";
        if (idx == 21) return unicode"ᛜ";
        if (idx == 22) return unicode"ᛞ";
        if (idx == 23) return unicode"ᛟ";
        if (idx == 24) return unicode"✦";
        if (idx == 25) return unicode"⚡";
        if (idx == 26) return unicode"♥";
        if (idx == 27) return unicode"★";
        if (idx == 28) return unicode"♛";
        if (idx == 29) return unicode"◈";
        if (idx == 30) return unicode"ᛝ";
        // idx == 31
        return unicode"ᛣ";
    }
}
