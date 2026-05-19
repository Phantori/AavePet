"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import type { OwnedPet } from "@/lib/nft";
import { DNAMatrix } from "@/components/DNAMatrix";
import { ADDRESSES, PET_NFT_ABI } from "@/lib/contracts";

// Extended ABI fragment for tokenDNA and PetHeraldry getHeraldrySVG
const DNA_ABI = [
  {
    name: "tokenDNA",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const HERALDRY_ABI = [
  {
    name: "getHeraldrySVG",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "petName", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

interface Props {
  pet: OwnedPet;
}

export function HeraldryCard({ pet }: Props) {
  const [flipped, setFlipped] = useState(false);

  const petName = pet.metadata?.name ?? `Pet #${pet.tokenId}`;

  const { data: dna } = useReadContract({
    address: ADDRESSES.petNFT,
    abi: DNA_ABI,
    functionName: "tokenDNA",
    args: [pet.tokenId],
  });

  const { data: svg, isLoading: svgLoading } = useReadContract({
    address: ADDRESSES.petHeraldry as `0x${string}`,
    abi: HERALDRY_ABI,
    functionName: "getHeraldrySVG",
    args: [pet.tokenId, petName],
    query: { enabled: !!ADDRESSES.petHeraldry },
  });

  const img = pet.metadata?.image;

  return (
    <div
      className="relative w-full"
      style={{ perspective: "1000px", height: "460px" }}
      onClick={() => setFlipped((v) => !v)}
      title="Click to flip"
    >
      <div
        className="w-full h-full relative transition-transform duration-700 cursor-pointer"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ── Front face ── */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border border-gray-800 bg-gray-950"
          style={{ backfaceVisibility: "hidden" }}
        >
          {img ? (
            <img src={img} alt={petName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl bg-gray-900">🐾</div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="font-bold text-white">{petName}</p>
            <p className="text-xs text-gray-400">Token #{pet.tokenId.toString()}</p>
            <p className="text-xs text-gray-500 mt-1">Click to reveal Heraldry ✦</p>
          </div>
        </div>

        {/* ── Back face ── */}
        <div
          className="absolute inset-0 rounded-xl overflow-auto border border-purple-900/50 bg-gray-950 p-4 space-y-4"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-purple-300">Coat of Arms</p>
            <p className="text-xs text-gray-600">#{pet.tokenId.toString()}</p>
          </div>

          {/* SVG heraldry */}
          {svgLoading ? (
            <div className="w-full h-48 bg-gray-900 animate-pulse rounded-lg" />
          ) : svg ? (
            <div
              className="w-full rounded-lg overflow-hidden border border-gray-800"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="w-full h-48 flex items-center justify-center bg-gray-900 rounded-lg text-gray-600 text-sm">
              Heraldry contract not deployed
            </div>
          )}

          {/* DNA matrix */}
          {dna !== undefined && <DNAMatrix dna={dna} />}
        </div>
      </div>
    </div>
  );
}
