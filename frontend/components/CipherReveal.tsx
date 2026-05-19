"use client";

import { useEffect, useRef, useState } from "react";
import { getRuneGroups, runeDescription, type RuneGroup } from "@/lib/cipher";
import { decodeDNA } from "@/lib/dna";

interface Props {
  dna: bigint;
}

const RUNE_COLOR = "#a78bfa"; // violet — cipher accent

export function CipherReveal({ dna }: Props) {
  const traits = decodeDNA(dna);
  const groups = getRuneGroups(dna);

  const [revealedCount, setRevealedCount] = useState(0);
  const [hovered, setHovered] = useState<RuneGroup | null>(null);
  const [decoding, setDecoding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    if (decoding) return;
    setDecoding(true);
    setRevealedCount(0);
    let i = 0;
    const tick = () => {
      i++;
      setRevealedCount(i);
      if (i < groups.length) timerRef.current = setTimeout(tick, 38);
      else setDecoding(false);
    };
    timerRef.current = setTimeout(tick, 100);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Display runes in 5 rows of 8
  const rows: RuneGroup[][] = [];
  for (let r = 0; r < 5; r++) rows.push(groups.slice(r * 8, r * 8 + 8));

  return (
    <div className="bg-gray-950 border border-purple-900/40 rounded-xl p-4 space-y-4 font-mono text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ color: RUNE_COLOR }} className="tracking-widest text-xs">◈ CIPHER · RUNIC INSCRIPTION</span>
        <button
          onClick={start}
          disabled={decoding}
          className="text-[10px] px-3 py-1 rounded border transition-colors disabled:opacity-40"
          style={{ borderColor: RUNE_COLOR + "44", color: RUNE_COLOR }}
        >
          {decoding ? "DECODING…" : revealedCount === 0 ? "DECODE" : "RE-DECODE"}
        </button>
      </div>

      {/* Rune grid */}
      <div className="space-y-1">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1 justify-center">
            {row.map((g, ci) => {
              const revealed = ri * 8 + ci < revealedCount;
              return (
                <button
                  key={ci}
                  onMouseEnter={() => revealed && setHovered(g)}
                  onMouseLeave={() => setHovered(null)}
                  className="relative w-9 h-9 rounded flex items-center justify-center transition-all duration-200"
                  style={{
                    background: revealed ? (hovered?.rune === g.rune ? RUNE_COLOR + "25" : RUNE_COLOR + "10") : "transparent",
                    border: `1px solid ${revealed ? RUNE_COLOR + "55" : "#1f2937"}`,
                    fontSize: "18px",
                    color: revealed ? RUNE_COLOR : "#1f2937",
                    transform: revealed && hovered?.rune === g.rune ? "scale(1.18)" : "scale(1)",
                    cursor: revealed ? "pointer" : "default",
                  }}
                >
                  {revealed ? g.rune : "·"}
                  {/* Bit overlay on hover */}
                  {revealed && hovered?.rune === g.rune && (
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-purple-400 whitespace-nowrap">
                      {g.bits}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      <div className="min-h-6 text-center transition-all duration-150">
        {hovered ? (
          <p className="text-[11px]" style={{ color: RUNE_COLOR }}>
            <span className="text-lg mr-2">{hovered.rune}</span>
            {runeDescription(hovered.rune)}
            <span className="text-gray-600 ml-2">· {hovered.bits}</span>
          </p>
        ) : (
          <p className="text-gray-700 text-[10px]">hover a rune to decode its meaning</p>
        )}
      </div>

      {/* Decoded trait confirmation */}
      {revealedCount > 0 && (
        <div className="border-t border-gray-800 pt-3 space-y-1">
          <p className="text-[10px] text-gray-600 text-center tracking-widest">CIPHER CONFIRMS</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              [traits.species,        "#a78bfa"],
              [`Gen ${traits.generation}`, "#38bdf8"],
              [traits.resonanceLabel, traits.resonanceLabel === "USDC" ? "#3b82f6" : "#f59e0b"],
              [traits.riskLabel + " Risk", traits.riskLabel === "High" ? "#ef4444" : "#22c55e"],
            ].map(([label, color]) => (
              <span
                key={label}
                className="px-2 py-0.5 rounded border text-[10px]"
                style={{ color, borderColor: color + "44", background: color + "11" }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {revealedCount === 0 && (
        <p className="text-center text-gray-700 text-[10px]">
          40 runes encoded in your pet&apos;s DNA · immutable since mint
        </p>
      )}
    </div>
  );
}
