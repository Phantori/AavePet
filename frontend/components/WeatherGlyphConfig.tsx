"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, WEATHER_GLYPH_ABI } from "@/lib/contracts";
import { ZONE_LABELS, ZONE_IDS, currentSeason, nowUtcMonth, getAmbientTheme, type ClimateZone } from "@/lib/weatherGlyph";

const ZONE_DESCRIPTIONS: Record<ClimateZone, string> = {
  Unset:     "No preference — use default DeFi resonance theme",
  Temperate: "Four distinct seasons, moderate climate",
  Tropical:  "Warm year-round, wet/dry seasons",
  Arid:      "Hot dry climate, desert landscape",
  Arctic:    "Polar, extreme cold, midnight sun",
  Oceanic:   "Mild, maritime, rainy winters",
};

const HEMISPHERE_OPTIONS = ["Northern", "Southern"] as const;

export function WeatherGlyphConfig() {
  const { address } = useAccount();
  const [zone, setZone] = useState<ClimateZone>("Temperate");
  const [hemisphere, setHemisphere] = useState<"Northern" | "Southern">("Northern");

  const { data: config } = useReadContract({
    address: ADDRESSES.weatherGlyph as `0x${string}`,
    abi: WEATHER_GLYPH_ABI,
    functionName: "getConfig",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!ADDRESSES.weatherGlyph },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (!ADDRESSES.weatherGlyph) {
    return <p className="text-xs text-gray-500">WeatherGlyph contract not yet deployed.</p>;
  }

  const month = nowUtcMonth();
  const season = currentSeason(month, hemisphere);
  const preview = getAmbientTheme(zone, season);

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Declare your climate zone to tune the ambient heraldry theme to your real-world environment.
        Your wallet address is never geolocated — you choose what to share.
      </p>

      {/* Zone picker */}
      <div className="grid grid-cols-2 gap-2">
        {ZONE_LABELS.filter(z => z !== "Unset").map((z) => (
          <button
            key={z}
            onClick={() => setZone(z)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all border ${
              zone === z
                ? "border-brand-500 bg-brand-900/30 text-brand-300"
                : "border-gray-800 text-gray-500 hover:border-gray-600"
            }`}
          >
            <span className="block font-bold">{z}</span>
            <span className="text-[10px] opacity-70">{ZONE_DESCRIPTIONS[z]}</span>
          </button>
        ))}
      </div>

      {/* Hemisphere */}
      <div className="flex gap-3">
        {HEMISPHERE_OPTIONS.map((h) => (
          <button
            key={h}
            onClick={() => setHemisphere(h)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors border ${
              hemisphere === h
                ? "border-brand-500 bg-brand-900/30 text-brand-300"
                : "border-gray-800 text-gray-500 hover:border-gray-600"
            }`}
          >
            {h} Hemisphere
          </button>
        ))}
      </div>

      {/* Live preview */}
      <div
        className="rounded-lg p-3 border text-xs"
        style={{ borderColor: preview.primary + "44", background: preview.bg }}
      >
        <div className="flex items-center justify-between">
          <span style={{ color: preview.primary }} className="font-semibold">{preview.label}</span>
          <span className="text-gray-600">{season} · Month {month}</span>
        </div>
        <div className="mt-2 flex gap-2">
          <div className="w-6 h-6 rounded-full" style={{ background: preview.glow1, boxShadow: `0 0 8px ${preview.primary}` }} />
          <div className="w-6 h-6 rounded-full" style={{ background: preview.glow2 }} />
          <span className="text-gray-500 self-center">ambient preview</span>
        </div>
      </div>

      {isSuccess ? (
        <p className="text-green-400 text-xs">Climate zone saved on-chain!</p>
      ) : (
        <button
          onClick={() => writeContract({
            address: ADDRESSES.weatherGlyph as `0x${string}`,
            abi: WEATHER_GLYPH_ABI,
            functionName: "configure",
            args: [ZONE_IDS[zone], hemisphere === "Northern" ? 0 : 1],
          })}
          disabled={isPending || isLoading}
          className="w-full bg-brand-700 hover:bg-brand-600 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
        >
          {isPending || isLoading ? "Saving…" : "Save Climate Zone"}
        </button>
      )}
    </div>
  );
}
