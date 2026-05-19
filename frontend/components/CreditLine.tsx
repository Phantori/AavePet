"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { ADDRESSES, PET_CREDIT_LINE_ABI, ERC20_ABI, BASE_TOKENS } from "@/lib/contracts";

interface Props {
  tokenId: bigint;
}

export function CreditLine({ tokenId }: Props) {
  const { address } = useAccount();
  const [borrowAmount, setBorowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  const { data: outstanding } = useReadContract({
    address: ADDRESSES.petCreditLine,
    abi: PET_CREDIT_LINE_ABI,
    functionName: "borrows",
    args: address ? [tokenId, address] : undefined,
    query: { enabled: !!address },
  });

  const { data: maxBorrow } = useReadContract({
    address: ADDRESSES.petCreditLine,
    abi: PET_CREDIT_LINE_ABI,
    functionName: "maxBorrow",
    args: address ? [tokenId, address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract: writeBorrow, data: borrowTxHash, isPending: isBorrowPending } = useWriteContract();
  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeRepay, data: repayTxHash, isPending: isRepayPending } = useWriteContract();

  const { isLoading: isBorrowing, isSuccess: borrowed } = useWaitForTransactionReceipt({ hash: borrowTxHash });
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isRepaying, isSuccess: repaid } = useWaitForTransactionReceipt({ hash: repayTxHash });

  const busyBorrow = isBorrowPending || isBorrowing;
  const busyRepay = isApprovePending || isApproving || isRepayPending || isRepaying;

  const hasDebt = outstanding !== undefined && outstanding > 0n;
  const canBorrow = maxBorrow !== undefined && maxBorrow > 0n;

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Outstanding debt</span>
          <span className={hasDebt ? "text-orange-400 font-semibold" : "text-gray-300"}>
            {outstanding !== undefined ? formatUnits(outstanding, 6) : "—"} USDC
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Available to borrow</span>
          <span className="text-gray-300">
            {maxBorrow !== undefined ? formatUnits(maxBorrow, 6) : "—"} USDC
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Borrow USDC against your WETH vault deposit (50% max LTV). Interest accrues via Aave v3.
        Your WETH remains earning yield while you have access to liquidity.
      </p>

      {/* Borrow */}
      {canBorrow && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-300">Borrow USDC</p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="USDC amount"
              value={borrowAmount}
              onChange={(e) => setBorowAmount(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={() =>
                writeBorrow({
                  address: ADDRESSES.petCreditLine,
                  abi: PET_CREDIT_LINE_ABI,
                  functionName: "borrow",
                  args: [tokenId, parseUnits(borrowAmount || "0", 6)],
                })
              }
              disabled={busyBorrow || !borrowAmount}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              {busyBorrow ? "Borrowing..." : "Borrow"}
            </button>
          </div>
          {borrowed && <p className="text-green-400 text-xs">USDC sent to your wallet!</p>}
        </div>
      )}

      {/* Repay */}
      {hasDebt && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-300">Repay USDC</p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="USDC to repay"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={() =>
                writeApprove({
                  address: BASE_TOKENS.USDC,
                  abi: ERC20_ABI,
                  functionName: "approve",
                  args: [ADDRESSES.petCreditLine, parseUnits(repayAmount || "0", 6)],
                })
              }
              disabled={busyRepay || !repayAmount}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              {isApprovePending || isApproving ? "..." : "Approve"}
            </button>
            <button
              onClick={() =>
                writeRepay({
                  address: ADDRESSES.petCreditLine,
                  abi: PET_CREDIT_LINE_ABI,
                  functionName: "repay",
                  args: [tokenId, parseUnits(repayAmount || "0", 6)],
                })
              }
              disabled={busyRepay || !repayAmount}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              {isRepayPending || isRepaying ? "Repaying..." : "Repay"}
            </button>
          </div>
          {repaid && <p className="text-green-400 text-xs">Debt repaid!</p>}
        </div>
      )}

      {!canBorrow && !hasDebt && (
        <p className="text-xs text-gray-500">
          Deposit WETH in the Savings tab to unlock borrowing capacity.
        </p>
      )}
    </div>
  );
}
