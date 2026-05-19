"use client";

import { useState } from "react";
import type { OwnedPet } from "@/lib/nft";
import { HeraldryDisplay } from "@/components/HeraldryDisplay";

interface Props {
  pet: OwnedPet;
}

export function HeraldryCard({ pet }: Props) {
  const [flipped, setFlipped] = useState(false);

  const img     = pet.metadata?.image;
  const petName = pet.metadata?.name ?? `Pet #${pet.tokenId}`;

  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: "1200px" }}
      onClick={() => setFlipped((v) => !v)}
      title={flipped ? "Click to see pet photo" : "Click to reveal Coat of Arms"}
    >
      <div
        className="w-full transition-transform duration-700"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front — pet image */}
        <div className="w-full rounded-xl overflow-hidden border border-gray-800" style={{ backfaceVisibility: "hidden" }}>
          {img ? (
            <img src={img} alt={petName} className="w-full object-cover" style={{ maxHeight: "280px" }} />
          ) : (
            <div className="w-full h-48 flex items-center justify-center bg-gray-900 text-6xl">🐾</div>
          )}
          <div className="bg-black/70 px-4 py-3 text-center">
            <p className="font-bold text-white text-sm">{petName}</p>
            <p className="text-xs text-gray-500 mt-0.5">Click to reveal Coat of Arms ✦</p>
          </div>
        </div>

        {/* Back — BioSpark cinematic heraldry */}
        <div className="absolute inset-0 w-full" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <HeraldryDisplay pet={pet} />
          <p className="text-center text-xs text-gray-700 mt-2">Click to flip back</p>
        </div>
      </div>
    </div>
  );
}
