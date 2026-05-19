![Dogo4x4.jpg](https://github.com/Phantori/AavePet/blob/main/Dogo4x4.jpg?raw=true)

# AavePet

**DeFi-powered pet care on Base — ERC-721 pet NFTs backed by Aave v3 yield, cinematic on-chain heraldry, and a full physical-digital ecosystem for real-world adventurers.**

> Built on Base mainnet · Solidity 0.8.24 · OpenZeppelin v5 · Next.js 14 · wagmi v2

---

## What is AavePet?

AavePet turns your pet into a living on-chain entity. Each pet is an ERC-721 NFT with immutable 256-bit BioSpark DNA, a procedural Coat of Arms that evolves with DeFi milestones, and a suite of financial tools — savings vaults, credit lines, guardian access, and more — all powered by Aave v3 yield on Base.

The project bridges digital DeFi and real-world pet care: from on-trail portable sanctuaries to lineage inheritance for future pets.

---

## Smart Contracts

### Core

| Contract | Description |
|---|---|
| `APTToken` | ERC-20 native token (APT) used for marketplace pricing |
| `PetNFT` | ERC-721 pet NFTs with EIP-2981 royalties and BioSpark DNA |
| `PetMarketplace` | On-chain pet trading with royalty enforcement |
| `PetVault` | Aave v3 yield vaults (USDC + WETH) per pet |
| `PetCreditLine` | Aave v3 variable-rate credit delegation backed by vault balance |
| `ServiceMarketplace` | ERC-1155 vouchers + milestone-release service agreements |

### Identity & Heraldry (L2 Crest)

| Contract | Description |
|---|---|
| `PetHeraldry` | Procedural Coat of Arms SVG — tier, species glyph, charge badges, pack system |
| `GenesisCapsule` | ERC-1155 ancestor capsules minted on rainbow bridge archive |

### Security & Access

| Contract | Description |
|---|---|
| `PetGuardian` | 2-of-3 dead man's switch emergency access with inactivity period |
| `PetRecords` | Encrypted IPFS health records with vet access control lists |
| `RainbowBridge` | Eternal on-chain memorial; archives pet and mints GenesisCapsule |

### Architectural Expansions

| Contract | Layer | Description |
|---|---|---|
| `PackTreasury` | L1 Seal | Aave v3 mutual-aid DAO with emergency claims, pack-gated |
| `GuildCrest` | L2 Crest | ERC-721 guild banners (max 16); cooperative yield-pledge; evolving SVG tiers |
| `StasisPod` | L3 Device | ERC721Receiver; freeze wellness decay 7 days–2 years; 10% preservation fee |
| `WeatherGlyph` | L4 Glyph | Privacy-preserving self-declared climate oracle; 6 zones × 2 hemispheres |
| `MerchantGlyph` | L4 Glyph | Aegis Rover portable kiosk system; on-trail hospitality badges; wholesale inventory |

### BioSpark DNA Libraries

| Library | Description |
|---|---|
| `lib/BioSparkDNA.sol` | 256-bit DNA generation (keccak256 entropy) and trait decoding |
| `lib/HeraldryRenderer.sol` | On-chain SVG Coat of Arms with grid, glow, vignette layers |
| `lib/CipherRunes.sol` | 40-rune Elder Futhark + BioSpark cipher name from DNA entropy bits |

---

## DNA & Heraldry System

Every pet gets an immutable 256-bit DNA string at mint:

```
Bits  0–7:   species       Bits  8–15:  generation
Bits 16–23:  seniorRisk    Bits 24–31:  defiResonance
Bits 32–39:  vitality      Bits 40–47:  intelligence
Bits 48–55:  loyalty       Bits 56–255: entropic noise
```

The **BioSpark Cipher** converts DNA entropy into a 40-rune secret name using Elder Futhark + BioSpark alphabet (5-bit groups from bits 56–255).

The **Coat of Arms** (320×380 SVG) evolves through four shield tiers based on lifetime USDC saved:

| Tier | Threshold | Shield colour |
|---|---|---|
| Bronze | < $100 | `#b45309` |
| Silver | $100 | `#94a3b8` |
| Gold | $1 000 | `#fbbf24` |
| Platinum | $10 000 | `#e2e8f0` |

Charge badges (⚡♥★♛✦) unlock for DeFi milestones: credit line use, savings deposits, yield earned, sovereignty, pack membership.

---

## Lineage Inheritance

When a pet is archived via RainbowBridge, a **GenesisCapsule** ERC-1155 token is minted to the owner. This capsule carries the ancestor's DNA, lifetime savings, and earned charges.

Burning the capsule in `PetNFT.mintWithLineage()` blends the ancestor's species, generation, and resonance (bits 0–31) into the new offspring's fresh entropy DNA.

---

## Portable Kiosk System — Aegis Rover

Owners can deploy a physical rolling pet sanctuary (Sprite / Ranger / Behemoth) on-trail by calling `MerchantGlyph.deployKiosk()`. Requires non-zero Aave yield as capital proof. Max 4,096 active kiosks globally.

When active, the pet's Coat of Arms receives a live **Merchant Glyph** visible to nearby users. Trail guests can check into your sanctuary for a 1 USDC hospitality fee, earning you badge milestones up to **Sovereign Trail-Medic**.

Wholesale pet supplies can be settled on-chain via `syncWholesaleInventory()`, routing USDC to approved vendors with per-pet purchase receipts.

---

## Frontend

Built with **Next.js 14 App Router**, **wagmi v2 + viem**, **RainbowKit**, **TailwindCSS**.

### Key components

| Component | Description |
|---|---|
| `HeraldryDisplay` | BioSpark cinematic canvas (800×540, 5-layer animation system) |
| `HeraldryCard` | 3D CSS card flip — pet image front, Coat of Arms back |
| `CipherReveal` | 5×8 rune grid with sequential decode animation |
| `WeatherGlyphConfig` | Climate zone picker with live seasonal ambient theme preview |
| `StasisPodManager` | Lock/unlock UI with duration picker and preservation fee display |
| `MerchantGlyphPanel` | Kiosk deploy/retract, guest check-in, badge progress |
| `GuardianSetup` | 2-of-3 guardian configuration and dead man's switch status |
| `HealthRecords` | IPFS health record log with vet access management |

### PetCard tabs

`Sell` · `Savings` · `Credit` · `✦ DNA` · `📋 Records` · `🔐 Guardian` · `❄ Stasis` · `🌍 Zone` · `🗺 Kiosk` · `🌈 Memorial`

---

## Subgraph

AssemblyScript subgraph on The Graph indexes `PetMinted` events including the full `dna` field. Schema includes `Pet { id, owner, tokenURI, dna, createdAt }`.

---

## Getting Started

### Contracts

```bash
cd contracts
forge install
forge build
forge test
```

Deploy to Base:

```bash
DEPLOYER_PRIVATE_KEY=0x... forge script script/Deploy.s.sol \
  --rpc-url https://mainnet.base.org --broadcast --verify
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Fill in deployed contract addresses
npm install
npm run dev
```

---

## Base Mainnet Addresses

| Token | Address |
|---|---|
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| WETH | `0x4200000000000000000000000000000000000006` |
| Aave v3 Pool | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` |
| aUSDC | `0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB` |
| aWETH | `0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7` |

---

## Disclaimer

This repository is experimental software. Smart contracts are unaudited. Do not deposit funds you cannot afford to lose. This is not financial advice.
