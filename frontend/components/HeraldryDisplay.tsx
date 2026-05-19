"use client";

import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ADDRESSES, PET_HERALDRY_ABI, PET_NFT_ABI, PET_VAULT_ABI } from "@/lib/contracts";
import { decodeDNA, dnaToHex } from "@/lib/dna";
import type { OwnedPet } from "@/lib/nft";

// ── BioSpark color themes keyed by DeFi resonance ─────────────────────────────
const THEMES = {
  USDC: { primary: "#d4a030", bg: "#070500", glow1: "rgba(212,160,48,0.32)", glow2: "rgba(180,83,9,0.22)" },
  WETH: { primary: "#1e8cff", bg: "#030508", glow1: "rgba(30,140,255,0.32)", glow2: "rgba(100,180,255,0.18)" },
} as const;

const TIER_COLOR: Record<string, string> = {
  BRONZE: "#b45309", SILVER: "#94a3b8", GOLD: "#fbbf24", PLATINUM: "#e2e8f0",
};

const CHARGE_CREDIT    = 1 << 0;
const CHARGE_SAVINGS   = 1 << 1;
const CHARGE_YIELD     = 1 << 2;
const CHARGE_SOVEREIGN = 1 << 3;
const CHARGE_PACK      = 1 << 4;

// ── Runic tick marks SVG for outer ring ───────────────────────────────────────
function RuneTicks({ color }: { color: string }) {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 220 220">
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i * 22.5 * Math.PI) / 180;
        const major = i % 4 === 0;
        return (
          <line key={i}
            x1={110 + 103 * Math.cos(a)} y1={110 + 103 * Math.sin(a)}
            x2={110 + (major ? 92 : 96) * Math.cos(a)} y2={110 + (major ? 92 : 96) * Math.sin(a)}
            stroke={color} strokeWidth={major ? 2 : 1} opacity="0.85"
          />
        );
      })}
    </svg>
  );
}

interface Props {
  pet: OwnedPet;
}

const CSS = (p: string, tc: string, bg: string) => `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Rajdhani:wght@300;400;600&family=Share+Tech+Mono&display=swap');
  @keyframes hs-reveal   { from{opacity:0;transform:translate(-50%,-44%) scale(.95)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
  @keyframes hs-word     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes hs-bottom   { from{opacity:0;transform:translate(-50%,6px)} to{opacity:1;transform:translate(-50%,0)} }
  @keyframes hs-g1       { 0%,100%{transform:translateX(-50%) scale(1);opacity:.32} 50%{transform:translateX(-50%) scale(1.14);opacity:.48} }
  @keyframes hs-g2       { 0%,100%{transform:scale(1);opacity:.22} 50%{transform:scale(1.18);opacity:.36} }
  @keyframes hs-grid     { 0%,100%{opacity:.07} 50%{opacity:.13} }
  @keyframes hs-outer    { from{transform:translate(-50%,-50%) rotate(0deg)} to{transform:translate(-50%,-50%) rotate(360deg)} }
  @keyframes hs-inner    { from{transform:translate(-50%,-50%) rotate(0deg)} to{transform:translate(-50%,-50%) rotate(-360deg)} }
  @keyframes hs-heart    { 0%,100%{transform:scale(1);box-shadow:0 0 10px ${p}88} 14%{transform:scale(1.38);box-shadow:0 0 22px ${p}cc} 28%{transform:scale(1)} 42%{transform:scale(1.16);box-shadow:0 0 16px ${p}aa} 56%{transform:scale(1)} }
  @keyframes hs-pip1     { 0%,85%,100%{opacity:1} 90%{opacity:.2} }
  @keyframes hs-pip2     { 0%,70%,100%{opacity:1} 75%{opacity:.2} }
  @keyframes hs-pip3     { 0%,55%,100%{opacity:1} 60%{opacity:.2} }
  @keyframes hs-f0       { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes hs-f1       { 0%,100%{transform:translateY(0)} 50%{transform:translateY(7px)} }
  @keyframes hs-f2       { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
`;

