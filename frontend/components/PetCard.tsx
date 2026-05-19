"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import type { OwnedPet } from "@/lib/nft";
import {
  ADDRESSES, MARKETPLACE_ABI, PET_NFT_ABI, PET_VAULT_ABI, ERC20_ABI, BASE_TOKENS,
} from "@/lib/contracts";
import { CreditLine } from "@/components/CreditLine";
import { RainbowBridgeModal } from "@/components/RainbowBridgeModal";
import { HeraldryCard } from "@/components/HeraldryCard";
import { CipherReveal } from "@/components/CipherReveal";
import { HealthRecords } from "@/components/HealthRecords";
import { GuardianSetup } from "@/components/GuardianSetup";

type Tab = "list" | "savings" | "credit" | "lineage" | "records" | "guardian" | "memorial";

interface VaultRowProps {
  tokenId: bigint;
  vaultAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  symbol: string;
  decimals: number;
}

function VaultRow({ tokenId, vaultAddress, tokenAddress, symbol, decimals }: VaultRowProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");

  const { data: principal } = useReadContract({
    address: vaultAddress,
    abi: PET_VAULT_ABI,
    functionName: "deposits",
    args: address ? [tokenId, address] : undefined,
    query: { enabled: !!address },
  });

  const { data: yield_ } = useReadContract({
    address: vaultAddress,
    abi: PET_VAULT_ABI,
    functionName: "yieldForPet",
    args: [tokenId],
  });

  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeDeposit, data: depositTxHash, isPending: isDepositPending } = useWriteContract();
  const { writeContract: writeWithdraw, data: withdrawTxHash, isPending: isWithdrawPending } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isDepositing } = useWaitForTransactionReceipt({ hash: depositTxHash });
  const { isLoading: isWithdrawing } = useWaitForTransactionReceipt({ hash: withdrawTxHash });

  const busy = isApprovePending || isApproving || isDepositPending || isDepositing || isWithdrawPending || isWithdrawing;

  const handleApprove = () => {
    if (!amount) return;
    writeApprove({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [vaultAddress, parseUnits(amount, decimals)],
    });
  };

  const handleDeposit = () => {
    if (!amount) return;
    writeDeposit({
      address: vaultAddress,
      abi: PET_VAULT_ABI,
      functionName: "deposit",
      args: [tokenId, parseUnits(amount, decimals)],
    });
  };

  const handleWithdraw = () => {
    if (!principal || principal === 0n) return;
    writeWithdraw({
      address: vaultAddress,
      abi: PET_VAULT_ABI,
      functionName: "withdraw",
      args: [tokenId, principal],
    });
  };

  return (
    <div className="bg-gray-900 rounded-lg p-3 space-y-2">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-gray-300">{symbol}</span>
        <span className="text-gray-400">
          {principal !== undefined ? formatUnits(principal, decimals) : "—"} deposited
          {yield_ !== undefined && yield_ > 0n && (
            <span className="text-green-400 ml-1">+{formatUnits(yield_, decimals)} yield</span>
          )}
        </span>
      </div>

      <div className="flex gap-1.5">
        <input
          type="number"
          placeholder={`${symbol} amount`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          onClick={handleApprove}
          disabled={busy || !amount}
          className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap"
        >
          {isApprovePending || isApproving ? "…" : "Approve"}
        </button>
        <button
          onClick={handleDeposit}
          disabled={busy || !amount}
          className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded px-2 py-1 text-xs font-semibold transition-colors"
        >
          {isDepositPending || isDepositing ? "…" : "Save"}
        </button>
      </div>

      {principal !== undefined && principal > 0n && (
        <button
          onClick={handleWithdraw}
          disabled={busy}
          className="w-full text-xs text-gray-400 hover:text-gray-200 transition-colors text-left"
        >
          {isWithdrawPending || isWithdrawing ? "Withdrawing..." : "Withdraw all principal"}
        </button>
      )}
    </div>
  );
}

// Reads tokenDNA then delegates to CipherReveal — avoids prop-drilling bigint from parent
function CipherRevealLoader({ tokenId }: { tokenId: bigint }) {
  const { data: dna } = useReadContract({
    address: ADDRESSES.petNFT,
    abi: PET_NFT_ABI,
    functionName: "tokenDNA",
    args: [tokenId],
  });
  if (dna === undefined) return <p className="text-xs text-gray-600 text-center">Loading DNA…</p>;
  return <CipherReveal dna={dna} />;
}

