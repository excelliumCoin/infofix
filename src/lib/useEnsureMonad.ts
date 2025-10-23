"use client";

// Monad Testnet (10143 = 0x279F) için zorunlu switch + add
export async function ensureMonadClient() {
  if (typeof window === "undefined") return;
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("Cüzdan bulunamadı (window.ethereum yok)");
  const hexId = "0x279F";
  const rpc = process.env.NEXT_PUBLIC_MONAD_RPC!;

  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch (e: any) {
    const code = e?.code ?? e?.data?.originalError?.code;
    const msg = (e?.message || "").toLowerCase();
    const unrecognized = code === 4902 || msg.includes("unrecognized chain");
    if (unrecognized) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: hexId, chainName: "Monad Testnet", rpcUrls: [rpc],
          nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 } }],
      });
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } else {
      throw e;
    }
  }
}
