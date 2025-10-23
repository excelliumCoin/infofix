"use client";

import { useAccount, useWriteContract } from "wagmi";
import { createPublicClient, http, parseEther } from "viem";
import { monadTestnet } from "@/lib/chains";
import { TASK_MANAGER_ABI } from "@/lib/abi/taskManager";
import { ensureMonadClient } from "@/lib/useEnsureMonad";
import { toastErr, toastTx } from "@/lib/toast";
import { fetchVoucher, type SignedVoucher } from "../../lib/voucher";
import { useEffect, useState } from "react";

const TM = process.env.NEXT_PUBLIC_TASK_MANAGER as `0x${string}`;
const RPC = process.env.NEXT_PUBLIC_MONAD_RPC!;
const client = createPublicClient({ chain: monadTestnet, transport: http(RPC) });

type TaskLite = { id: number; url: string; actionMask: number; reward: { f: bigint; l: bigint; r: bigint } };

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [taskId, setTaskId] = useState<number | "">("");
  const [action, setAction] = useState<0 | 1 | 2>(1); // default Like
  const [amount, setAmount] = useState<string>("");   // IFX (opsiyonel)
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const count = (await client.readContract({
        address: TM, abi: TASK_MANAGER_ABI, functionName: "getTasksCount"
      })) as bigint;
      const ids = Array.from({ length: Number(count) }, (_, i) => i);
      const rows = await Promise.all(ids.map(i => client.readContract({
        address: TM, abi: TASK_MANAGER_ABI, functionName: "tasks", args: [BigInt(i)]
      })));
      const mapped: TaskLite[] = rows.map((r: any, i) => ({
        id: i, url: r[1], actionMask: Number(r[2]), reward: { f: r[3], l: r[4], r: r[5] }
      }));
      setTasks(mapped);
    })();
  }, []);

  async function claim() {
    if (!isConnected || !address) return toastErr("Connect Wallet");
    if (taskId === "") return toastErr("Select Task");

    try {
      setLoading(true);
      await ensureMonadClient();

      // (opsiyonel) kullanıcı elle amount girerse wei'ye çevirip API'ye gönderiyoruz
      const amountWei = amount ? parseEther(amount).toString() : undefined;

      const sv: SignedVoucher = await fetchVoucher({
        taskId: Number(taskId),
        user: address,
        action,
        amountWei,
        ttl: 900,
      });

      const hash = await writeContractAsync({
        address: TM,
        abi: TASK_MANAGER_ABI,
        functionName: "claimWithSig",
        args: [
          {
            taskId: BigInt(sv.voucher.taskId),
            user: sv.voucher.user,
            action: sv.voucher.action,
            amount: BigInt(sv.voucher.amount),
            nonce: BigInt(sv.voucher.nonce),
            deadline: BigInt(sv.voucher.deadline),
          },
          sv.sig,
        ],
        chainId: monadTestnet.id,
      });
      toastTx(hash, "Send Claim");
    } catch (e) {
      toastErr(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3 max-w-lg">
      <div className="card">
        <div className="text-sm opacity-80 mb-2">Task</div>
        <select
          className="w-full bg-transparent outline-none"
          value={taskId === "" ? "" : String(taskId)}
          onChange={(e) => setTaskId(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">Select…</option>
          {tasks.map(t => (
            <option key={t.id} value={t.id}>
              #{t.id} — {t.url}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <div className="text-sm opacity-80 mb-2">Action</div>
        <div className="flex gap-2">
          <button className={`btn ${action===0 ? "ring-2 ring-cyan-400" : ""}`} onClick={()=>setAction(0)}>Follow</button>
          <button className={`btn ${action===1 ? "ring-2 ring-cyan-400" : ""}`} onClick={()=>setAction(1)}>Like</button>
          <button className={`btn ${action===2 ? "ring-2 ring-cyan-400" : ""}`} onClick={()=>setAction(2)}>Retweet</button>
        </div>
      </div>

      <div className="card">
        <div className="text-sm opacity-80 mb-2">Rewards (IFX) — Optional</div>
        <input
          className="w-full bg-transparent outline-none"
          placeholder="Leave Blank - Let API Calculate"
          value={amount}
          onChange={(e)=>setAmount(e.target.value)}
        />
      </div>

      <button className="btn" onClick={claim} disabled={loading}>
        {loading ? "Claiming…" : "Voucher al & Claim et"}
      </button>
    </div>
  );
}
