"use client";

import { useState, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, PET_NFT_ABI } from "@/lib/contracts";
import { uploadImageToPinata, uploadMetadataToPinata } from "@/lib/pinata";

type UploadStep = "idle" | "uploading-image" | "uploading-metadata" | "confirm" | "minting" | "done";

export function MintNFT() {
  const { isConnected } = useAccount();
  const [step, setStep] = useState<UploadStep>("idle");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metadataUri, setMetadataUri] = useState("");

  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type.startsWith("image/")) {
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
      setPreview(URL.createObjectURL(picked));
    }
  };

  const handleUploadAndMint = async () => {
    if (!file || !name.trim()) return;
    setError("");

    try {
      setStep("uploading-image");
      const imageCid = await uploadImageToPinata(file);

      setStep("uploading-metadata");
      const metadataCid = await uploadMetadataToPinata({
        name: name.trim(),
        description: description.trim(),
        image: `ipfs://${imageCid}`,
        attributes: [],
      });

      const uri = `ipfs://${metadataCid}`;
      setMetadataUri(uri);
      setStep("confirm");

      writeContract({
        address: ADDRESSES.petNFT,
        abi: PET_NFT_ABI,
        functionName: "mint",
        args: [uri],
      });
      setStep("minting");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("idle");
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-xl border border-green-800 bg-green-950/30 p-6 space-y-2">
        <p className="text-green-400 font-semibold">Pet NFT minted!</p>
        <p className="text-xs text-gray-400 break-all">Metadata: {metadataUri}</p>
        <p className="text-xs text-gray-400 break-all">Tx: {txHash}</p>
        <button
          onClick={() => { setStep("idle"); setFile(null); setPreview(null); setName(""); setDescription(""); }}
          className="text-xs text-brand-400 hover:underline"
        >
          Mint another
        </button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-gray-800 p-6 text-gray-400 text-sm">
        Connect your wallet to mint a pet NFT.
      </div>
    );
  }

  const isBusy = step === "uploading-image" || step === "uploading-metadata" || step === "minting" || isConfirming;

  return (
    <div className="rounded-xl border border-gray-800 p-6 space-y-4">
      {/* Image drop zone */}
      <label
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="block w-full cursor-pointer"
      >
        {preview ? (
          <img
            src={preview}
            alt="Pet preview"
            className="w-full h-48 object-cover rounded-lg border border-gray-700"
          />
        ) : (
          <div className="w-full h-48 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-700 hover:border-brand-500 transition-colors text-gray-500 text-sm gap-2">
            <span className="text-3xl">📸</span>
            <span>Drop a photo or click to browse</span>
          </div>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      </label>

      <div>
        <input
          type="text"
          placeholder="Pet name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2"
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        onClick={handleUploadAndMint}
        disabled={isBusy || !file || !name.trim()}
        className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
      >
        {step === "uploading-image" && "Uploading image to IPFS..."}
        {step === "uploading-metadata" && "Uploading metadata to IPFS..."}
        {(step === "minting" || isConfirming) && "Confirm in wallet / minting..."}
        {(step === "idle" || step === "confirm") && "Upload & Mint"}
      </button>
    </div>
  );
}
