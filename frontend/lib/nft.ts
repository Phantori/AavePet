import { ipfsToHttp } from "./pinata";

export interface PetMetadata {
  name: string;
  description?: string;
  image: string;
}

export interface OwnedPet {
  tokenId: bigint;
  tokenURI: string;
  metadata: PetMetadata | null;
}

export async function fetchMetadata(uri: string): Promise<PetMetadata | null> {
  try {
    const url = uri.startsWith("ipfs://")
      ? ipfsToHttp(uri.replace("ipfs://", ""))
      : uri;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.image?.startsWith("ipfs://")) {
      json.image = ipfsToHttp(json.image.replace("ipfs://", ""));
    }
    return json as PetMetadata;
  } catch {
    return null;
  }
}
