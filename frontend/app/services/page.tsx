"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { ConnectButton } from "@/components/ConnectButton";
import { ADDRESSES, SERVICE_MARKETPLACE_ABI, ERC20_ABI, BASE_TOKENS } from "@/lib/contracts";

type ProviderTab = "browse" | "create-voucher" | "create-agreement";

function CreateVoucherForm() {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [supply, setSupply] = useState("");
  const [isAdoption, setIsAdoption] = useState(false);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleCreate = () => {
    if (!name || !supply) return;
    // In production, upload metadata to IPFS first
    const metadataURI = `data:application/json,${encodeURIComponent(JSON.stringify({ name, description: desc }))}`;
    writeContract({
      address: ADDRESSES.serviceMarketplace,
      abi: SERVICE_MARKETPLACE_ABI,
      functionName: "createVoucherType",
      args: [metadataURI, parseUnits(price || "0", 6), BigInt(supply), isAdoption],
    });
  };

  if (isSuccess) return <p className="text-green-400 text-sm">Voucher type created!</p>;

  return (
    <div className="space-y-3 max-w-md">
      <input type="text" placeholder="Service name (e.g. 15% off senior bloodwork)" value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      <textarea placeholder="Description / terms" value={desc} rows={2}
        onChange={(e) => setDesc(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
      <div className="flex gap-2">
        <input type="number" placeholder="Price (USDC, 0 = free)" value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input type="number" placeholder="Max supply" value={supply}
          onChange={(e) => setSupply(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
        <input type="checkbox" checked={isAdoption} onChange={(e) => setIsAdoption(e.target.checked)}
          className="accent-brand-500" />
        Free adoption voucher (1-year re-list lock to prevent flipping)
      </label>
      <button onClick={handleCreate} disabled={isPending || isLoading || !name || !supply}
        className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
        {isPending || isLoading ? "Creating..." : "Create Voucher Type"}
      </button>
    </div>
  );
}

function CreateAgreementForm() {
  const [provider, setProvider] = useState("");
  const [milestones, setMilestones] = useState([{ desc: "", amount: "" }]);

  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeCreate, data: createTxHash, isPending: isCreatePending } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isCreating, isSuccess } = useWaitForTransactionReceipt({ hash: createTxHash });

  const total = milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);

  const addMilestone = () => setMilestones([...milestones, { desc: "", amount: "" }]);
  const removeMilestone = (i: number) => setMilestones(milestones.filter((_, idx) => idx !== i));

  const handleApprove = () =>
    writeApprove({ address: BASE_TOKENS.USDC, abi: ERC20_ABI, functionName: "approve",
      args: [ADDRESSES.serviceMarketplace, parseUnits(total.toString(), 6)] });

  const handleCreate = () =>
    writeCreate({ address: ADDRESSES.serviceMarketplace, abi: SERVICE_MARKETPLACE_ABI,
      functionName: "createAgreement",
      args: [provider as `0x${string}`,
        milestones.map((m) => m.desc),
        milestones.map((m) => parseUnits(m.amount || "0", 6))] });

  if (isSuccess) return <p className="text-green-400 text-sm">Escrow agreement created! Your provider can now release milestones.</p>;

  return (
    <div className="space-y-3 max-w-md">
      <input type="text" placeholder="Provider wallet address (0x...)" value={provider}
        onChange={(e) => setProvider(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />

      <p className="text-xs text-gray-400 font-semibold">Milestones</p>
      {milestones.map((m, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input type="text" placeholder="Description" value={m.desc}
            onChange={(e) => setMilestones(milestones.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <input type="number" placeholder="USDC" value={m.amount}
            onChange={(e) => setMilestones(milestones.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
            className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          {milestones.length > 1 && (
            <button onClick={() => removeMilestone(i)} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
          )}
        </div>
      ))}
      <button onClick={addMilestone} className="text-xs text-brand-400 hover:underline">+ Add milestone</button>

      {total > 0 && <p className="text-xs text-gray-400">Total escrowed: <span className="text-gray-200 font-semibold">{total.toFixed(2)} USDC</span></p>}

      <div className="flex gap-2">
        <button onClick={handleApprove} disabled={isApprovePending || isApproving || total === 0}
          className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg px-3 py-2 text-xs font-semibold transition-colors">
          {isApprovePending || isApproving ? "Approving..." : "1. Approve USDC"}
        </button>
        <button onClick={handleCreate} disabled={isCreatePending || isCreating || !provider || total === 0}
          className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded-lg px-3 py-2 text-xs font-semibold transition-colors">
          {isCreatePending || isCreating ? "Creating..." : "2. Create Escrow"}
        </button>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const { isConnected } = useAccount();
  const [tab, setTab] = useState<ProviderTab>("browse");

  const tabs: [ProviderTab, string][] = [
    ["browse", "Browse Vouchers"],
    ["create-voucher", "Create Voucher"],
    ["create-agreement", "Escrow Agreement"],
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <a href="/" className="text-3xl font-bold text-brand-500">AavePet</a>
          <p className="text-gray-400 text-sm mt-1">Service Marketplace</p>
        </div>
        <nav className="flex items-center gap-4">
          <a href="/browse" className="text-sm text-gray-400 hover:text-gray-50 transition-colors">NFTs</a>
          <a href="/my-pets" className="text-sm text-gray-400 hover:text-gray-50 transition-colors">My Pets</a>
          <ConnectButton />
        </nav>
      </header>

      <div className="flex gap-4 border-b border-gray-800 mb-6">
        {tabs.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${
              tab === t ? "border-brand-500 text-brand-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            {label}
          </button>
        ))}
      </div>

      {!isConnected ? (
        <p className="text-gray-400 text-sm">Connect your wallet to use the service marketplace.</p>
      ) : tab === "browse" ? (
        <p className="text-gray-500 text-sm">Service voucher listings indexed from The Graph will appear here.</p>
      ) : tab === "create-voucher" ? (
        <div>
          <p className="text-gray-400 text-sm mb-4">Create redeemable service vouchers for your practice (vets, groomers, trainers).</p>
          <CreateVoucherForm />
        </div>
      ) : (
        <div>
          <p className="text-gray-400 text-sm mb-4">Create a milestone-based escrow for larger procedures. Funds release only as each stage is completed.</p>
          <CreateAgreementForm />
        </div>
      )}
    </main>
  );
}
