const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const GATEWAY = "https://gateway.pinata.cloud/ipfs";

export async function uploadImageToPinata(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append(
    "pinataMetadata",
    JSON.stringify({ name: `aavepet-image-${Date.now()}` })
  );

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Pinata image upload failed: ${res.statusText}`);
  const { IpfsHash } = await res.json();
  return IpfsHash;
}

export async function uploadMetadataToPinata(metadata: object): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: `aavepet-metadata-${Date.now()}` },
    }),
  });

  if (!res.ok) throw new Error(`Pinata metadata upload failed: ${res.statusText}`);
  const { IpfsHash } = await res.json();
  return IpfsHash;
}

export function ipfsToHttp(cid: string): string {
  return `${GATEWAY}/${cid}`;
}
