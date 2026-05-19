"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, MERCHANT_GLYPH_ABI, PET_NFT_ABI, ERC20_ABI } from "@/lib/contracts";
import { BASE_TOKENS } from "@/lib/contracts";
import { parseUnits, formatUnits } from "viem";

const KIOSK_SIZES = [
  { value: 0, label: "Sprite", desc: "Day-hike, small breeds" },
  { value: 1, label: "Ranger", desc: "Weekend camping" },
  { value: 2, label: "Behemoth", desc: "Full expedition" },
] as const;

const BADGE_TITLES = ["None", "Trail Helper", "Trail Friend", "Trail Medic", "Trail Guardian", "Sovereign Trail-Medic"];
const BADGE_MILESTONES = [0, 1, 5, 10, 25, 50];

function formatCoord(raw: number | undefined, axis: "lat" | "lon"): string {
  if (raw === undefined) return "—";
  const deg = raw / 1e7;
  const abs = Math.abs(deg).toFixed(4);
  const dir = axis === "lat" ? (deg >= 0 ? "N" : "S") : (deg >= 0 ? "E" : "W");
  return `${abs}°${dir}`;
}

interface Props {
  tokenId: bigint;
}

export function MerchantGlyphPanel({ tokenId }: Props) {
  const { address } = useAccount();

  const [selectedSize, setSelectedSize] = useState(1); // Ranger default
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [guestInput, setGuestInput] = useState("");

  if (!ADDRESSES.merchantGlyph) {
    return <p className="text-xs text-gray-500">MerchantGlyph contract not yet deployed.</p>;
  }

  const { data: glyph, refetch: refetchGlyph } = useReadContract({
    address: ADDRESSES.merchantGlyph,
    abi: MERCHANT_GLYPH_ABI,
    functionName: "merchantGlyphs",
    args: [tokenId],
  });

  const { data: badgeLevel } = useReadContract({
    address: ADDRESSES.merchantGlyph,
    abi: MERCHANT_GLYPH_ABI,
    functionName: "hospitalityBadge",
    args: [tokenId],
  });

  const { data: activeKiosks } = useReadContract({
    address: ADDRESSES.merchantGlyph,
    abi: MERCHANT_GLYPH_ABI,
    functionName: "activeKioskCount",
  });

  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproving, isSuccess: isApproved } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const { writeContract: writeDeploy, data: deployTxHash, isPending: isDeployPending } = useWriteContract();
  const { isLoading: isDeploying, isSuccess: isDeployed } = useWaitForTransactionReceipt({ hash: deployTxHash });

  const { writeContract: writeRetract, data: retractTxHash, isPending: isRetractPending } = useWriteContract();
  const { isLoading: isRetracting, isSuccess: isRetracted } = useWaitForTransactionReceipt({ hash: retractTxHash });

  const { writeContract: writeCheckIn, data: checkInTxHash, isPending: isCheckInPending } = useWriteContract();
  const { isLoading: isCheckingIn, isSuccess: isCheckedIn } = useWaitForTransactionReceipt({ hash: checkInTxHash });

  const state: number = glyph ? Number(glyph[1]) : 0;
  const isActive = state === 1 || state === 2;
  const isRestStation = state === 2;
  const activeGuests: number = glyph ? Number(glyph[6]) : 0;
  const lifetimeHospitality: number = glyph ? Number(glyph[4]) : 0;
  const badge: number = badgeLevel ? Number(badgeLevel) : 0;

  const nextMilestone = BADGE_MILESTONES.find(m => m > lifetimeHospitality) ?? null;

  const handleGps = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatInput(Math.round(pos.coords.latitude * 1e7).toString());
        setLonInput(Math.round(pos.coords.longitude * 1e7).toString());
        setGpsLoading(false);
      },
      () => setGpsLoading(false)
    );
  };

  const handleApproveUsdc = () => {
    writeApprove({
      address: BASE_TOKENS.USDC,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ADDRESSES.merchantGlyph, parseUnits("10", 6)], // 10 USDC allowance for multiple check-ins
    });
  };

  const handleDeploy = () => {
    if (!latInput || !lonInput) return;
    writeDeploy({
      address: ADDRESSES.merchantGlyph,
      abi: MERCHANT_GLYPH_ABI,
      functionName: "deployKiosk",
      args: [tokenId, selectedSize, parseInt(latInput), parseInt(lonInput)],
    });
  };

  const handleRetract = () => {
    writeRetract({
      address: ADDRESSES.merchantGlyph,
      abi: MERCHANT_GLYPH_ABI,
      functionName: "retractKiosk",
      args: [tokenId],
    });
  };

  const handleCheckIn = () => {
    if (!guestInput) return;
    writeCheckIn({
      address: ADDRESSES.merchantGlyph,
      abi: MERCHANT_GLYPH_ABI,
      functionName: "checkInGuest",
      args: [BigInt(guestInput), tokenId],
    });
  };

  // ── Active kiosk view ─────────────────────────────────────────────────────
  if (isActive && !isRetracted) {
    const lat = glyph ? Number(glyph[2]) : 0;
    const lon = glyph ? Number(glyph[3]) : 0;

    return (
      <div className="space-y-3">
        {/* Status banner */}
        <div className={`rounded-lg border p-3 space-y-2 ${
          isRestStation
            ? "border-amber-800 bg-amber-950/20"
            : "border-emerald-800 bg-emerald-950/20"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full animate-pulse ${
                isRestStation ? "bg-amber-400" : "bg-emerald-400"
              }`} />
              <span className={`text-xs font-semibold ${isRestStation ? "text-amber-300" : "text-emerald-300"}`}>
                {isRestStation ? "Rest Station — Hosting Guests" : "Aegis Rover Active"}
              </span>
            </div>
            <span className="text-xs text-gray-500">{activeKiosks?.toString() ?? "—"}/4096 global</span>
          </div>
          <div className="text-xs text-gray-400 grid grid-cols-2 gap-y-1">
            <span>Location</span>
            <span className="text-gray-200">{formatCoord(lat, "lat")} {formatCoord(lon, "lon")}</span>
            <span>Active guests</span>
            <span className="text-gray-200">{activeGuests}</span>
            <span>Lifetime visits</span>
            <span className="text-gray-200">{lifetimeHospitality}</span>
          </div>
        </div>

        {/* Badge status */}
        <div className="rounded-lg bg-gray-900 p-2.5 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Hospitality badge</span>
            <span className={badge > 0 ? "text-brand-300 font-semibold" : "text-gray-600"}>
              {BADGE_TITLES[badge]}
            </span>
          </div>
          {nextMilestone && (
            <div className="flex justify-between">
              <span className="text-gray-600">Next badge at</span>
              <span className="text-gray-400">{nextMilestone} guests</span>
            </div>
          )}
          {badge === 5 && (
            <p className="text-amber-400 text-[10px]">✦ Maximum rank achieved</p>
          )}
        </div>

        {/* Guest check-in */}
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400">Check in a trail guest (1 USDC fee from guest)</p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Guest pet token ID"
              value={guestInput}
              onChange={(e) => setGuestInput(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              onClick={handleApproveUsdc}
              disabled={isApprovePending || isApproving || isApproved}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded px-2 py-1.5 text-xs font-semibold whitespace-nowrap"
            >
              {isApproved ? "✓" : isApprovePending || isApproving ? "…" : "Approve"}
            </button>
            <button
              onClick={handleCheckIn}
              disabled={isCheckInPending || isCheckingIn || !guestInput}
              className="bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 rounded px-2 py-1.5 text-xs font-semibold text-emerald-100 whitespace-nowrap"
            >
              {isCheckedIn ? "✓ In!" : isCheckInPending || isCheckingIn ? "…" : "Check In"}
            </button>
          </div>
        </div>

        {/* Retract */}
        <button
          onClick={handleRetract}
          disabled={isRetractPending || isRetracting}
          className="w-full border border-gray-700 hover:border-gray-500 disabled:opacity-50 rounded-lg px-4 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          {isRetractPending || isRetracting ? "Packing up…" : "Retract Kiosk"}
        </button>
      </div>
    );
  }

  // ── Deploy view ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Deploy your Aegis Rover portable sanctuary on-trail. Your pet&apos;s Coat of Arms receives
        a live Merchant Glyph visible to nearby app users. Requires non-zero vault yield as
        capital proof.
      </p>

      {/* Size picker */}
      <div>
        <p className="text-xs text-gray-400 mb-1.5">Chassis size</p>
        <div className="grid grid-cols-3 gap-1.5">
          {KIOSK_SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelectedSize(s.value)}
              className={`rounded-lg px-2 py-2 text-left transition-colors border ${
                selectedSize === s.value
                  ? "border-brand-500 bg-brand-900/30 text-brand-300"
                  : "border-gray-800 text-gray-500 hover:border-gray-600"
              }`}
            >
              <span className="block text-xs font-bold">{s.label}</span>
              <span className="text-[10px] opacity-70">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Coordinates */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Trail coordinates (×1e7)</p>
          <button
            onClick={handleGps}
            disabled={gpsLoading}
            className="text-[10px] text-brand-400 hover:underline disabled:opacity-50"
          >
            {gpsLoading ? "Locating…" : "Use GPS"}
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Lat × 1e7 (e.g. 377749000)"
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            type="number"
            placeholder="Lon × 1e7"
            value={lonInput}
            onChange={(e) => setLonInput(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        {latInput && lonInput && (
          <p className="text-[10px] text-gray-500">
            {formatCoord(parseInt(latInput), "lat")} · {formatCoord(parseInt(lonInput), "lon")}
          </p>
        )}
      </div>

      {/* Global capacity */}
      <div className="rounded bg-gray-900 px-3 py-2 text-xs flex justify-between">
        <span className="text-gray-500">Global kiosks active</span>
        <span className="text-gray-300">{activeKiosks?.toString() ?? "…"} / 4 096</span>
      </div>

      {isDeployed ? (
        <p className="text-green-400 text-xs">Aegis Rover deployed! Your Merchant Glyph is now live.</p>
      ) : (
        <button
          onClick={handleDeploy}
          disabled={isDeployPending || isDeploying || !latInput || !lonInput}
          className="w-full bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold text-emerald-100 transition-colors"
        >
          {isDeployPending || isDeploying ? "Deploying…" : "Deploy Aegis Rover"}
        </button>
      )}
    </div>
  );
}
