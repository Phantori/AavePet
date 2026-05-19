// Mirror of BioSparkDNA.sol — decodes a uint256 DNA value into typed traits.

export interface DNATraits {
  speciesRaw: number;
  generationRaw: number;
  seniorRisk: number;
  defiResonance: number;
  vitality: number;
  intelligence: number;
  loyalty: number;
  // Derived labels
  species: "Canine" | "Feline" | "Equine";
  generation: 1 | 2 | 3 | 4;
  riskLabel: "Low" | "Medium" | "High";
  resonanceLabel: "USDC" | "WETH";
}

function byte(dna: bigint, shift: number): number {
  return Number((dna >> BigInt(shift)) & 0xffn);
}

export function decodeDNA(dna: bigint): DNATraits {
  const speciesRaw     = byte(dna, 0);
  const generationRaw  = byte(dna, 8);
  const seniorRisk     = byte(dna, 16);
  const defiResonance  = byte(dna, 24);
  const vitality       = byte(dna, 32);
  const intelligence   = byte(dna, 40);
  const loyalty        = byte(dna, 48);

  const species: DNATraits["species"] =
    speciesRaw <= 85 ? "Canine" : speciesRaw <= 170 ? "Feline" : "Equine";

  const generation: DNATraits["generation"] =
    generationRaw <= 63 ? 1 : generationRaw <= 127 ? 2 : generationRaw <= 191 ? 3 : 4;

  const riskLabel: DNATraits["riskLabel"] =
    seniorRisk <= 85 ? "Low" : seniorRisk <= 170 ? "Medium" : "High";

  const resonanceLabel: DNATraits["resonanceLabel"] =
    defiResonance < 128 ? "USDC" : "WETH";

  return {
    speciesRaw, generationRaw, seniorRisk, defiResonance,
    vitality, intelligence, loyalty,
    species, generation, riskLabel, resonanceLabel,
  };
}

export function binaryArt(dna: bigint, length = 200): string {
  const shifted = dna >> 56n;
  let art = "";
  for (let i = 0; i < length; i++) {
    art += (shifted >> BigInt(i)) & 1n ? "1" : "0";
  }
  return art;
}

export function dnaToHex(dna: bigint): string {
  return "0x" + dna.toString(16).padStart(64, "0");
}
