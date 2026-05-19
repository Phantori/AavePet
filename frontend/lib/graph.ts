const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL ?? "";

async function query<T>(gql: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql, variables }),
    next: { revalidate: 30 }, // Next.js ISR — refresh every 30s
  });
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(errors[0].message);
  return data as T;
}

// ── Queries ──────────────────────────────────────────────────────────────────

export interface GraphPet {
  id: string;
  tokenId: string;
  owner: string;
  creator: string;
  tokenURI: string;
  mintedAt: string;
  listing: { price: string; active: boolean } | null;
}

export interface GraphListing {
  id: string;
  pet: GraphPet;
  seller: string;
  price: string;
  listedAt: string;
}

export interface GraphProtocol {
  totalPetsMinted: string;
  totalVolume: string;
  totalUsdcSaved: string;
  totalWethSaved: string;
}

const PET_FIELDS = `
  id
  tokenId
  owner
  creator
  tokenURI
  mintedAt
  listing { price active }
`;

export async function getPetsByOwner(owner: string): Promise<GraphPet[]> {
  const { pets } = await query<{ pets: GraphPet[] }>(
    `query PetsByOwner($owner: String!) {
      pets(where: { owner: $owner }, orderBy: mintedAt, orderDirection: desc, first: 100) {
        ${PET_FIELDS}
      }
    }`,
    { owner: owner.toLowerCase() }
  );
  return pets;
}

export async function getActiveListings(skip = 0, first = 50): Promise<GraphListing[]> {
  const { listings } = await query<{ listings: GraphListing[] }>(
    `query ActiveListings($skip: Int!, $first: Int!) {
      listings(
        where: { active: true }
        orderBy: listedAt
        orderDirection: desc
        skip: $skip
        first: $first
      ) {
        id
        seller
        price
        listedAt
        pet { ${PET_FIELDS} }
      }
    }`,
    { skip, first }
  );
  return listings;
}

export async function getProtocolStats(): Promise<GraphProtocol | null> {
  const { protocol } = await query<{ protocol: GraphProtocol | null }>(
    `query ProtocolStats {
      protocol(id: "protocol") {
        totalPetsMinted
        totalVolume
        totalUsdcSaved
        totalWethSaved
      }
    }`
  );
  return protocol;
}
