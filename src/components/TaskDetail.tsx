"use client";
import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { monadTestnet } from "@/lib/chains";
import { TASK_MANAGER_ABI } from "@/lib/abi/taskManager";
import { ensureMonadClient } from "@/lib/useEnsureMonad";
import { useAccount, useWriteContract } from "wagmi";

const TM = process.env.NEXT_PUBLIC_TASK_MANAGER as `0x${string}`;
const client = createPublicClient({ chain: monadTestnet, transport: http(process.env.NEXT_PUBLIC_MONAD_RPC!) });

function Bar({ value, max }: { value: number; max: number }) {
  const p = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div style={{ width: "100%", height: 10, borderRadius: 8, background: "rgba(255,255,255,.08)" }}>
      <div style={{ width: `${p}%`, height: "100%", borderRadius: 8, background: "linear-gradient(90deg,#00E0FF,#6BFFB8)" }} />
    </div>
  );
}

export default function TaskDetail({ id }: { id: number }) {
  const [t, setT] = useState<any>();
  const [loading, setLoading] = useState(true);
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const d: any = await client.readContract({ address: TM, abi: TASK_MANAGER_ABI, functionName: "tasks", args: [BigInt(id)] });
        setT({
          id,
          url: d[1],
          actionMask: Number(d[2]),
          reward: { follow: d[3] as bigint, like: d[4] as bigint, recast: d[5] as bigint },
          quota: { follow: Number(d[6]), like: Number(d[7]), recast: Number(d[8]) },
          spent: { follow: Number(d[9]), like: Number(d[10]), recast: Number(d[11]) },
          token: d[12] as string,
          budget: d[13] as bigint,
          endTime: Number(d[14]),
          paused: Boolean(d[15]),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div>Yükleniyor…</div>;
  if (!t) return <div>Görev bulunamadı</div>;

  const likeLeft = Math.max(0, t.quota.like - t.spent.like);

  async function claimDemo() {
    try {
      if (!isConnected || !address) return setStatus("Cüzdan bağla.");
      setStatus("Voucher alınıyor…");
      const r = await fetch(`/api/sign-voucher?taskId=${t.id}&user=${address}&action=1&amountWei=1000000000000000000&ttl=600`);
      const data = await r.json();
      if (data.error) throw new Error(data.error);

      setStatus("Claim gönderiliyor…");
      await ensureMonadClient();
      const tx = await writeContractAsync({
        address: TM,
        abi: TASK_MANAGER_ABI,
        functionName: "claimWithSig",
        args: [{
          taskId: BigInt(data.v.taskId),
          user: data.v.user,
          action: Number(data.v.action),
          amount: BigInt(data.v.amount),
          nonce: BigInt(data.v.nonce),
          deadline: BigInt(data.v.deadline),
        }, data.sig],
        chainId: monadTestnet.id,
      });
      setStatus(`Claim tx: ${tx}`);
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || String(e));
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <a href="/" style={{ fontSize: 12, opacity: .8 }}>← Back</a>
      <h1 style={{ fontWeight: 700, fontSize: 22 }}>Task #{t.id}</h1>
      <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)" }}>
        <div><b>URL:</b> {t.url}</div>
        <div style={{ marginTop: 8 }}><b>Rewards (Like):</b> {Number(t.reward.like)/1e18} IFX</div>
        <div style={{ marginTop: 8 }}><b>Budget:</b> {Number(t.budget)/1e18} IFX</div>
        <div style={{ marginTop: 8 }}><b>Remaining Like:</b> {likeLeft} / {t.quota.like}</div>
        <Bar value={t.spent.like} max={t.quota.like} />
        <div style={{ marginTop: 8, fontSize: 12, opacity: .8 }}><b>Bitiş:</b> {new Date(t.endTime*1000).toLocaleString()}</div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={claimDemo}
          style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.12)" }}>
          Claim
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: .85 }}>{status}</div>
    </div>
  );
}
