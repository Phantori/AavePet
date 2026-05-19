"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, PET_NFT_ABI } from "@/lib/contracts";

export function MintNFT() {
  const { isConnected } = useAccount();
  const [ipfsUri, setIpfsUri] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleMint = () => {
    if (!ipfsUri.trim()) return;
    writeContract({
      address: ADDRESSES.petNFT,
      abi: PET_NFT_ABI,
      functionName: "mint",
      args: [ipfsUri.trim()],
    });
  };

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-gray-800 p-6 text-gray-400 text-sm">
        Connect your wallet to mint a pet NFT.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 p-6 space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          IPFS metadata URI
        </label>
        <input
          type="text"
          placeholder="ipfs://Qm..."
          value={ipfsUri}
          onChange={(e) => setIpfsUri(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Upload your pet image + metadata JSON to Pinata first, then paste the IPFS URI here.
        </p>
      </div>

      <button
        onClick={handleMint}
        disabled={isPending || isConfirming || !ipfsUri.trim()}
        className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
      >
        {isPending ? "Confirm in wallet…" : isConfirming ? "Minting…" : "Mint Pet NFT"}
      </button>

      {isSuccess && (
        <p className="text-green-400 text-sm">
          Pet NFT minted! Tx: {txHash?.slice(0, 10)}…
        </p>
      )}
    </div>
  );
}
