"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ADDRESSES, PET_RECORDS_ABI } from "@/lib/contracts";

interface Props {
  tokenId: bigint;
}

const RECORD_TYPES = ["checkup", "vaccination", "surgery", "dental", "emergency", "lab-results", "prescription", "other"];

interface Record {
  cid: string;
  recordType: string;
  timestamp: bigint;
  addedBy: string;
}

function RecordRow({ record }: { record: Record }) {
  const date = new Date(Number(record.timestamp) * 1000).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  const shortAddr = record.addedBy.slice(0, 6) + "…" + record.addedBy.slice(-4);

  return (
    <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-3 text-xs">
      <div className="flex-shrink-0 w-20 text-gray-500">{date}</div>
      <div className="flex-shrink-0 w-20 capitalize font-semibold text-teal-400">{record.recordType}</div>
      <div className="flex-1 font-mono text-gray-400 truncate">{record.cid}</div>
      <div className="flex-shrink-0 text-gray-600">{shortAddr}</div>
      <a
        href={`https://ipfs.io/ipfs/${record.cid}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-400 hover:underline text-[10px] flex-shrink-0"
      >
        ↗ IPFS
      </a>
    </div>
  );
}

export function HealthRecords({ tokenId }: Props) {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<"records" | "add" | "access">("records");
  const [newCid, setNewCid] = useState("");
  const [newType, setNewType] = useState("checkup");
  const [vetAddress, setVetAddress] = useState("");
  const [revokeAddress, setRevokeAddress] = useState("");

  const { data: records, refetch } = useReadContract({
    address: ADDRESSES.petRecords as `0x${string}`,
    abi: PET_RECORDS_ABI,
    functionName: "getRecords",
    args: [tokenId],
    query: { enabled: !!ADDRESSES.petRecords },
  });

  const { writeContract: writeAdd, data: addHash, isPending: addPending } = useWriteContract();
  const { writeContract: writeGrant, data: grantHash, isPending: grantPending } = useWriteContract();
  const { writeContract: writeRevoke, data: revokeHash, isPending: revokePending } = useWriteContract();

  const { isLoading: addLoading, isSuccess: addSuccess } = useWaitForTransactionReceipt({ hash: addHash });
  const { isLoading: grantLoading, isSuccess: grantSuccess } = useWaitForTransactionReceipt({ hash: grantHash });
  const { isLoading: revokeLoading, isSuccess: revokeSuccess } = useWaitForTransactionReceipt({ hash: revokeHash });

  if (!ADDRESSES.petRecords) {
    return <p className="text-xs text-gray-500">Health Records contract not yet deployed.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-3 border-b border-gray-800 pb-2">
        {(["records", "add", "access"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`text-xs font-semibold capitalize transition-colors ${activeTab === t ? "text-teal-400" : "text-gray-500 hover:text-gray-300"}`}>
            {t === "records" ? "Records" : t === "add" ? "+ Add Record" : "Vet Access"}
          </button>
        ))}
      </div>

      {/* Records list */}
      {activeTab === "records" && (
        <div className="space-y-2">
          {!records || (records as Record[]).length === 0 ? (
            <p className="text-xs text-gray-500">No health records yet. Add your first record or grant a vet access.</p>
          ) : (
            <>
              <p className="text-[10px] text-gray-600">{(records as Record[]).length} record(s) on file</p>
              {(records as Record[]).map((r, i) => <RecordRow key={i} record={r} />)}
            </>
          )}
        </div>
      )}

      {/* Add record */}
      {activeTab === "add" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Upload your pet&apos;s health document to IPFS first, then store the CID on-chain.
            <a href="https://app.pinata.cloud" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline ml-1">Pinata ↗</a>
          </p>
          <input type="text" placeholder="IPFS CID (Qm... or baf...)" value={newCid}
            onChange={(e) => setNewCid(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono" />
          <select value={newType} onChange={(e) => setNewType(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {addSuccess ? (
            <p className="text-green-400 text-xs">Record added!</p>
          ) : (
            <button
              onClick={() => writeAdd({
                address: ADDRESSES.petRecords as `0x${string}`,
                abi: PET_RECORDS_ABI,
                functionName: "addRecord",
                args: [tokenId, newCid, newType],
              })}
              disabled={addPending || addLoading || !newCid}
              className="w-full bg-teal-700 hover:bg-teal-600 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              {addPending || addLoading ? "Storing…" : "Store Record On-Chain"}
            </button>
          )}
        </div>
      )}

      {/* Vet access management */}
      {activeTab === "access" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-semibold">Grant vet access</p>
            <p className="text-[11px] text-gray-600">Vets with access can read and add records for this pet.</p>
            <input type="text" placeholder="Vet wallet address (0x...)" value={vetAddress}
              onChange={(e) => setVetAddress(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            {grantSuccess ? (
              <p className="text-green-400 text-xs">Access granted!</p>
            ) : (
              <button
                onClick={() => writeGrant({
                  address: ADDRESSES.petRecords as `0x${string}`,
                  abi: PET_RECORDS_ABI,
                  functionName: "grantAccess",
                  args: [tokenId, vetAddress as `0x${string}`],
                })}
                disabled={grantPending || grantLoading || !vetAddress}
                className="w-full bg-teal-700 hover:bg-teal-600 disabled:opacity-50 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
              >
                {grantPending || grantLoading ? "Granting…" : "Grant Access"}
              </button>
            )}
          </div>
          <div className="space-y-2 border-t border-gray-800 pt-3">
            <p className="text-xs text-gray-400 font-semibold">Revoke access</p>
            <input type="text" placeholder="Address to revoke" value={revokeAddress}
              onChange={(e) => setRevokeAddress(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
            {revokeSuccess ? (
              <p className="text-green-400 text-xs">Access revoked.</p>
            ) : (
              <button
                onClick={() => writeRevoke({
                  address: ADDRESSES.petRecords as `0x${string}`,
                  abi: PET_RECORDS_ABI,
                  functionName: "revokeAccess",
                  args: [tokenId, revokeAddress as `0x${string}`],
                })}
                disabled={revokePending || revokeLoading || !revokeAddress}
                className="w-full bg-red-900/50 hover:bg-red-800/60 disabled:opacity-50 rounded-lg px-3 py-2 text-xs font-semibold transition-colors text-red-400"
              >
                {revokePending || revokeLoading ? "Revoking…" : "Revoke Access"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
