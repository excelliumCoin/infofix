"use client";

import { useAccount, useWriteContract } from "wagmi";
import { useEffect, useState } from "react";
import { createPublicClient, http, parseEther } from "viem";
import { monadTestnet } from "@/lib/chains";
import { TASK_MANAGER_ABI } from "@/lib/abi/taskManager";
import { ERC20_ABI } from "@/lib/abi/erc20";
import { ensureMonadClient } from "@/lib/useEnsureMonad";
import { toastTx, toastErr } from "@/lib/toast";
import OwnerReview from "@/components/OwnerReview";

const TM = process.env.NEXT_PUBLIC_TASK_MANAGER as `0x${string}`;
const TOKEN = process.env.NEXT_PUBLIC_TOKEN_IFX as `0x${string}`;
const RPC = process.env.NEXT_PUBLIC_MONAD_RPC!;
const client = createPublicClient({ chain: monadTestnet, transport: http(RPC) });

type TaskRow = {
  id: number;
  creator: `0x${string}`;
  url: string;
  actionMask: number;
  reward: { follow: bigint; like: bigint; recast: bigint };
  quota: { follow: number; like: number; recast: number };
  spent: { follow: number; like: number; recast: number };
  token: `0x${string}`;
  budget: bigint;
  endTime: number;
  paused: boolean;
};

function maskText(m: number) {
  const a: string[] = [];
  if (m & 1) a.push("Follow");
  if (m & 2) a.push("Like");
  if (m & 4) a.push("Recast");
  return a.join(", ") || "-";
}

