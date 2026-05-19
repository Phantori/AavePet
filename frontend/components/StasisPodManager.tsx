"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { ADDRESSES, STASIS_POD_ABI, PET_NFT_ABI } from "@/lib/contracts";

const DURATION_OPTIONS = [
  { label: "1 week",   seconds: 7 * 24 * 3600 },
  { label: "1 month",  seconds: 30 * 24 * 3600 },
  { label: "3 months", seconds: 90 * 24 * 3600 },
  { label: "6 months", seconds: 180 * 24 * 3600 },
  { label: "1 year",   seconds: 365 * 24 * 3600 },
  { label: "2 years",  seconds: 730 * 24 * 3600 },
];

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  if (days >= 365) return `${(days / 365).toFixed(1)}y`;
  if (days >= 30)  return `${Math.floor(days / 30)}mo`;
  return `${days}d`;
}

interface Props {
  tokenId: bigint;
}

export function StasisPodManager({ tokenId }: Props) {
  const { address } = useAccount();
  const [selectedDuration, setSelectedDuration] = useState(DURATION_OPTIONS[1]);

  if (!ADDRESSES.stasisPod) {
    return <p className="text-xs text-gray-500">StasisPod contract not yet deployed.</p>;
  }

  const { data: isInStasis, refetch: refetchStasis } = useReadContract({
    address: ADDRESSES.stasisPod,
    abi: STASIS_POD_ABI,
    functionName: "isInStasis",
    args: [tokenId],
  });

  const { data: pod } = useReadContract({
    address: ADDRESSES.stasisPod,
    abi: STASIS_POD_ABI,
    functionName: "pods",
    args: [tokenId],
    query: { enabled: !!isInStasis },
  });

  const { data: duration } = useReadContract({
    address: ADDRESSES.stasisPod,
    abi: STASIS_POD_ABI,
    functionName: "stasisDuration",
    args: [tokenId],
    query: { enabled: !!isInStasis },
  });

  // Approval for safeTransferFrom — StasisPod needs approval to hold the NFT
  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproving, isSuccess: isApproved } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const { writeContract: writeLock, data: lockTxHash, isPending: isLockPending } = useWriteContract();
  const { isLoading: isLocking, isSuccess: isLocked } = useWaitForTransactionReceipt({ hash: lockTxHash });

  const { writeContract: writeUnlock, data: unlockTxHash, isPending: isUnlockPending } = useWriteContract();
  const { isLoading: isUnlocking, isSuccess: isUnlocked } = useWaitForTransactionReceipt({ hash: unlockTxHash });

  const handleApprove = () => {
    writeApprove({
      address: ADDRESSES.petNFT,
      abi: PET_NFT_ABI,
      functionName: "setApprovalForAll",
      args: [ADDRESSES.stasisPod, true],
    });
  };

  const handleLock = () => {
    writeLock({
      address: ADDRESSES.stasisPod,
      abi: STASIS_POD_ABI,
      functionName: "lockPet",
      args: [tokenId, BigInt(selectedDuration.seconds)],
    });
  };

  const handleUnlock = () => {
    writeUnlock({
      address: ADDRESSES.stasisPod,
      abi: STASIS_POD_ABI,
      functionName: "unlockPet",
      args: [tokenId],
    });
  };

  if (isInStasis) {
    const durationSeconds = duration ? Number(duration) : 0;
    const lockedAt = pod ? Number(pod[1]) : 0;
    const plannedSeconds = pod ? Number(pod[2]) : 0;
    const plannedLabel = DURATION_OPTIONS.find(o => o.seconds === plannedSeconds)?.label
      ?? formatDuration(plannedSeconds);

    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-cyan-900 bg-cyan-950/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-semibold text-cyan-300">Pet In Stasis</span>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Duration so far</span>
              <span className="text-gray-200">{formatDuration(durationSeconds)}</span>
            </div>
            <div className="flex justify-between">
              <span>Planned duration</span>
              <span className="text-gray-200">{plannedLabel}</span>
            </div>
            {lockedAt > 0 && (
              <div className="flex justify-between">
                <span>Locked at</span>
                <span className="text-gray-200">{new Date(lockedAt * 1000).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-cyan-700 mt-1">
            Wellness decay is frozen. Aave yield continues compounding. 10% preservation fee applies.
          </p>
        </div>

        {(isUnlocked) ? (
          <p className="text-green-400 text-xs">Pet released from stasis!</p>
        ) : (
          <button
            onClick={handleUnlock}
            disabled={isUnlockPending || isUnlocking}
            className="w-full bg-cyan-900 hover:bg-cyan-800 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold text-cyan-200 transition-colors"
          >
            {isUnlockPending || isUnlocking ? "Releasing…" : "Release from Stasis"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Lock your pet in a Stasis Pod to pause wellness decay while your pet&apos;s savings keep earning
        Aave yield. A 10% preservation fee applies to accrued yield. Requires no outstanding debt.
      </p>

      <div>
        <p className="text-xs text-gray-400 mb-2">Planned duration</p>
        <div className="grid grid-cols-3 gap-1.5">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.seconds}
              onClick={() => setSelectedDuration(opt)}
              className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors border ${
                selectedDuration.seconds === opt.seconds
                  ? "border-cyan-500 bg-cyan-900/30 text-cyan-300"
                  : "border-gray-800 text-gray-500 hover:border-gray-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-gray-900 p-2 text-xs text-gray-500 space-y-1">
        <div className="flex justify-between">
          <span>Preservation fee</span>
          <span className="text-gray-300">10% of accrued yield</span>
        </div>
        <div className="flex justify-between">
          <span>Wellness decay</span>
          <span className="text-cyan-400">Frozen</span>
        </div>
        <div className="flex justify-between">
          <span>Aave yield</span>
          <span className="text-green-400">Continues</span>
        </div>
      </div>

      {isLocked ? (
        <p className="text-green-400 text-xs">Pet entered stasis!</p>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isApprovePending || isApproving || isApproved}
            className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
          >
            {isApprovePending || isApproving ? "Approving…" : isApproved ? "✓ Approved" : "1. Approve"}
          </button>
          <button
            onClick={handleLock}
            disabled={isLockPending || isLocking || (!isApproved && !approveTxHash)}
            className="flex-1 bg-cyan-800 hover:bg-cyan-700 disabled:opacity-50 rounded-lg px-3 py-2 text-xs font-semibold text-cyan-100 transition-colors"
          >
            {isLockPending || isLocking ? "Locking…" : "2. Enter Stasis"}
          </button>
        </div>
      )}
    </div>
  );
}
