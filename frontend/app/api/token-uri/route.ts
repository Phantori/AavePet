import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { ADDRESSES, PET_NFT_ABI } from "@/lib/contracts";

const client = createPublicClient({ chain: base, transport: http() });

export async function GET(req: NextRequest) {
  const tokenId = BigInt(req.nextUrl.searchParams.get("tokenId") ?? "0");

  try {
    const uri = await client.readContract({
      address: ADDRESSES.petNFT,
      abi: PET_NFT_ABI,
      functionName: "tokenURI",
      args: [tokenId],
    });

    return NextResponse.json({ uri });
  } catch {
    return NextResponse.json({ error: "Failed to fetch token URI" }, { status: 500 });
  }
}
