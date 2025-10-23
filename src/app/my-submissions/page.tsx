"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

type Status = "pending" | "approved" | "rejected";

type Submission = {
  id: string;
  taskId: number;
  user: `0x${string}`;
  action: 0 | 1 | 2;           // 0=Follow,1=Like,2=Recast
  proofUrl: string;
  note?: string | null;
  status: Status;
  createdAt: string;
  approvedAt?: string | null;
  approvedBy?: `0x${string}` | null;
};

function actionLabel(a: 0 | 1 | 2) {
  return a === 0 ? "Follow" : a === 1 ? "Like" : "Recast";
}
function isImageUrl(u: string) {
  const q = u.split("?")[0].toLowerCase();
  return /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(q);
}

export default function MySubmissionsPage() {
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState<Status>("pending");
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const canLoad = useMemo(() => !!address, [address]);

  async function load() {
    if (!address) return;
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("user", address);
      p.set("status", status);
      const res = await fetch(`/api/submissions?${p.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      setRows(Array.isArray(data) ? data : []);
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
  }, [canLoad, status]);

  return (
    <div className="grid gap-3">
      <div className="card grid gap-2 max-w-3xl">
        <div className="flex items-center gap-2">
          <b>My Submissions</b>
          <span className="text-xs opacity-70">(Your uploaded proofs)</span>
        </div>

        <div className="flex gap-2">
          {(["pending", "approved", "rejected"] as Status[]).map((s) => (
            <button
              key={s}
              className={`btn ${status === s ? "ring-2 ring-cyan-400" : ""}`}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
          <button className="btn" onClick={load} disabled={!canLoad || loading}>
            Refresh
          </button>
        </div>

        {!isConnected && (
          <div className="text-sm text-amber-300">Connect your wallet.</div>
        )}
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm opacity-75">No records found.</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => {
            const imageLike = isImageUrl(r.proofUrl);
            return (
              <div key={r.id} className="card">
                <div className="flex justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-xs opacity-70">
                      Task #{r.taskId} • {new Date(r.createdAt).toLocaleString()}
                    </div>
                    <div className="text-sm">Action: {actionLabel(r.action)}</div>
                    {r.note ? (
                      <div className="text-sm opacity-80 mt-1">Note: {r.note}</div>
                    ) : null}

                    <div className="mt-2 flex gap-2 items-center flex-wrap">
                      {imageLike ? (
                        <button className="card p-0" onClick={() => setPreview(r.proofUrl)} title="Preview">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={r.proofUrl}
                            alt="proof"
                            className="h-20 w-20 object-cover rounded-lg"
                            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                          />
                        </button>
                      ) : null}
                      <a className="btn" href={r.proofUrl} target="_blank" rel="noreferrer">
                        Open proof
                      </a>
                      <span
                        className={`badge ${
                          r.status === "approved"
                            ? "border-emerald-500/40 text-emerald-300"
                            : r.status === "rejected"
                            ? "border-red-500/40 text-red-300"
                            : "border-yellow-500/40 text-yellow-300"
                        }`}
                      >
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-[240px] text-sm opacity-80">
                    {r.status === "approved" ? (
                      <div>
                        Approved by: <b className="break-all">{r.approvedBy ?? "-"}</b>
                        <div>
                          At: {r.approvedAt ? new Date(r.approvedAt).toLocaleString() : "-"}
                        </div>
                        <div className="opacity-60 mt-1">
                          You can claim it from the <a className="underline" href="/rewards">Rewards</a> page.
                        </div>
                      </div>
                    ) : r.status === "rejected" ? (
                      <div className="opacity-60">Rejected by owner.</div>
                    ) : (
                      <div className="opacity-60">Waiting for review…</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {msg && <div className="text-sm opacity-80">{msg}</div>}

      {preview ? (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="max-w-5xl max-h-[85vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="max-h-[85vh] rounded-xl object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
