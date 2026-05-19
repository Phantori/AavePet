import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  PetMinted,
  Transfer,
} from "../generated/PetNFT/PetNFT";
import {
  Listed,
  Delisted,
  Sold,
} from "../generated/PetMarketplace/PetMarketplace";
import {
  Deposited as UsdcDeposited,
  Withdrawn as UsdcWithdrawn,
} from "../generated/USDCVault/PetVault";
import {
  Deposited as WethDeposited,
  Withdrawn as WethWithdrawn,
} from "../generated/WETHVault/PetVault";
import { Pet, Listing, Sale, VaultDeposit, VaultWithdrawal, Protocol } from "../generated/schema";

const ZERO = BigInt.fromI32(0);
const PROTOCOL_ID = "protocol";

function loadOrCreateProtocol(): Protocol {
  let p = Protocol.load(PROTOCOL_ID);
  if (!p) {
    p = new Protocol(PROTOCOL_ID);
    p.totalPetsMinted = ZERO;
    p.totalVolume = ZERO;
    p.totalUsdcSaved = ZERO;
    p.totalWethSaved = ZERO;
  }
  return p;
}

// ── PetNFT ──────────────────────────────────────────────────────────────────

export function handlePetMinted(event: PetMinted): void {
  const id = event.params.tokenId.toString();

  let pet = new Pet(id);
  pet.tokenId = event.params.tokenId;
  pet.owner = event.params.owner;
  pet.creator = event.params.owner;
  pet.tokenURI = event.params.tokenURI;
  pet.mintedAt = event.block.timestamp;
  pet.save();

  const p = loadOrCreateProtocol();
  p.totalPetsMinted = p.totalPetsMinted.plus(BigInt.fromI32(1));
  p.save();
}

export function handleTransfer(event: Transfer): void {
  // Ignore mint events (from == zero address) — already handled by handlePetMinted
  if (event.params.from == Bytes.fromHexString("0x0000000000000000000000000000000000000000")) {
    return;
  }

  const id = event.params.tokenId.toString();
  const pet = Pet.load(id);
  if (!pet) return;

  pet.owner = event.params.to;

  // If transferred (sold via marketplace or direct), deactivate any listing
  const listing = Listing.load(id);
  if (listing && listing.active) {
    listing.active = false;
    listing.delistedAt = event.block.timestamp;
    listing.save();
    pet.listing = null;
  }

  pet.save();
}

// ── PetMarketplace ───────────────────────────────────────────────────────────

export function handleListed(event: Listed): void {
  const id = event.params.tokenId.toString();

  let listing = Listing.load(id);
  if (!listing) {
    listing = new Listing(id);
    listing.pet = id;
  }

  listing.seller = event.params.seller;
  listing.price = event.params.price;
  listing.active = true;
  listing.listedAt = event.block.timestamp;
  listing.delistedAt = null;
  listing.save();

  const pet = Pet.load(id);
  if (pet) {
    pet.listing = id;
    pet.save();
  }
}

export function handleDelisted(event: Delisted): void {
  const id = event.params.tokenId.toString();
  const listing = Listing.load(id);
  if (!listing) return;

  listing.active = false;
  listing.delistedAt = event.block.timestamp;
  listing.save();

  const pet = Pet.load(id);
  if (pet) {
    pet.listing = null;
    pet.save();
  }
}

export function handleSold(event: Sold): void {
  const petId = event.params.tokenId.toString();
  const saleId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();

  const sale = new Sale(saleId);
  sale.pet = petId;
  sale.seller = event.params.seller;
  sale.buyer = event.params.buyer;
  sale.price = event.params.price;
  sale.timestamp = event.block.timestamp;
  sale.save();

  const p = loadOrCreateProtocol();
  p.totalVolume = p.totalVolume.plus(event.params.price);
  p.save();
}

// ── PetVault (USDC) ──────────────────────────────────────────────────────────

export function handleUsdcDeposited(event: UsdcDeposited): void {
  const id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  const petId = event.params.tokenId.toString();

  const deposit = new VaultDeposit(id);
  deposit.pet = petId;
  deposit.depositor = event.params.depositor;
  deposit.asset = "USDC";
  deposit.amount = event.params.amount;
  deposit.timestamp = event.block.timestamp;
  deposit.save();

  const p = loadOrCreateProtocol();
  p.totalUsdcSaved = p.totalUsdcSaved.plus(event.params.amount);
  p.save();
}

export function handleUsdcWithdrawn(event: UsdcWithdrawn): void {
  const id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  const petId = event.params.tokenId.toString();

  const withdrawal = new VaultWithdrawal(id);
  withdrawal.pet = petId;
  withdrawal.depositor = event.params.depositor;
  withdrawal.asset = "USDC";
  withdrawal.amount = event.params.amount;
  withdrawal.timestamp = event.block.timestamp;
  withdrawal.save();

  const p = loadOrCreateProtocol();
  p.totalUsdcSaved = p.totalUsdcSaved.minus(event.params.amount);
  p.save();
}

// ── PetVault (WETH) ──────────────────────────────────────────────────────────

export function handleWethDeposited(event: WethDeposited): void {
  const id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  const petId = event.params.tokenId.toString();

  const deposit = new VaultDeposit(id);
  deposit.pet = petId;
  deposit.depositor = event.params.depositor;
  deposit.asset = "WETH";
  deposit.amount = event.params.amount;
  deposit.timestamp = event.block.timestamp;
  deposit.save();

  const p = loadOrCreateProtocol();
  p.totalWethSaved = p.totalWethSaved.plus(event.params.amount);
  p.save();
}

export function handleWethWithdrawn(event: WethWithdrawn): void {
  const id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  const petId = event.params.tokenId.toString();

  const withdrawal = new VaultWithdrawal(id);
  withdrawal.pet = petId;
  withdrawal.depositor = event.params.depositor;
  withdrawal.asset = "WETH";
  withdrawal.amount = event.params.amount;
  withdrawal.timestamp = event.block.timestamp;
  withdrawal.save();

  const p = loadOrCreateProtocol();
  p.totalWethSaved = p.totalWethSaved.minus(event.params.amount);
  p.save();
}
