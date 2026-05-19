"use client";

import { useEffect, useRef, useState } from "react";
import { decodeDNA, binaryArt, dnaToHex, type DNATraits } from "@/lib/dna";

interface Props {
  dna: bigint;
}

const STAT_LABELS: [keyof DNATraits, string, string][] = [
  ["vitality",     "VIT", "#22c55e"],
  ["intelligence", "INT", "#3b82f6"],
  ["loyalty",      "LOY", "#f59e0b"],
];

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className="w-8 text-gray-500">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(value / 255) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

export function DNAMatrix({ dna }: Props) {
  const traits = decodeDNA(dna);
  const art = binaryArt(dna, 160);
  const hex = dnaToHex(dna);

  const [revealed, setRevealed] = useState(0);
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate the binary reveal character by character
  useEffect(() => {
    setRevealed(0);
    let i = 0;
    const tick = () => {
      i += 4;
      setRevealed(Math.min(i, art.length));
      if (i < art.length) frameRef.current = setTimeout(tick, 12);
    };
    frameRef.current = setTimeout(tick, 100);
    return () => { if (frameRef.current) clearTimeout(frameRef.current); };
  }, [dna, art.length]);

  const visibleArt = art.slice(0, revealed).padEnd(art.length, " ");
  // Display as 8 rows of 20 chars
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) rows.push(visibleArt.slice(r * 20, r * 20 + 20));

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-4 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-green-400 tracking-widest">◈ BIOSPARK DNA</span>
        <span className="text-gray-600 text-[10px]">{hex.slice(0, 10)}…</span>
      </div>

      {/* Binary art grid */}
      <div className="space-y-0.5">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-0.5">
            <span className="text-gray-700 w-6 select-none">{(i * 20).toString(16).padStart(2, "0")}</span>
            {row.split("").map((ch, j) => (
              <span
                key={j}
                className={`w-3 text-center select-none ${
                  ch === "1"
                    ? "text-green-400"
                    : ch === "0"
                    ? "text-gray-700"
                    : "text-transparent"
                }`}
              >
                {ch}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Trait chips */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-800">
        {[
          [traits.species,        "#a78bfa"],
          [`Gen ${traits.generation}`, "#38bdf8"],
          [traits.riskLabel + " Risk", traits.riskLabel === "High" ? "#ef4444" : traits.riskLabel === "Medium" ? "#f59e0b" : "#22c55e"],
          [traits.resonanceLabel, traits.resonanceLabel === "USDC" ? "#3b82f6" : "#f59e0b"],
        ].map(([label, color]) => (
          <span
            key={label}
            className="px-2 py-0.5 rounded text-[10px] border"
            style={{ color, borderColor: color + "55", backgroundColor: color + "11" }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Stat bars */}
      <div className="space-y-1.5 pt-1 border-t border-gray-800">
        {STAT_LABELS.map(([key, label, color]) => (
          <StatBar key={key} label={label} value={traits[key] as number} color={color} />
        ))}
      </div>
    </div>
  );
}
