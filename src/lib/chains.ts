import type { Chain } from "viem";

export const monadTestnet = {
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 10143),
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_MONAD_RPC!] },
    public:  { http: [process.env.NEXT_PUBLIC_MONAD_RPC!] },
  },
  // explorer'in yoksa blockExplorers bölümünü tamamen kaldırabilirsin
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.testnet.monad.xyz" },
  },
} as const satisfies Chain;
