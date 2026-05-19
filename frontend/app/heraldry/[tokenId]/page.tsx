"use client";

import { useParams } from "next/navigation";
import { ConnectButton } from "@/components/ConnectButton";
import { HeraldryDisplay } from "@/components/HeraldryDisplay";
import type { OwnedPet } from "@/lib/nft";

// Build a minimal OwnedPet shell from the URL param.
// Metadata loads lazily inside HeraldryDisplay via on-chain reads.
function usePetShell(tokenId: string): OwnedPet {
  return { tokenId: BigInt(tokenId), tokenURI: "", metadata: null };
}

export default function HeraldryPage() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const pet = usePetShell(tokenId ?? "0");

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      {/* Minimal nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-900">
        <a href="/" className="text-brand-500 font-bold text-lg">AavePet</a>
        <nav className="flex items-center gap-4">
          <a href="/my-pets" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">My Pets</a>
          <ConnectButton />
        </nav>
      </header>

      {/* Full-screen BioSpark heraldry viewer */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full" style={{ maxWidth: "800px" }}>
          <HeraldryDisplay pet={pet} />
        </div>
      </div>
    </main>
  );
}
