"use client";

import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { useEffect, useMemo, useState } from "react";

const CHAIN_NAME = "Monad Testnet";

export default function WalletChips() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, status: connectStatus } = useConnect();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  // İstersen otomatik bağlama (dev/deMO için):
  useEffect(() => {
    if (!isConnected && connectors?.[0] && connectStatus === "idle") {
      // connect({ connector: connectors[0] }); // otomatik bağlamak istersen aç
    }
  }, [isConnected, connectors, connectStatus, connect]);

  const shortAddr = useMemo(
    () => (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""),
    [address]
  );

  if (!isConnected) {
    return (
      <button
        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
        onClick={() => connect({ connector: connectors?.[0] })}
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Network chip */}
      <span className="px-2 py-1 rounded-lg bg-white/10 text-xs">
        {CHAIN_NAME}
      </span>

      {/* Address chip (kopya) */}
      <button
        onClick={async () => {
          if (!address) return;
          try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          } catch {}
        }}
        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs"
        title={address}
      >
        {copied ? "Copied" : shortAddr}
      </button>

      {/* Logout */}
      <button
        onClick={() => disconnect()}
        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs"
      >
        Log Out
      </button>
    </div>
  );
}