export default function MyTasks() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [topup, setTopup] = useState<Record<number, string>>({});
  const [refund, setRefund] = useState<Record<number, string>>({});
  const [openReview, setOpenReview] = useState<Record<number, boolean>>({});

  async function load() {
    if (!address) return;
    setLoading(true);
    try {
      const count = (await client.readContract({
        address: TM,
        abi: TASK_MANAGER_ABI,
        functionName: "getTasksCount",
      })) as bigint;

      const ids = Array.from({ length: Number(count) }, (_, i) => i);
      const res = await Promise.all(
        ids.map((i) =>
          client.readContract({
            address: TM,
            abi: TASK_MANAGER_ABI,
            functionName: "tasks",
            args: [BigInt(i)],
          })
        )
      );

      const mapped: TaskRow[] = (res as any[])
        .map((r, i) => ({
          id: i,
          creator: r[0],
          url: r[1],
          actionMask: Number(r[2]),
          reward: { follow: r[3], like: r[4], recast: r[5] },
          quota: { follow: Number(r[6]), like: Number(r[7]), recast: Number(r[8]) },
          spent: { follow: Number(r[9]), like: Number(r[10]), recast: Number(r[11]) },
          token: r[12],
          budget: r[13],
          endTime: Number(r[14]),
          paused: Boolean(r[15]),
        }))
        .filter((t) => t.creator.toLowerCase() === address.toLowerCase())
        .filter((t) => !(t.paused && t.budget === 0n));

      setRows(mapped);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isConnected) load();
  }, [isConnected, address]);

  async function togglePause(t: TaskRow) {
    try {
      await ensureMonadClient();
      const hash = await writeContractAsync({
        address: TM,
        abi: TASK_MANAGER_ABI,
        functionName: "pauseTask",
        args: [BigInt(t.id), !t.paused],
        chainId: monadTestnet.id,
      });
      toastTx(hash, t.paused ? "Task resumed" : "Task paused");
      await load();
    } catch (e) {
      toastErr(e);
    }
  }

  async function addBudget(t: TaskRow) {
    const amountIFX = topup[t.id] || "0";
    if (!amountIFX || Number(amountIFX) <= 0) return toastErr("Enter top-up amount");
    try {
      await ensureMonadClient();
      const amountWei = parseEther(amountIFX);

      const approveHash = await writeContractAsync({
        address: TOKEN,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [TM, amountWei],
        chainId: monadTestnet.id,
      });
      toastTx(approveHash, "Approve sent");

      const fundHash = await writeContractAsync({
        address: TM,
        abi: TASK_MANAGER_ABI,
        functionName: "fund",
        args: [BigInt(t.id), amountWei],
        chainId: monadTestnet.id,
      });
      toastTx(fundHash, "Budget added");
      await load();
    } catch (e) {
      toastErr(e);
    }
  }

  async function refundBudget(t: TaskRow) {
    const amountIFX = refund[t.id] || "0";
    if (!amountIFX || Number(amountIFX) <= 0) return toastErr("Enter refund amount");
    try {
      await ensureMonadClient();
      const amountWei = parseEther(amountIFX);

      const hash = await writeContractAsync({
        address: TM,
        abi: TASK_MANAGER_ABI,
        functionName: "refundRemainder",
        args: [BigInt(t.id), address as `0x${string}`, amountWei],
        chainId: monadTestnet.id,
      });
      toastTx(hash, "Refund sent");
      await load();
    } catch (e) {
      toastErr(e);
    }
  }

  async function archiveTask(t: TaskRow) {
    try {
      await ensureMonadClient();

      if (!t.paused) {
        const pauseHash = await writeContractAsync({
          address: TM,
          abi: TASK_MANAGER_ABI,
          functionName: "pauseTask",
          args: [BigInt(t.id), true],
          chainId: monadTestnet.id,
        });
        toastTx(pauseHash, "Task paused");
      }

      if (t.budget > 0n) {
        const refundAllHash = await writeContractAsync({
          address: TM,
          abi: TASK_MANAGER_ABI,
          functionName: "refundRemainder",
          args: [BigInt(t.id), address as `0x${string}`, t.budget],
          chainId: monadTestnet.id,
        });
        toastTx(refundAllHash, "All remaining budget refunded");
      }

      await load();
    } catch (e) {
      toastErr(e);
    }
  }

  if (!isConnected) return <div>Connect your wallet.</div>;
  if (loading) return <div>Loading…</div>;
  if (rows.length === 0) return <div>No tasks for this wallet.</div>;

  return (
    <div className="grid gap-3">
      {rows.map((t) => {
        const spent = t.spent.like + t.spent.follow + t.spent.recast;
        const quota = t.quota.like + t.quota.follow + t.quota.recast;
        const pct = Math.min(100, Math.round((spent / Math.max(1, quota)) * 100));

        return (
          <div key={t.id} className="card">
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs opacity-70">#{t.id}</div>
                <div className="font-semibold truncate">{t.url}</div>
                <div className="text-xs opacity-70">Actions: {maskText(t.actionMask)}</div>
                <div className="text-xs opacity-70">Budget: {Number(t.budget) / 1e18} IFX</div>

                <div className="mt-2 h-2 w-64 bg-white/10 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-emerald-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-xs opacity-70 mt-1">Progress: {spent}/{quota}</div>
              </div>

              <div className="min-w-[300px] grid gap-2">
                <button
                  onClick={() => togglePause(t)}
                  className="btn"
                  style={{
                    backgroundColor: t.paused ? "rgba(34,197,94,.15)" : "rgba(239,68,68,.15)",
                  }}
                >
                  {t.paused ? "Resume Task" : "Pause Task"}
                </button>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    className="card"
                    placeholder="Top-up IFX"
                    value={topup[t.id] || ""}
                    onChange={(e) => setTopup((s) => ({ ...s, [t.id]: e.target.value }))}
                  />
                  <button onClick={() => addBudget(t)} className="btn">Add Budget</button>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    className="card"
                    placeholder="Refund IFX"
                    value={refund[t.id] || ""}
                    onChange={(e) => setRefund((s) => ({ ...s, [t.id]: e.target.value }))}
                  />
                  <button onClick={() => refundBudget(t)} className="btn">Refund</button>
                </div>

                <button
                  onClick={() => archiveTask(t)}
                  className="btn"
                  style={{ backgroundColor: "rgba(148,163,184,.18)" }}
                  title="Pause the task and refund full remaining budget"
                >
                  Delete (Archive)
                </button>

                <a href={`/task/${t.id}`} className="text-sm opacity-85">Details →</a>
              </div>
            </div>

            <div className="mt-3 border-t border-white/10 pt-3">
              <button
                className="btn"
                onClick={() => setOpenReview((s) => ({ ...s, [t.id]: !s[t.id] }))}
              >
                {openReview[t.id] ? "Hide Review Panel" : "Review Submissions"}
              </button>

              {openReview[t.id] ? (
                <div className="mt-3">
                  <OwnerReview taskId={t.id} />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
