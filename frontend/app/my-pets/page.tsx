"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { PetCard } from "@/components/PetCard";
import { getPetsByOwner, type GraphPet } from "@/lib/graph";
import { fetchMetadata, type OwnedPet } from "@/lib/nft";

export default function MyPetsPage() {
  const { address, isConnected } = useAccount();
  const [pets, setPets] = useState<OwnedPet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!address) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const graphPets = await getPetsByOwner(address);
        const owned: OwnedPet[] = await Promise.all(
          graphPets.map(async (p: GraphPet) => ({
            tokenId: BigInt(p.tokenId),
            tokenURI: p.tokenURI,
            metadata: p.tokenURI ? await fetchMetadata(p.tokenURI) : null,
          }))
        );
        setPets(owned);
      } catch {
        setError("Failed to load pets. Is the subgraph URL configured?");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [address]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-12">
        <div>
          <a href="/" className="text-3xl font-bold text-brand-500">AavePet</a>
          <p className="text-gray-400 text-sm mt-1">My Pets</p>
        </div>
        <nav className="flex items-center gap-4">
          <a href="/browse" className="text-sm text-gray-400 hover:text-gray-50 transition-colors">Browse</a>
          <ConnectButton />
        </nav>
      </header>

      {!isConnected ? (
        <p className="text-gray-400 text-sm">Connect your wallet to see your pets.</p>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-800 h-72 animate-pulse bg-gray-900" />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : pets.length === 0 ? (
        <p className="text-gray-400 text-sm">
          You don't own any pet NFTs yet.{" "}
          <a href="/" className="text-brand-400 hover:underline">Mint one!</a>
        </p>
      ) : (
        <>
          <p className="text-gray-500 text-sm mb-6">{pets.length} pet{pets.length !== 1 ? "s" : ""}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {pets.map((pet) => (
              <PetCard key={pet.tokenId.toString()} pet={pet} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
