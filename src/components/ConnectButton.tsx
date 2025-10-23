"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useEffect } from "react";
import { ensureMonadClient } from "@/lib/useEnsureMonad";

export default function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // bağlanınca ağı düzelt
  useEffect(() => {
    if (isConnected) {
      void ensureMonadClient();
    }
  }, [isConnected]);

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isPending}
        style={{
          padding: "8px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.15)",
          background: "rgba(255,255,255,.06)",
        }}
      >
        {isPending ? "Bağlanıyor…" : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button
        onClick={() => ensureMonadClient()}
        title="Monad Testnet"
        style={{
          padding: "4px 8px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.15)",
          background: "rgba(255,255,255,.06)",
        }}
      >
        Monad Testnet
      </button>

      <span style={{ fontSize: 12, opacity: 0.8 }}>{address}</span>
      <button
        onClick={() => disconnect()}
        style={{
          padding: "4px 8px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.15)",
          background: "rgba(255,255,255,.06)",
        }}
      >
        Log Out
      </button>
    </div>
  );
}
