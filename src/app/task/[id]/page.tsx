"use client";

import { useParams } from "next/navigation";
import { useAccount, useWriteContract } from "wagmi";
import { createPublicClient, http } from "viem";
import { monadTestnet } from "@/lib/chains";
import { TASK_MANAGER_ABI } from "@/lib/abi/taskManager";
import { ensureMonadClient } from "@/lib/useEnsureMonad";
import { fetchVoucher, type SignedVoucher } from "@/lib/voucher";
import { toastErr, toastTx } from "@/lib/toast";
import { useEffect, useMemo, useState } from "react";
import { actionUrl } from "@/lib/link";
import OwnerReview from "@/components/OwnerReview";
import SubmitProof from "@/components/SubmitProof";

const TM = process.env.NEXT_PUBLIC_TASK_MANAGER as `0x${string}`;
const RPC = process.env.NEXT_PUBLIC_MONAD_RPC!;
const client = createPublicClient({ chain: monadTestnet, transport: http(RPC) });

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const taskId = Number(id);

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r: any = await client.readContract({
          address: TM,
          abi: TASK_MANAGER_ABI,
          functionName: "tasks",
          args: [BigInt(taskId)],
        });
        setRow(r);
      } finally {
        setLoading(false);
      }
    })();
  }, [taskId]);

  const creator = useMemo(() => (row ? (row[0] as `0x${string}`) : null), [row]);
  const url: string = row ? row[1] : "";
  const actionMask = row ? Number(row[2]) : 0;
  const budget = row ? Number(row[13]) / 1e18 : 0;
  const end = row ? new Date(Number(row[14]) * 1000).toLocaleString() : "-";
  const paused = row ? Boolean(row[15]) : false;
  const isCreator = !!(address && creator && address.toLowerCase() === creator.toLowerCase());

  async function quickClaim(action: 0 | 1 | 2) {
    if (!isConnected || !address) return toastErr("Connect your wallet");
    try {
      await ensureMonadClient();
      const sv: SignedVoucher = await fetchVoucher({ taskId, user: address, action, ttl: 900 });
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
      toastTx(hash, "Claim sent");
    } catch (e) {
      toastErr(e);
    }
  }

  if (loading) return <div>Loading…</div>;
  if (!row) return <div>Not found</div>;

  return (
    <div className="grid gap-4">
      {/* Top: task info */}
      <div className="card">
        <div className="text-xs opacity-70">Task #{taskId}</div>
        <div className="font-semibold break-all">{url}</div>
        <div className="text-sm opacity-80">Budget: {budget} IFX</div>
        <div className="text-sm opacity-80">End: {end}</div>
        {paused ? <div className="mt-2 badge border-yellow-500/40 text-yellow-300">Paused</div> : null}
        {creator ? (
          <div className="text-xs opacity-70 mt-1">
            Creator: <span className="break-all">{creator}</span>
          </div>
        ) : null}
      </div>

      {/* Claim & Links */}
      <div className="card">
        <div className="text-sm opacity-80 mb-2">Claim & Links</div>
        <div className="flex flex-wrap gap-2">
          {(actionMask & 1) ? (
            <>
              <button className="btn" onClick={() => quickClaim(0)}>Follow Claim</button>
              <a className="btn" href={actionUrl(url, 0)} target="_blank" rel="noreferrer">Open profile</a>
            </>
          ) : null}

          {(actionMask & 2) ? (
            <>
              <button className="btn" onClick={() => quickClaim(1)}>Like Claim</button>
              <a className="btn" href={actionUrl(url, 1)} target="_blank" rel="noreferrer">Open post</a>
            </>
          ) : null}

          {(actionMask & 4) ? (
            <>
              <button className="btn" onClick={() => quickClaim(2)}>Retweet Claim</button>
              <a className="btn" href={actionUrl(url, 2)} target="_blank" rel="noreferrer">Open post</a>
            </>
          ) : null}
        </div>
      </div>

      {/* User: submit proof */}
      <SubmitProof defaultTaskId={taskId} />

      {/* Owner only: review */}
      {isCreator ? (
        <div className="grid gap-2">
          <div className="text-sm opacity-80">Owner Panel</div>
          <OwnerReview taskId={taskId} />
        </div>
      ) : (
        <div className="text-xs opacity-70">
          Tip: Submit your proof above. After approval, you can claim your reward here.
        </div>
      )}
    </div>
  );
}
