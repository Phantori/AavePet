"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import { ADDRESSES, MARKETPLACE_ABI, PET_NFT_ABI, APT_TOKEN_ABI } from "@/lib/contracts";

function ListNFT() {
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleApproveAndList = () => {
    if (!tokenId || !price) return;
    // Step 1: approve marketplace for the NFT, then list in a follow-up tx
    writeContract({
      address: ADDRESSES.petNFT,
      abi: PET_NFT_ABI,
      functionName: "setApprovalForAll",
      args: [ADDRESSES.marketplace, true],
    });
  };

  const handleList = () => {
    if (!tokenId || !price) return;
    writeContract({
      address: ADDRESSES.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: "list",
      args: [BigInt(tokenId), parseEther(price)],
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-300">List a Pet NFT</h3>
      <input
        type="number"
        placeholder="Token ID"
        value={tokenId}
        onChange={(e) => setTokenId(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <input
        type="number"
        placeholder="Price in APT"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <div className="flex gap-2">
        <button
          onClick={handleApproveAndList}
          disabled={isPending || isConfirming}
          className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
        >
          1. Approve
        </button>
        <button
          onClick={handleList}
          disabled={isPending || isConfirming || !tokenId || !price}
          className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
        >
          2. List
        </button>
      </div>
      {isSuccess && <p className="text-green-400 text-xs">Done! Tx: {txHash?.slice(0, 10)}…</p>}
    </div>
  );
}

function BuyNFT() {
  const [tokenId, setTokenId] = useState("");

  const { data: listing } = useReadContract({
    address: ADDRESSES.marketplace,
    abi: MARKETPLACE_ABI,
    functionName: "listings",
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: { enabled: !!tokenId },
  });

  const { writeContract, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeBuy, data: buyTxHash, isPending: isBuyPending } = useWriteContract();

  const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isBuyConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: buyTxHash });

  const price = listing?.[2] ? listing[1] : undefined; // [seller, price, active]
  const isActive = listing?.[2];

  const handleApprove = () => {
    if (!price) return;
    writeContract({
      address: ADDRESSES.aptToken,
      abi: APT_TOKEN_ABI,
      functionName: "approve",
      args: [ADDRESSES.marketplace, price],
    });
  };

  const handleBuy = () => {
    if (!tokenId) return;
    writeBuy({
      address: ADDRESSES.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: "buy",
      args: [BigInt(tokenId)],
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-300">Buy a Pet NFT</h3>
      <input
        type="number"
        placeholder="Token ID"
        value={tokenId}
        onChange={(e) => setTokenId(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {tokenId && listing && (
        <div className="text-xs text-gray-400 bg-gray-900 rounded-lg px-3 py-2">
          {isActive ? (
            <>
              <span className="text-green-400 font-semibold">Listed</span> — {formatEther(listing[1])} APT
            </>
          ) : (
            <span className="text-red-400">Not listed</span>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={isApprovePending || isApproveConfirming || !isActive}
          className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
        >
          1. Approve APT
        </button>
        <button
          onClick={handleBuy}
          disabled={isBuyPending || isBuyConfirming || !isActive}
          className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
        >
          2. Buy
        </button>
      </div>
      {isSuccess && <p className="text-green-400 text-xs">Purchased! Tx: {buyTxHash?.slice(0, 10)}…</p>}
    </div>
  );
}

export function Marketplace() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-gray-800 p-6 text-gray-400 text-sm">
        Connect your wallet to use the marketplace.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 p-6 space-y-6">
      <ListNFT />
      <div className="border-t border-gray-800" />
      <BuyNFT />
    </div>
  );
}
