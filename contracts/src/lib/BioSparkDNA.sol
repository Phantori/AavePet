// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Pure library for AavePet 256-bit BioSpark DNA.
/// Bit layout (LSB → MSB):
///   [0:7]   species      0-85=Canine  86-170=Feline  171-255=Equine
///   [8:15]  generation   0-63=Gen1  64-127=Gen2  128-191=Gen3  192-255=Gen4
///   [16:23] seniorRisk   0-85=Low  86-170=Medium  171-255=High
///   [24:31] defiResonance 0-127=USDC-affinity  128-255=WETH-affinity
///   [32:39] vitality     raw 0-255
///   [40:47] intelligence raw 0-255
///   [48:55] loyalty      raw 0-255
///   [56:255] entropic noise (random filler, read as binary art)
library BioSparkDNA {
    uint256 private constant MASK8 = 0xFF;

    struct Traits {
        uint8 speciesRaw;       // raw 0-255
        uint8 generationRaw;
        uint8 seniorRisk;       // raw 0-255
        uint8 defiResonance;    // raw 0-255
        uint8 vitality;
        uint8 intelligence;
        uint8 loyalty;
        // Decoded labels
        string species;         // "Canine" | "Feline" | "Equine"
        uint8  generation;      // 1-4
        string riskLabel;       // "Low" | "Medium" | "High"
        string resonanceLabel;  // "USDC" | "WETH"
    }

    /// @notice Generate deterministic DNA from on-chain entropy.
    function generate(uint256 tokenId, address minter) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            minter,
            tokenId
        )));
    }

    /// @notice Decode raw DNA into a human-readable Traits struct.
    function decode(uint256 dna) internal pure returns (Traits memory t) {
        t.speciesRaw     = uint8(dna & MASK8);
        t.generationRaw  = uint8((dna >> 8) & MASK8);
        t.seniorRisk     = uint8((dna >> 16) & MASK8);
        t.defiResonance  = uint8((dna >> 24) & MASK8);
        t.vitality       = uint8((dna >> 32) & MASK8);
        t.intelligence   = uint8((dna >> 40) & MASK8);
        t.loyalty        = uint8((dna >> 48) & MASK8);

        // Species
        if (t.speciesRaw <= 85)       t.species = "Canine";
        else if (t.speciesRaw <= 170)  t.species = "Feline";
        else                           t.species = "Equine";

        // Generation
        if (t.generationRaw <= 63)      t.generation = 1;
        else if (t.generationRaw <= 127) t.generation = 2;
        else if (t.generationRaw <= 191) t.generation = 3;
        else                             t.generation = 4;

        // Senior risk
        if (t.seniorRisk <= 85)        t.riskLabel = "Low";
        else if (t.seniorRisk <= 170)  t.riskLabel = "Medium";
        else                           t.riskLabel = "High";

        // DeFi resonance
        t.resonanceLabel = t.defiResonance < 128 ? "USDC" : "WETH";
    }

    /// @notice Return the 200-character binary art string (bits 56-255).
    function binaryArt(uint256 dna) internal pure returns (string memory) {
        bytes memory art = new bytes(200);
        uint256 shifted = dna >> 56;
        for (uint256 i = 0; i < 200; i++) {
            art[i] = (shifted >> i) & 1 == 1 ? bytes1("1") : bytes1("0");
        }
        return string(art);
    }
}
