import { ConnectButton } from "@/components/ConnectButton";
import { MintNFT } from "@/components/MintNFT";
import { Marketplace } from "@/components/Marketplace";

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-bold text-brand-500">🐾 AavePet</h1>
          <p className="text-gray-400 text-sm mt-1">DeFi for your best friend</p>
        </div>
        <nav className="flex items-center gap-4">
          <a href="/dashboard" className="text-sm text-gray-400 hover:text-gray-50 transition-colors">Dashboard</a>
          <a href="/browse" className="text-sm text-gray-400 hover:text-gray-50 transition-colors">Browse</a>
          <a href="/services" className="text-sm text-gray-400 hover:text-gray-50 transition-colors">Services</a>
          <a href="/my-pets" className="text-sm text-gray-400 hover:text-gray-50 transition-colors">My Pets</a>
          <ConnectButton />
        </nav>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold mb-4">Mint your Pet NFT</h2>
          <MintNFT />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Marketplace</h2>
          <Marketplace />
        </section>
      </div>
    </main>
  );
}
