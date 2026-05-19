"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { ConnectButton } from "@/components/ConnectButton";
import { ADDRESSES, MARKETPLACE_ABI, APT_TOKEN_ABI } from "@/lib/contracts";
import { getActiveListings, getProtocolStats, type GraphListing, type GraphProtocol } from "@/lib/graph";
import { fetchMetadata, type PetMetadata } from "@/lib/nft";

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 rounded-lg px-4 py-2 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-100">{value}</p>
    </div>
  );
}

function ListingCard({ listing, metadata }: { listing: GraphListing; metadata: PetMetadata | null }) {
  const { address, isConnected } = useAccount();
  const isSeller = address?.toLowerCase() === listing.seller.toLowerCase();
  const tokenId = BigInt(listing.pet.tokenId);
  const price = BigInt(listing.price);

  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeBuy, data: buyTxHash, isPending: isBuyPending } = useWriteContract();
  const { writeContract: writeDelist, data: delistTxHash, isPending: isDelistPending } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isBuying, isSuccess: isBought } = useWaitForTransactionReceipt({ hash: buyTxHash });
  const { isLoading: isDelisting, isSuccess: isDelisted } = useWaitForTransactionReceipt({ hash: delistTxHash });

  const busy = isApprovePending || isApproving || isBuyPending || isBuying || isDelistPending || isDelisting;

  if (isBought) return (
    <div className="rounded-xl border border-green-800 bg-green-950/30 p-6 text-center">
      <p className="text-green-400 font-semibold">Purchased!</p>
      <p className="text-xs text-gray-400 mt-1">{metadata?.name ?? `Pet #${listing.pet.tokenId}`} is yours.</p>
    </div>
  );

  if (isDelisted) return (
    <div className="rounded-xl border border-gray-800 p-6 text-center text-gray-500 text-sm">Listing removed.</div>
  );

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden flex flex-col">
      {metadata?.image ? (
        <img src={metadata.image} alt={metadata.name} className="w-full h-44 object-cover" />
      ) : (
        <div className="w-full h-44 flex items-center justify-center bg-gray-900 text-4xl">🐾</div>
      )}
      <div className="p-4 flex flex-col flex-1 space-y-3">
        <div>
          <p className="font-semibold">{metadata?.name ?? `Pet #${listing.pet.tokenId}`}</p>
          <p className="text-xs text-gray-500">Token #{listing.pet.tokenId}</p>
          <p className="text-brand-400 font-semibold mt-1">{formatUnits(price, 18)} APT</p>
        </div>

        {isConnected && !isSeller && (
          <div className="flex gap-2 mt-auto">
            <button
              onClick={() => writeApprove({ address: ADDRESSES.aptToken, abi: APT_TOKEN_ABI, functionName: "approve", args: [ADDRESSES.marketplace, price] })}
              disabled={busy}
              className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              {isApprovePending || isApproving ? "Approving..." : "1. Approve"}
            </button>
            <button
              onClick={() => writeBuy({ address: ADDRESSES.marketplace, abi: MARKETPLACE_ABI, functionName: "buy", args: [tokenId] })}
              disabled={busy}
              className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              {isBuyPending || isBuying ? "Buying..." : "2. Buy"}
            </button>
          </div>
        )}

        {isSeller && (
          <button
            onClick={() => writeDelist({ address: ADDRESSES.marketplace, abi: MARKETPLACE_ABI, functionName: "delist", args: [tokenId] })}
            disabled={busy}
            className="w-full mt-auto bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            {isDelistPending || isDelisting ? "Removing..." : "Remove listing"}
          </button>
        )}

        {!isConnected && <p className="text-xs text-gray-500 mt-auto">Connect wallet to buy.</p>}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const [listings, setListings] = useState<Array<{ listing: GraphListing; metadata: PetMetadata | null }>>([]);
  const [stats, setStats] = useState<GraphProtocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [rawListings, protocol] = await Promise.all([
          getActiveListings(),
          getProtocolStats(),
        ]);

        const withMetadata = await Promise.all(
          rawListings.map(async (l) => ({
            listing: l,
            metadata: l.pet.tokenURI ? await fetchMetadata(l.pet.tokenURI) : null,
          }))
        );

        setListings(withMetadata);
        setStats(protocol);
      } catch {
        setError("Failed to load listings. Is the subgraph URL configured?");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <a href="/" className="text-3xl font-bold text-brand-500">AavePet</a>
          <p className="text-gray-400 text-sm mt-1">Browse Marketplace</p>
        </div>
        <nav className="flex items-center gap-4">
          <a href="/my-pets" className="text-sm text-gray-400 hover:text-gray-50 transition-colors">My Pets</a>
          <ConnectButton />
        </nav>
      </header>

      {stats && (
        <div className="flex gap-3 flex-wrap mb-8">
          <StatBadge label="Pets minted" value={stats.totalPetsMinted} />
          <StatBadge label="Total volume" value={`${formatUnits(BigInt(stats.totalVolume), 18)} APT`} />
          <StatBadge label="USDC saved" value={`${formatUnits(BigInt(stats.totalUsdcSaved), 6)} USDC`} />
          <StatBadge label="WETH saved" value={`${formatUnits(BigInt(stats.totalWethSaved), 18)} WETH`} />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-800 h-72 animate-pulse bg-gray-900" />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : listings.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No active listings yet.{" "}
          <a href="/" className="text-brand-400 hover:underline">Mint and list your first pet!</a>
        </p>
      ) : (
        <>
          <p className="text-gray-500 text-sm mb-6">{listings.length} active listing{listings.length !== 1 ? "s" : ""}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {listings.map(({ listing, metadata }) => (
              <ListingCard key={listing.id} listing={listing} metadata={metadata} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