interface Props {
  pet: OwnedPet;
}

export function PetCard({ pet }: Props) {
  const [tab, setTab] = useState<Tab>("list");
  const [showBridge, setShowBridge] = useState(false);
  const [listPrice, setListPrice] = useState("");
  const [showList, setShowList] = useState(false);

  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeList, data: listTxHash, isPending: isListPending } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isListing, isSuccess: isListed } = useWaitForTransactionReceipt({ hash: listTxHash });

  const handleApprove = () => {
    writeApprove({
      address: ADDRESSES.petNFT,
      abi: PET_NFT_ABI,
      functionName: "setApprovalForAll",
      args: [ADDRESSES.marketplace, true],
    });
  };

  const handleList = () => {
    if (!listPrice) return;
    writeList({
      address: ADDRESSES.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: "list",
      // Marketplace prices are in APT (18 decimals)
      args: [pet.tokenId, parseUnits(listPrice, 18)],
    });
  };

  const img = pet.metadata?.image;
  const name = pet.metadata?.name ?? `Pet #${pet.tokenId}`;

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden flex flex-col">
      {img ? (
        <img src={img} alt={name} className="w-full h-44 object-cover" />
      ) : (
        <div className="w-full h-44 flex items-center justify-center bg-gray-900 text-4xl">🐾</div>
      )}

      <div className="p-4 flex flex-col flex-1 space-y-3">
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-xs text-gray-500">Token #{pet.tokenId.toString()}</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-3 border-b border-gray-800 pb-2 flex-wrap">
          {([["list", "Sell"], ["savings", "Savings"], ["credit", "Credit"], ["lineage", "✦ DNA"], ["records", "📋 Records"], ["guardian", "🔐 Guardian"], ["memorial", "🌈"]] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs font-semibold transition-colors ${
                tab === t ? "text-brand-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "list" && (
          <div className="space-y-2">
            {isListed ? (
              <p className="text-green-400 text-xs">Listed on marketplace!</p>
            ) : (
              <>
                <button
                  onClick={() => setShowList((v) => !v)}
                  className="text-xs text-brand-400 hover:underline"
                >
                  {showList ? "Cancel" : "List for sale (APT)"}
                </button>
                {showList && (
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Price in APT"
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleApprove}
                        disabled={isApprovePending || isApproving}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                      >
                        {isApprovePending || isApproving ? "Approving..." : "1. Approve"}
                      </button>
                      <button
                        onClick={handleList}
                        disabled={isListPending || isListing || !listPrice}
                        className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                      >
                        {isListPending || isListing ? "Listing..." : "2. List"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "credit" && <CreditLine tokenId={pet.tokenId} />}

        {tab === "lineage" && (
          <div className="space-y-3">
            <HeraldryCard pet={pet} />
            <a
              href={`/heraldry/${pet.tokenId.toString()}`}
              className="block text-center text-xs text-brand-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View full-screen heraldry ↗
            </a>
            {/* Cipher reveal below the card */}
            <CipherRevealLoader tokenId={pet.tokenId} />
          </div>
        )}

        {tab === "records" && <HealthRecords tokenId={pet.tokenId} />}

        {tab === "guardian" && <GuardianSetup tokenId={pet.tokenId} />}

        {tab === "memorial" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              When your pet passes, you can create an eternal on-chain memorial. The NFT is locked
              forever and vault yield can stream to a charity of your choice in their name.
            </p>
            <button
              onClick={() => setShowBridge(true)}
              className="w-full bg-purple-800 hover:bg-purple-700 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              🌈 Open Rainbow Bridge
            </button>
            {showBridge && (
              <RainbowBridgeModal tokenId={pet.tokenId} onClose={() => setShowBridge(false)} />
            )}
          </div>
        )}

        {tab === "savings" && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Save USDC or WETH for your pet's vet bills. Funds earn Aave yield automatically.
            </p>
            <VaultRow
              tokenId={pet.tokenId}
              vaultAddress={ADDRESSES.usdcVault}
              tokenAddress={BASE_TOKENS.USDC}
              symbol="USDC"
              decimals={6}
            />
            <VaultRow
              tokenId={pet.tokenId}
              vaultAddress={ADDRESSES.wethVault}
              tokenAddress={BASE_TOKENS.WETH}
              symbol="WETH"
              decimals={18}
            />
          </div>
        )}
      </div>
    </div>
  );
}
