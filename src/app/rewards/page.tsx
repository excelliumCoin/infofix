"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { createPublicClient, http } from "viem";
import { monadTestnet } from "@/lib/chains";
import { TASK_MANAGER_ABI } from "@/lib/abi/taskManager";
import { ensureMonadClient } from "@/lib/useEnsureMonad";
import { toastErr, toastTx } from "@/lib/toast";

const TM = process.env.NEXT_PUBLIC_TASK_MANAGER as `0x${string}`;
const RPC = process.env.NEXT_PUBLIC_MONAD_RPC!;
const client = createPublicClient({ chain: monadTestnet, transport: http(RPC) });

type ApprovedSubmission = {
  id: string;
  taskId: number;
  user: `0x${string}`;
  action: 0 | 1 | 2;
  amountWei: string;     // stored on approval
  nonce: string;
  deadline: string;
  signature: `0x${string}`;
  approvedAt?: string | null;
};

function actionLabel(a: 0 | 1 | 2) {
  return a === 0 ? "Follow" : a === 1 ? "Like" : "Recast";
}

export default function RewardsPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [rows, setRows] = useState<ApprovedSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const canLoad = useMemo(() => !!address, [address]);

  async function load() {
    if (!address) return;
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("user", address);
      p.set("status", "approved");
      const res = await fetch(`/api/submissions?${p.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      setRows(Array.isArray(data) ? data.filter((x: any) => x.signature) : []);
    } catch (e: any) {
      setMsg("Load error: " + (e?.message || String(e)));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canLoad) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad]);

  async function claim(sub: ApprovedSubmission) {
    if (!isConnected || !address) return toastErr("Connect your wallet");
    try {
      await ensureMonadClient();
      const hash = await writeContractAsync({
        address: TM,
        abi: TASK_MANAGER_ABI,
        functionName: "claimWithSig",
        args: [
          {
            taskId: BigInt(sub.taskId),
            user: address,
            action: sub.action,
            amount: BigInt(sub.amountWei),
            nonce: BigInt(sub.nonce),
            deadline: BigInt(sub.deadline),
          },
          sub.signature,
        ],
        chainId: monadTestnet.id,
      });
      toastTx(hash, "Claim sent");
    } catch (e) {
      toastErr(e);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="card grid gap-2 max-w-3xl">
        <b>Rewards</b>
        <div className="text-sm opacity-80">
          Approved submissions ready to claim.
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={load} disabled={!canLoad || loading}>
            Refresh
          </button>
        </div>
        {!isConnected && <div className="text-sm text-amber-300">Connect your wallet.</div>}
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm opacity-75">No approved rewards yet.</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <div key={r.id} className="card flex justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs opacity-70">
                  Task #{r.taskId} • {r.approvedAt ? new Date(r.approvedAt).toLocaleString() : "-"}
                </div>
                <div className="text-sm">Action: {actionLabel(r.action)}</div>
                <div className="text-xs opacity-70 break-all mt-1">Sig: {r.signature}</div>
              </div>
              <div className="min-w-[220px] grid gap-2">
                <button className="btn" onClick={() => claim(r)}>
                  Claim
                </button>
                <a className="text-sm opacity-80" href={`/task/${r.taskId}`}>
                  Go to task →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {msg && <div className="text-sm opacity-80">{msg}</div>}
    </div>
  );
}
