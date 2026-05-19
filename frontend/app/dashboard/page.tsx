"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { ConnectButton } from "@/components/ConnectButton";
import { getPetsByOwner, getProtocolStats, type GraphPet, type GraphProtocol } from "@/lib/graph";
import { fetchMetadata, type PetMetadata } from "@/lib/nft";
import { ADDRESSES, PET_VAULT_ABI, PET_CREDIT_LINE_ABI } from "@/lib/contracts";

interface PetSummary {
  pet: GraphPet;
  metadata: PetMetadata | null;
}

function WellnessScore({ usdcSaved, wethSaved, hasDebt }: {
  usdcSaved: bigint; wethSaved: bigint; hasDebt: boolean;
}) {
  // Simple score: 0–100 based on savings and no debt
  let score = 50;
  if (usdcSaved > 0n) score += 20;
  if (usdcSaved > 1000n * 1_000_000n) score += 10; // >1000 USDC
  if (wethSaved > 0n) score += 10;
  if (!hasDebt) score += 10;
  score = Math.min(score, 100);

  const color = score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  const label = score >= 80 ? "Excellent" : score >= 50 ? "Good" : "Needs attention";

  return (
    <div className="flex items-center gap-3">
      <div className={`text-3xl font-bold ${color}`}>{score}</div>
      <div>
        <p className={`text-sm font-semibold ${color}`}>{label}</p>
        <p className="text-xs text-gray-500">Wellness score</p>
      </div>
      <div className="flex-1 bg-gray-800 rounded-full h-2 ml-2">
        <div className={`h-2 rounded-full transition-all ${score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
          style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function PetDashboardRow({ summary }: { summary: PetSummary }) {
  const { address } = useAccount();
  const tokenId = BigInt(summary.pet.tokenId);

  const { data: usdcSaved } = useReadContract({
    address: ADDRESSES.usdcVault,
    abi: PET_VAULT_ABI,
    functionName: "deposits",
    args: address ? [tokenId, address] : undefined,
    query: { enabled: !!address },
  });

  const { data: wethSaved } = useReadContract({
    address: ADDRESSES.wethVault,
    abi: PET_VAULT_ABI,
    functionName: "deposits",
    args: address ? [tokenId, address] : undefined,
    query: { enabled: !!address },
  });

  const { data: usdcYield } = useReadContract({
    address: ADDRESSES.usdcVault,
    abi: PET_VAULT_ABI,
    functionName: "yieldForPet",
    args: [tokenId],
  });

  const { data: outstanding } = useReadContract({
    address: ADDRESSES.petCreditLine,
    abi: PET_CREDIT_LINE_ABI,
    functionName: "borrows",
    args: address ? [tokenId, address] : undefined,
    query: { enabled: !!address },
  });

  const img = summary.metadata?.image;
  const name = summary.metadata?.name ?? `Pet #${summary.pet.tokenId}`;
  const isListed = summary.pet.listing?.active ?? false;

  return (
    <div className="rounded-xl border border-gray-800 p-4 flex gap-4">
      {img ? (
        <img src={img} alt={name} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
      ) : (
        <div className="w-20 h-20 flex items-center justify-center bg-gray-900 rounded-lg flex-shrink-0 text-3xl">🐾</div>
      )}

      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{name}</p>
            <p className="text-xs text-gray-500">Token #{summary.pet.tokenId}</p>
          </div>
          {isListed && (
            <span className="text-xs bg-brand-900 text-brand-300 px-2 py-0.5 rounded-full flex-shrink-0">Listed</span>
          )}
        </div>

        <WellnessScore
          usdcSaved={usdcSaved ?? 0n}
          wethSaved={wethSaved ?? 0n}
          hasDebt={(outstanding ?? 0n) > 0n}
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-gray-900 rounded-lg p-2">
            <p className="text-gray-500">USDC saved</p>
            <p className="font-semibold">{usdcSaved !== undefined ? formatUnits(usdcSaved, 6) : "—"}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-2">
            <p className="text-gray-500">USDC yield</p>
            <p className="font-semibold text-green-400">{usdcYield !== undefined ? formatUnits(usdcYield, 6) : "—"}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-2">
            <p className="text-gray-500">WETH saved</p>
            <p className="font-semibold">{wethSaved !== undefined ? formatUnits(wethSaved, 18).slice(0, 8) : "—"}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-2">
            <p className="text-gray-500">Debt (USDC)</p>
            <p className={`font-semibold ${(outstanding ?? 0n) > 0n ? "text-orange-400" : ""}`}>
              {outstanding !== undefined ? formatUnits(outstanding, 6) : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtocolStats({ stats }: { stats: GraphProtocol }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {[
        ["Pets minted", stats.totalPetsMinted],
        ["Volume (APT)", formatUnits(BigInt(stats.totalVolume), 18).split(".")[0]],
        ["USDC saved", `$${formatUnits(BigInt(stats.totalUsdcSaved), 6).split(".")[0]}`],
        ["WETH saved", `Ξ${formatUnits(BigInt(stats.totalWethSaved), 18).slice(0, 6)}`],
      ].map(([label, value]) => (
        <div key={label} className="bg-gray-900 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-100 mt-1">{value}</p>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [stats, setStats] = useState<GraphProtocol | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    const load = async () => {
      setLoading(true);
      try {
        const [graphPets, protocol] = await Promise.all([getPetsByOwner(address), getProtocolStats()]);
        const summaries = await Promise.all(
          graphPets.map(async (pet) => ({
            pet,
            metadata: pet.tokenURI ? await fetchMetadata(pet.tokenURI) : null,
          }))
        );
        setPets(summaries);
        setStats(protocol);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [address]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <a href="/" className="text-3xl font-bold text-brand-500">AavePet</a>
          <p className="text-gray-400 text-sm mt-1">Care Dashboard</p>
        </div>
        <nav className="flex items-center gap-4">
          <a href="/browse" className="text-sm text-gray-400 hover:text-gray-50 transition-colors">Browse</a>
          <a href="/services" className="text-sm text-gray-400 hover:text-gray-50 transition-colors">Services</a>
          <a href="/my-pets" className="text-sm text-gray-400 hover:text-gray-50 transition-colors">My Pets</a>
          <ConnectButton />
        </nav>
      </header>

      {stats && <ProtocolStats stats={stats} />}

      {!isConnected ? (
        <p className="text-gray-400 text-sm">Connect your wallet to see your care dashboard.</p>
      ) : loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-800 h-36 animate-pulse bg-gray-900" />
          ))}
        </div>
      ) : pets.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No pets yet.{" "}
          <a href="/" className="text-brand-400 hover:underline">Mint your first pet NFT!</a>
        </p>
      ) : (
        <div className="space-y-4">
          {pets.map((s) => <PetDashboardRow key={s.pet.id} summary={s} />)}
        </div>
      )}
    </main>
  );
}
