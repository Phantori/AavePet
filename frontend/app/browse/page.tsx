"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { ConnectButton } from "@/components/ConnectButton";
import { ADDRESSES, MARKETPLACE_ABI, PET_NFT_ABI, APT_TOKEN_ABI } from "@/lib/contracts";
import { fetchMetadata, type PetMetadata } from "@/lib/nft";

interface Listing {
  tokenId: bigint;
  seller: `0x${string}`;
  price: bigint;
  metadata: PetMetadata | null;
}

function ListingCard({ listing }: { listing: Listing }) {
  const { address, isConnected } = useAccount();
  const isSeller = address?.toLowerCase() === listing.seller.toLowerCase();

  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeBuy, data: buyTxHash, isPending: isBuyPending } = useWriteContract();
  const { writeContract: writeDelist, data: delistTxHash, isPending: isDelistPending } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isBuying, isSuccess: isBought } = useWaitForTransactionReceipt({ hash: buyTxHash });
  const { isLoading: isDelisting, isSuccess: isDelisted } = useWaitForTransactionReceipt({ hash: delistTxHash });

  const busy = isApprovePending || isApproving || isBuyPending || isBuying || isDelistPending || isDelisting;
  const img = listing.metadata?.image;
  const name = listing.metadata?.name ?? `Pet #${listing.tokenId}`;

  if (isBought) {
    return (
      <div className="rounded-xl border border-green-800 bg-green-950/30 p-6 text-center">
        <p className="text-green-400 font-semibold">Purchased!</p>
        <p className="text-xs text-gray-400 mt-1">{name} is now yours.</p>
      </div>
    );
  }

  if (isDelisted) {
    return (
      <div className="rounded-xl border border-gray-800 p-6 text-center text-gray-500 text-sm">
        Listing removed.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      {img ? (
        <img src={img} alt={name} className="w-full h-44 object-cover" />
      ) : (
        <div className="w-full h-44 flex items-center justify-center bg-gray-900 text-4xl">🐾</div>
      )}
      <div className="p-4 space-y-3">
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-xs text-gray-500">Token #{listing.tokenId.toString()}</p>
          <p className="text-sm font-semibold text-brand-400 mt-1">
            {formatUnits(listing.price, 18)} APT
          </p>
        </div>

        {isConnected && !isSeller && (
          <div className="flex gap-2">
            <button
              onClick={() =>
                writeApprove({
                  address: ADDRESSES.aptToken,
                  abi: APT_TOKEN_ABI,
                  functionName: "approve",
                  args: [ADDRESSES.marketplace, listing.price],
                })
              }
              disabled={busy}
              className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              {isApprovePending || isApproving ? "Approving..." : "1. Approve"}
            </button>
            <button
              onClick={() =>
                writeBuy({
                  address: ADDRESSES.marketplace,
                  abi: MARKETPLACE_ABI,
                  functionName: "buy",
                  args: [listing.tokenId],
                })
              }
              disabled={busy}
              className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              {isBuyPending || isBuying ? "Buying..." : "2. Buy"}
            </button>
          </div>
        )}

        {isSeller && (
          <button
            onClick={() =>
              writeDelist({
                address: ADDRESSES.marketplace,
                abi: MARKETPLACE_ABI,
                functionName: "delist",
                args: [listing.tokenId],
              })
            }
            disabled={busy}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            {isDelistPending || isDelisting ? "Removing..." : "Remove listing"}
          </button>
        )}

        {!isConnected && (
          <p className="text-xs text-gray-500">Connect wallet to buy.</p>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: totalSupply } = useReadContract({
    address: ADDRESSES.petNFT,
    abi: PET_NFT_ABI,
    functionName: "totalSupply",
  });

  useEffect(() => {
    if (totalSupply === undefined) return;

    const load = async () => {
      setLoading(true);
      const found: Listing[] = [];
      const limit = Number(totalSupply < 100n ? totalSupply : 100n);

      await Promise.all(
        Array.from({ length: limit }, async (_, i) => {
          const tokenId = BigInt(i);
          try {
            const res = await fetch(
              `/api/listing?tokenId=${tokenId}`
            );
            if (!res.ok) return;
            const { seller, price, active } = await res.json();
            if (!active) return;

            const uriRes = await fetch(`/api/token-uri?tokenId=${tokenId}`);
            const { uri } = uriRes.ok ? await uriRes.json() : { uri: "" };
            const metadata = uri ? await fetchMetadata(uri) : null;

            found.push({ tokenId, seller, price: BigInt(price), metadata });
          } catch {
            // skip
          }
        })
      );

      setListings(found.sort((a, b) => Number(a.tokenId - b.tokenId)));
      setLoading(false);
    };

    load();
  }, [totalSupply]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-12">
        <div>
          <a href="/" className="text-3xl font-bold text-brand-500">AavePet</a>
          <p className="text-gray-400 text-sm mt-1">Browse Marketplace</p>
        </div>
        <nav className="flex items-center gap-4">
          <a href="/my-pets" className="text-sm text-gray-400 hover:text-gray-50 transition-colors">My Pets</a>
          <ConnectButton />
        </nav>
      </header>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading listings...</p>
      ) : listings.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No active listings yet.{" "}
          <a href="/" className="text-brand-400 hover:underline">Mint and list your first pet!</a>
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {listings.map((l) => (
            <ListingCard key={l.tokenId.toString()} listing={l} />
          ))}
        </div>
      )}
    </main>
  );
}
