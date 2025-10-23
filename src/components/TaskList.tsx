"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPublicClient, http } from "viem";
import { monadTestnet } from "@/lib/chains";
import { TASK_MANAGER_ABI } from "@/lib/abi/taskManager";
import { actionUrl } from "@/lib/link";

const TM = process.env.NEXT_PUBLIC_TASK_MANAGER as `0x${string}`;
const RPC = process.env.NEXT_PUBLIC_MONAD_RPC!;
const client = createPublicClient({ chain: monadTestnet, transport: http(RPC) });

type Row = {
  id: number;
  url: string;
  actionMask: number;
  budget: number;
  endTime: number;
  paused: boolean;
};

function maskText(m: number) {
  const a: string[] = [];
  if (m & 1) a.push("Follow");
  if (m & 2) a.push("Like");
  if (m & 4) a.push("Retweet");
  return a.join(", ") || "-";
}

export default function TaskList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const count = (await client.readContract({
          address: TM,
          abi: TASK_MANAGER_ABI,
          functionName: "getTasksCount",
        })) as bigint;

        const ids = Array.from({ length: Number(count) }, (_, i) => i);
        const rs = await Promise.all(
          ids.map((i) =>
            client.readContract({
              address: TM,
              abi: TASK_MANAGER_ABI,
              functionName: "tasks",
              args: [BigInt(i)],
            })
          )
        );

        const mapped: Row[] = (rs as any[]).map((r, i) => ({
          id: i,
          url: r[1],
          actionMask: Number(r[2]),
          budget: Number(r[13]) / 1e18,
          endTime: Number(r[14]),
          paused: Boolean(r[15]),
        }));

        setRows(mapped.filter((x) => x.budget > 0 && !x.paused));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Loading…</div>;
  if (rows.length === 0) return <div>No live tasks.</div>;

  return (
    <div className="grid gap-3">
      {rows.map((t) => (
        <div key={t.id} className="card">
          <div className="text-xs opacity-70">Task #{t.id}</div>

          {/* Kartı link yapmak yerine sadece başlığı link yapıyoruz */}
          <Link
            href={`/task/${t.id}`}
            className="font-semibold break-all underline-offset-2 hover:underline"
          >
            {t.url}
          </Link>

          <div className="text-sm opacity-80">Actions: {maskText(t.actionMask)}</div>
          <div className="text-sm opacity-80">Budget: {t.budget} IFX</div>

          {/* Quick links: button + window.open (a yerine) */}
          <div className="text-xs opacity-70 mt-1 flex gap-2 flex-wrap">
            <span>Quick links:</span>
            {(t.actionMask & 1) ? (
              <button
                className="underline mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(actionUrl(t.url, 0), "_blank", "noopener,noreferrer");
                }}
              >
                profile
              </button>
            ) : null}
            {(t.actionMask & 2) ? (
              <button
                className="underline mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(actionUrl(t.url, 1), "_blank", "noopener,noreferrer");
                }}
              >
                post
              </button>
            ) : null}
            {(t.actionMask & 4) ? (
              <button
                className="underline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(actionUrl(t.url, 2), "_blank", "noopener,noreferrer");
                }}
              >
                post
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
