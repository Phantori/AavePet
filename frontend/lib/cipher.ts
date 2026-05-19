// TypeScript mirror of CipherRunes.sol — derives a pet's 40-rune secret name from DNA.

// 32-symbol BioSpark runic alphabet (Elder Futhark + BioSpark specials)
const RUNES: string[] = [
  "ᚠ","ᚢ","ᚦ","ᚨ","ᚱ","ᚲ","ᚷ","ᚹ",   // 0–7
  "ᚺ","ᚾ","ᛁ","ᛃ","ᛇ","ᛈ","ᛉ","ᛊ",   // 8–15
  "ᛏ","ᛒ","ᛖ","ᛗ","ᛚ","ᛜ","ᛞ","ᛟ",   // 16–23
  "✦","⚡","♥","★","♛","◈","ᛝ","ᛣ",   // 24–31  BioSpark specials
];

export function getRuneName(dna: bigint): string {
  const shifted = dna >> 56n;           // bits 56–255
  let name = "";
  for (let i = 0; i < 40; i++) {
    const idx = Number((shifted >> BigInt(i * 5)) & 0x1fn); // 5-bit group
    name += RUNES[idx];
  }
  return name;
}

export interface RuneGroup {
  rune: string;
  idx: number;
  bits: string;  // 5-bit binary representation
}

export function getRuneGroups(dna: bigint): RuneGroup[] {
  const shifted = dna >> 56n;
  return Array.from({ length: 40 }, (_, i) => {
    const idx = Number((shifted >> BigInt(i * 5)) & 0x1fn);
    return {
      rune: RUNES[idx],
      idx,
      bits: idx.toString(2).padStart(5, "0"),
    };
  });
}

export function runeDescription(rune: string): string {
  const map: Record<string, string> = {
    "ᚠ": "Fehu – wealth & abundance",
    "ᚢ": "Uruz – primal strength",
    "ᚦ": "Thurisaz – protection",
    "ᚨ": "Ansuz – divine wisdom",
    "ᚱ": "Raidho – journey",
    "ᚲ": "Kenaz – creativity",
    "ᚷ": "Gebo – generosity",
    "ᚹ": "Wunjo – joy",
    "ᚺ": "Hagalaz – transformation",
    "ᚾ": "Nauthiz – necessity",
    "ᛁ": "Isa – stillness",
    "ᛃ": "Jera – harvest",
    "ᛇ": "Eihwaz – endurance",
    "ᛈ": "Pertho – fate",
    "ᛉ": "Algiz – guardian",
    "ᛊ": "Sowilo – victory",
    "ᛏ": "Tiwaz – honor",
    "ᛒ": "Berkano – growth",
    "ᛖ": "Ehwaz – trust",
    "ᛗ": "Mannaz – community",
    "ᛚ": "Laguz – flow",
    "ᛜ": "Ingwaz – potential",
    "ᛞ": "Dagaz – awakening",
    "ᛟ": "Othalan – heritage",
    "✦": "BioSpark – cosmic spark",
    "⚡": "Lightning – DeFi power",
    "♥": "Heart – devotion",
    "★": "Star – achievement",
    "♛": "Crown – sovereignty",
    "◈": "Cipher – mystery",
    "ᛝ": "Iwaz – wisdom cycle",
    "ᛣ": "Calc – fate calculus",
  };
  return map[rune] ?? "Unknown";
}
