import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { ADDRESSES, MARKETPLACE_ABI } from "@/lib/contracts";

const client = createPublicClient({ chain: base, transport: http() });

export async function GET(req: NextRequest) {
  const tokenId = BigInt(req.nextUrl.searchParams.get("tokenId") ?? "0");

  try {
    const [seller, price, active] = await client.readContract({
      address: ADDRESSES.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: "listings",
      args: [tokenId],
    });

    return NextResponse.json({
      seller,
      price: price.toString(),
      active,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch listing" }, { status: 500 });
  }
}
