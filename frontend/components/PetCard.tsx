"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import type { OwnedPet } from "@/lib/nft";
import { ADDRESSES, MARKETPLACE_ABI, PET_NFT_ABI } from "@/lib/contracts";

interface Props {
  pet: OwnedPet;
}

export function PetCard({ pet }: Props) {
  const [listPrice, setListPrice] = useState("");
  const [showList, setShowList] = useState(false);

  const { writeContract, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeList, data: listTxHash, isPending: isListPending } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isListing, isSuccess: isListed } = useWaitForTransactionReceipt({ hash: listTxHash });

  const handleApprove = () => {
    writeContract({
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
      args: [pet.tokenId, parseEther(listPrice)],
    });
  };

  const img = pet.metadata?.image;
  const name = pet.metadata?.name ?? `Pet #${pet.tokenId}`;

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      {img ? (
        <img src={img} alt={name} className="w-full h-48 object-cover" />
      ) : (
        <div className="w-full h-48 flex items-center justify-center bg-gray-900 text-4xl">🐾</div>
      )}

      <div className="p-4 space-y-3">
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-xs text-gray-500">Token #{pet.tokenId.toString()}</p>
        </div>

        {isListed ? (
          <p className="text-green-400 text-xs">Listed on marketplace!</p>
        ) : (
          <>
            <button
              onClick={() => setShowList((v) => !v)}
              className="text-xs text-brand-400 hover:underline"
            >
              {showList ? "Cancel" : "List for sale"}
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
    </div>
  );
}
