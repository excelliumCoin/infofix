"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { config } from "./wagmi";
import { Toaster } from "react-hot-toast";

const queryClient = new QueryClient();

function AutoConnect() {
  // 🔹 Bağlı olup olmadığımızı buradan öğreniyoruz
  const { isConnected, status: accountStatus } = useAccount();

  // 🔹 connect fonksiyonu ve mevcut connector listesi
  const { connect, connectors } = useConnect();

  useEffect(() => {
    // Sadece tamamen kopuksa ve elinde en az 1 connector varsa dene
    if (!isConnected && accountStatus === "disconnected" && connectors[0]) {
      // kullanıcının tarayıcı cüzdanını (MetaMask) sessizce bağlamayı dener;
      // çoğu durumda UI onayı isteyecektir (normal).
      connect({ connector: connectors[0] });
    }
  }, [isConnected, accountStatus, connectors, connect]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* ✅ global toast container */}
        <Toaster position="bottom-right" toastOptions={{ style: { background: "#111827", color: "#e5e7eb" } }} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
