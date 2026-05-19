"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ADDRESSES, PET_GUARDIAN_ABI, PET_VAULT_ABI } from "@/lib/contracts";
import { useAccount } from "wagmi";

interface Props {
  tokenId: bigint;
}

const INACTIVITY_OPTIONS = [
  { label: "30 days",  value: 30 * 24 * 3600 },
  { label: "60 days",  value: 60 * 24 * 3600 },
  { label: "90 days",  value: 90 * 24 * 3600 },
  { label: "180 days", value: 180 * 24 * 3600 },
];

export function GuardianSetup({ tokenId }: Props) {
  const { address } = useAccount();
  const [g1, setG1] = useState("");
  const [g2, setG2] = useState("");
  const [g3, setG3] = useState("");
  const [inactivity, setInactivity] = useState(INACTIVITY_OPTIONS[2].value); // 90 days default
  const [tab, setTab] = useState<"setup" | "status">("setup");

  const { data: config } = useReadContract({
    address: ADDRESSES.petGuardian as `0x${string}`,
    abi: PET_GUARDIAN_ABI,
    functionName: "configs",
    args: [tokenId],
    query: { enabled: !!ADDRESSES.petGuardian },
  });

  const { data: isInactive } = useReadContract({
    address: ADDRESSES.petGuardian as `0x${string}`,
    abi: PET_GUARDIAN_ABI,
    functionName: "isInactive",
    args: [tokenId],
    query: { enabled: !!ADDRESSES.petGuardian },
  });

  const { writeContract: writeSetup, data: setupHash, isPending: setupPending } = useWriteContract();
  const { writeContract: writePing,  data: pingHash,  isPending: pingPending  } = useWriteContract();
  const { writeContract: writeVaultGuardian, data: vaultHash, isPending: vaultPending } = useWriteContract();

  const { isLoading: setupLoading, isSuccess: setupSuccess } = useWaitForTransactionReceipt({ hash: setupHash });
  const { isLoading: pingLoading,  isSuccess: pingSuccess  } = useWaitForTransactionReceipt({ hash: pingHash  });
  const { isLoading: vaultLoading, isSuccess: vaultSuccess } = useWaitForTransactionReceipt({ hash: vaultHash });

  const configActive = config && (config as { active: boolean }).active;

  if (!ADDRESSES.petGuardian) {
    return <p className="text-xs text-gray-500">Guardian contract not yet deployed.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 border-b border-gray-800 pb-2">
        {(["setup", "status"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-xs font-semibold capitalize transition-colors ${tab === t ? "text-orange-400" : "text-gray-500 hover:text-gray-300"}`}>
            {t === "setup" ? "Configure" : "Status"}
          </button>
        ))}
      </div>

      {tab === "setup" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Designate 2-of-3 guardians who can collectively access your pet&apos;s vault if you&apos;re unreachable.
            Guardians can only act after your chosen inactivity period has elapsed.
          </p>
          <div className="space-y-2">
            {[[g1, setG1], [g2, setG2], [g3, setG3]].map(([val, set], i) => (
              <input key={i}
                type="text" placeholder={`Guardian ${i + 1} address (0x...)`}
                value={val as string}
                onChange={(e) => (set as (v: string) => void)(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            ))}
          </div>
          <select value={inactivity} onChange={(e) => setInactivity(Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            {INACTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} inactivity window</option>)}
          </select>

          {setupSuccess ? (
            <div className="space-y-2">
              <p className="text-green-400 text-xs">Guardians configured!</p>
              {/* Step 2: authorize guardian contract in vault */}
              <p className="text-xs text-gray-500">Step 2: authorize the guardian contract in each vault.</p>
              <div className="flex gap-2">
                <button onClick={() => writeVaultGuardian({ address: ADDRESSES.usdcVault, abi: PET_VAULT_ABI, functionName: "setGuardian", args: [tokenId, ADDRESSES.petGuardian as `0x${string}`] })}
                  disabled={vaultPending || vaultLoading}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg px-3 py-2 text-xs font-semibold">
                  {vaultPending || vaultLoading ? "…" : "Auth USDC Vault"}
                </button>
              </div>
              {vaultSuccess && <p className="text-green-400 text-xs">Vault authorized!</p>}
            </div>
          ) : (
            <button
              onClick={() => writeSetup({
                address: ADDRESSES.petGuardian as `0x${string}`,
                abi: PET_GUARDIAN_ABI,
                functionName: "setupGuardians",
                args: [tokenId, [g1 as `0x${string}`, g2 as `0x${string}`, g3 as `0x${string}`], 2, BigInt(inactivity)],
              })}
              disabled={setupPending || setupLoading || !g1 || !g2 || !g3}
              className="w-full bg-orange-700 hover:bg-orange-600 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              {setupPending || setupLoading ? "Setting up…" : "Configure Guardians"}
            </button>
          )}
        </div>
      )}

      {tab === "status" && (
        <div className="space-y-3">
          {configActive ? (
            <>
              <div className="bg-gray-900 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Guardian status</span>
                  <span className={isInactive ? "text-red-400 font-semibold" : "text-green-400 font-semibold"}>
                    {isInactive ? "⚠ INACTIVE — guardians may act" : "✓ ACTIVE"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500">Ping regularly to prove you&apos;re active and reset the inactivity timer.</p>
              {pingSuccess ? (
                <p className="text-green-400 text-xs">Activity confirmed!</p>
              ) : (
                <button
                  onClick={() => writePing({
                    address: ADDRESSES.petGuardian as `0x${string}`,
                    abi: PET_GUARDIAN_ABI,
                    functionName: "pingAlive",
                    args: [tokenId],
                  })}
                  disabled={pingPending || pingLoading}
                  className="w-full bg-green-800 hover:bg-green-700 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                >
                  {pingPending || pingLoading ? "Pinging…" : "🤙 Ping Alive"}
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500">No guardians configured. Set them up in the Configure tab.</p>
          )}
        </div>
      )}
    </div>
  );
}