export function HeraldryDisplay({ pet }: Props) {
  const { address } = useAccount();
  const petName = pet.metadata?.name ?? `Pet #${pet.tokenId}`;

  const { data: dna } = useReadContract({
    address: ADDRESSES.petNFT,
    abi: PET_NFT_ABI,
    functionName: "tokenDNA",
    args: [pet.tokenId],
  });

  const { data: svg } = useReadContract({
    address: ADDRESSES.petHeraldry as `0x${string}`,
    abi: PET_HERALDRY_ABI,
    functionName: "getHeraldrySVG",
    args: [pet.tokenId, petName],
    query: { enabled: !!ADDRESSES.petHeraldry },
  });

  const { data: chargesBN } = useReadContract({
    address: ADDRESSES.petHeraldry as `0x${string}`,
    abi: PET_HERALDRY_ABI,
    functionName: "charges",
    args: [pet.tokenId],
    query: { enabled: !!ADDRESSES.petHeraldry },
  });

  const { data: usdcSaved } = useReadContract({
    address: ADDRESSES.usdcVault,
    abi: PET_VAULT_ABI,
    functionName: "deposits",
    args: address ? [pet.tokenId, address] : undefined,
    query: { enabled: !!address },
  });

  const traits = useMemo(() => (dna !== undefined ? decodeDNA(dna) : null), [dna]);
  const charges = Number(chargesBN ?? 0n);
  const saved = usdcSaved ?? 0n;

  const theme = THEMES[traits?.resonanceLabel ?? "USDC"];
  const p  = theme.primary;
  const bg = theme.bg;

  const tier =
    saved >= 10_000n * 1_000_000n ? "PLATINUM" :
    saved >= 1_000n  * 1_000_000n ? "GOLD"     :
    saved >= 100n    * 1_000_000n ? "SILVER"   : "BRONZE";
  const tc = TIER_COLOR[tier];

  const dnaHex = dna !== undefined ? dnaToHex(dna) : "0x" + "0".repeat(64);

  const fragments = traits ? [
    { text: `DNA:${dnaHex.slice(2, 10).toUpperCase()}`, x: "4%",  y: "10%", fi: 0 },
    { text: `GEN:${traits.generation}`,                 x: "86%", y: "8%",  fi: 1 },
    { text: `VIT:${traits.vitality}`,                   x: "3%",  y: "70%", fi: 2 },
    { text: `LOY:${traits.loyalty}`,                    x: "84%", y: "75%", fi: 0 },
    { text: `INT:${traits.intelligence}`,               x: "90%", y: "42%", fi: 1 },
    { text: traits.species.toUpperCase(),               x: "2%",  y: "42%", fi: 2 },
  ] : [];

  const pips = [
    (charges & CHARGE_SAVINGS)   ? { dot: "#22c55e", label: "SAVINGS"   } : null,
    (charges & CHARGE_YIELD)     ? { dot: "#34d399", label: "YIELD"     } : null,
    (charges & CHARGE_CREDIT)    ? { dot: "#f59e0b", label: "CREDIT"    } : null,
    (charges & CHARGE_SOVEREIGN) ? { dot: "#a855f7", label: "SOVEREIGN" } : null,
    (charges & CHARGE_PACK)      ? { dot: "#06b6d4", label: "PACK"      } : null,
  ].filter(Boolean) as { dot: string; label: string }[];

  const svgUrl = svg ? `data:image/svg+xml,${encodeURIComponent(svg)}` : null;
  const pipAnims = ["hs-pip1", "hs-pip2", "hs-pip3"];

  return (
    <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto", fontFamily: "'Rajdhani',sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS(p, tc, bg) }} />

      {/* 800×540 proportional card */}
      <div style={{ width: "100%", paddingTop: "67.5%", position: "relative", borderRadius: "12px", overflow: "hidden", background: bg }}>
        <div style={{ position: "absolute", inset: 0 }}>

          {/* Layer 1 — Background grid */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `linear-gradient(${p}18 1px,transparent 1px),linear-gradient(90deg,${p}18 1px,transparent 1px)`,
            backgroundSize: "40px 40px",
            animation: "hs-grid 12s ease-in-out infinite",
          }} />

          {/* Layer 2 — Glow blobs */}
          <div style={{ position: "absolute", width: "44%", height: "40%", top: "-8%", left: "50%", background: theme.glow1, borderRadius: "50%", filter: "blur(70px)", animation: "hs-g1 13s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: "38%", height: "35%", bottom: "-8%", left: "30%", background: theme.glow2, borderRadius: "50%", filter: "blur(65px)", animation: "hs-g2 17s ease-in-out infinite" }} />

          {/* Layer 3 — Thematic SVG: lineage network */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 800 540" preserveAspectRatio="xMidYMid slice">
            <g stroke={p} fill="none" opacity="0.2">
              <line x1="0"   y1="90"  x2="800" y2="450" strokeWidth="0.5" />
              <line x1="200" y1="0"   x2="580" y2="540" strokeWidth="0.5" />
              <line x1="800" y1="110" x2="20"  y2="430" strokeWidth="0.5" />
              {([[160,80],[640,120],[90,420],[710,380],[400,500]] as [number,number][]).map(([cx,cy],i) => (
                <circle key={i} cx={cx} cy={cy} r="3" fill={p} opacity="0.45" />
              ))}
              {Array.from({ length: 5 }).map((_, i) => (
                <ellipse key={i} cx="400" cy={80 + i * 72} rx="26" ry="7" strokeWidth="0.4" opacity={0.14 - i * 0.02} />
              ))}
            </g>
          </svg>

          {/* Layer 4 — Vignette */}
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 58% 60% at 50% 50%,transparent 18%,${bg} 82%)` }} />

          {/* Corner marks */}
          {([
            { top: "16px",    left: "16px",  borderTop: `1.5px solid ${p}`, borderLeft:  `1.5px solid ${p}` },
            { top: "16px",    right: "16px", borderTop: `1.5px solid ${p}`, borderRight: `1.5px solid ${p}` },
            { bottom: "16px", left: "16px",  borderBottom: `1.5px solid ${p}`, borderLeft:  `1.5px solid ${p}` },
            { bottom: "16px", right: "16px", borderBottom: `1.5px solid ${p}`, borderRight: `1.5px solid ${p}` },
          ] as React.CSSProperties[]).map((s, i) => (
            <div key={i} style={{ position: "absolute", width: "24px", height: "24px", opacity: 0.35, ...s }} />
          ))}

          {/* Floating fragments */}
          {fragments.map((f, i) => (
            <span key={i} style={{
              position: "absolute", left: f.x, top: f.y,
              fontFamily: "'Share Tech Mono',monospace", fontSize: "9px",
              color: p, opacity: 0.55, pointerEvents: "none",
              animation: `hs-f${f.fi} ${9 + i * 1.3}s ease-in-out ${i * 0.7}s infinite`,
            }}>{f.text}</span>
          ))}

          {/* Layer 5 — The Seal (floats into place) */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "14px",
            animation: "hs-reveal 1.8s cubic-bezier(0.16,1,0.3,1) 0.4s forwards",
            opacity: 0, zIndex: 10,
          }}>
            {/* Ring system */}
            <div style={{ position: "relative", width: "220px", height: "220px" }}>

              {/* Outer runic ring — spins clockwise */}
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                width: "220px", height: "220px", marginLeft: "-110px", marginTop: "-110px",
                borderRadius: "50%",
                border: `1.5px solid ${tc}99`,
                boxShadow: `0 0 18px ${tc}44`,
                animation: "hs-outer 30s linear infinite",
              }}>
                <RuneTicks color={tc} />
              </div>

              {/* Inner ring — counter-spins */}
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                width: "170px", height: "170px", marginLeft: "-85px", marginTop: "-85px",
                borderRadius: "50%", border: `1px solid ${p}55`,
                animation: "hs-inner 20s linear infinite",
              }} />

              {/* Escutcheon — the on-chain coat of arms */}
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                width: "144px", height: "144px", marginLeft: "-72px", marginTop: "-72px",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}>
                {svgUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={svgUrl} alt="Coat of Arms" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: `${tc}18`, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "52px" }}>🐾</div>
                )}
              </div>

              {/* Core dot — the heartbeat */}
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                width: "16px", height: "16px", marginLeft: "-8px", marginTop: "-8px",
                borderRadius: "50%",
                background: `radial-gradient(circle,#fff 0%,${p} 50%,${tc} 100%)`,
                boxShadow: `0 0 10px ${p}88`,
                animation: "hs-heart 2.4s ease-in-out infinite",
                zIndex: 2, pointerEvents: "none",
              }} />
            </div>

            {/* Wordmark */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
              animation: "hs-word 1.5s cubic-bezier(0.16,1,0.3,1) 0.8s forwards",
              opacity: 0,
            }}>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: "11px", color: p, opacity: 0.65, letterSpacing: "0.5em", textTransform: "uppercase" }}>BIOSPARK</span>
              <span style={{
                fontFamily: "'Cinzel',serif", fontSize: "clamp(18px,3.5vw,34px)", fontWeight: 700,
                letterSpacing: "0.06em",
                background: `linear-gradient(135deg,${p},${tc})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                filter: `drop-shadow(0 0 16px ${p}88)`,
                whiteSpace: "nowrap", maxWidth: "360px", overflow: "hidden", textOverflow: "ellipsis",
              }}>{petName.toUpperCase()}</span>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: p, opacity: 0.38, letterSpacing: "0.2em" }}>
                TOKEN #{pet.tokenId.toString()} · {tier} LINEAGE
              </span>
            </div>
          </div>

          {/* Bottom info row */}
          <div style={{
            position: "absolute", top: "80%", left: "50%",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
            width: "100%",
            animation: "hs-bottom 1s ease 1.1s forwards",
            opacity: 0, zIndex: 10,
          }}>
            {/* Tagline */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "1px", background: `linear-gradient(90deg,transparent,${p})` }} />
              <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "11px", color: p, opacity: 0.48, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                {traits?.species ?? "PET"}{traits ? ` · GEN ${traits.generation}` : ""} HERALDRY
              </span>
              <div style={{ width: "36px", height: "1px", background: `linear-gradient(90deg,${p},transparent)` }} />
            </div>

            {/* Status pips */}
            {pips.length > 0 && (
              <div style={{ display: "flex", gap: "16px" }}>
                {pips.slice(0, 5).map((pip, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: pip.dot, boxShadow: `0 0 6px ${pip.dot}`, animation: `${pipAnims[i % 3]} ${2.8 + i * 0.4}s ease-in-out infinite` }} />
                    <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: pip.dot, textTransform: "uppercase" }}>{pip.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Version tag */}
          <span style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: p, opacity: 0.22, textTransform: "uppercase", whiteSpace: "nowrap" }}>
            AavePet · BioSpark DNA · Quantum Ecosystem · v1.0
          </span>

        </div>
      </div>
    </div>
  );
}
