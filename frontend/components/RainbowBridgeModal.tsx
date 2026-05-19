"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, RAINBOW_BRIDGE_ABI, PET_NFT_ABI } from "@/lib/contracts";
import { uploadImageToPinata } from "@/lib/pinata";

interface Props {
  tokenId: bigint;
  onClose: () => void;
}

type Step = "form" | "approving" | "archiving" | "done";

export function RainbowBridgeModal({ tokenId, onClose }: Props) {
  const [epitaph, setEpitaph] = useState("");
  const [charity, setCharity] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");

  const { writeContract: writeApprove, data: approveTxHash } = useWriteContract();
  const { writeContract: writeArchive, data: archiveTxHash } = useWriteContract();

  const { isLoading: isApproving, isSuccess: approved } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });
  const { isLoading: isArchiving, isSuccess: archived } = useWaitForTransactionReceipt({
    hash: archiveTxHash,
  });

  const handleApprove = () => {
    setError("");
    setStep("approving");
    writeApprove({
      address: ADDRESSES.petNFT,
      abi: PET_NFT_ABI,
      functionName: "setApprovalForAll",
      args: [ADDRESSES.rainbowBridge, true],
    });
  };

  const handleArchive = () => {
    if (!epitaph.trim()) { setError("Please write a farewell message."); return; }
    setStep("archiving");
    writeArchive({
      address: ADDRESSES.rainbowBridge,
      abi: RAINBOW_BRIDGE_ABI,
      functionName: "archive",
      args: [tokenId, epitaph.trim(), (charity.trim() || "0x0000000000000000000000000000000000000000") as `0x${string}`],
    });
  };

  if (archived) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">🌈</div>
          <h2 className="text-xl font-semibold">Rest well, dear friend.</h2>
          <p className="text-gray-400 text-sm">
            The memorial is sealed forever on-chain. Their memory lives on.
          </p>
          <button onClick={onClose} className="text-brand-400 hover:underline text-sm">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 max-w-md w-full space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">🌈 Rainbow Bridge</h2>
            <p className="text-gray-400 text-xs mt-0.5">Create an eternal memorial for Pet #{tokenId.toString()}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-lg">✕</button>
        </div>

        <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-lg p-3 text-xs text-yellow-300">
          This action is <strong>permanent</strong>. The NFT will be locked in the memorial contract forever and cannot be recovered.
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Farewell message <span className="text-red-400">*</span></label>
            <textarea
              value={epitaph}
              onChange={(e) => setEpitaph(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Forever in our hearts. You were the best companion we could have asked for..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <p className="text-xs text-gray-600 text-right">{epitaph.length}/500</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Donate yield to (optional)</label>
            <input
              type="text"
              value={charity}
              onChange={(e) => setCharity(e.target.value)}
              placeholder="0x... charity / shelter wallet"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Vault yield will stream to this address in your pet's name.
            </p>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={step !== "form" || isApproving}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              approved
                ? "bg-green-800 text-green-300 cursor-default"
                : "bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
            }`}
          >
            {isApproving ? "Approving..." : approved ? "✓ Approved" : "1. Approve"}
          </button>
          <button
            onClick={handleArchive}
            disabled={!approved || step === "archiving" || isArchiving}
            className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            {isArchiving ? "Sealing..." : "2. Create Memorial"}
          </button>
        </div>
      </div>
    </div>
  );
}
