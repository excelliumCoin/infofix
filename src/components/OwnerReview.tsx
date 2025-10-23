"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";

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
  amountWei?: string | null;
  nonce?: string | null;
  deadline?: string | null;
  signature?: `0x${string}` | null;
};

function actionLabel(a: 0 | 1 | 2) {
  return a === 0 ? "Follow" : a === 1 ? "Like" : "Recast";
}
function isImageUrl(u: string) {
  const q = u.split("?")[0].toLowerCase();
  return /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(q);
}

export default function OwnerReview(props: { taskId?: number }) {
  const { address, isConnected } = useAccount();

  const [taskId, setTaskId] = useState<number | "">(props.taskId ?? "");
  const [status, setStatus] = useState<Status>("pending");
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // lightbox
  const [preview, setPreview] = useState<string | null>(null);

  const taskIdLocked = useMemo(() => typeof props.taskId === "number", [props.taskId]);

  async function load() {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (taskId !== "") p.set("taskId", String(taskId));
      p.set("status", status);
      const res = await fetch(`/api/submissions?${p.toString()}`);
      const data = (await res.json()) as Submission[] | { error: string };
      if (!res.ok) throw new Error((data as any)?.error || res.statusText);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setMsg("Load error: " + (e?.message || String(e)));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (taskId !== "") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, status]);

  async function approve(sub: Submission) {
    if (!isConnected || !address) return setMsg("Connect your wallet (task creator).");
    try {
      setMsg("Signing…");
      const nonce = String(Date.now());
      const message = `approve:${sub.id}:${nonce}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eth = (window as any).ethereum;
      if (!eth) throw new Error("Wallet provider not found");
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      const res = await fetch(`/api/submissions/${sub.id}/approve`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approver: address, signedMessage: signature, nonce }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);

      setMsg("Approved ✓ — User can claim their reward.");
      await load();
    } catch (e: any) {
      setMsg("Approve error: " + (e?.message || String(e)));
    }
  }

  async function reject(sub: Submission) {
    if (!isConnected || !address) return setMsg("Connect your wallet (task creator).");
    try {
      const reason = prompt("Reason (optional):") || undefined;
      const res = await fetch(`/api/submissions/${sub.id}/reject`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approver: address, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      setMsg("Rejected.");
      await load();
    } catch (e: any) {
      setMsg("Reject error: " + (e?.message || String(e)));
    }
  }

  return (
    <div className="grid gap-3">
      {/* Top controls */}
      <div className="card grid gap-2 max-w-3xl">
        <div className="flex flex-wrap gap-2 items-center">
          <b>Owner Review</b>
          <span className="text-xs opacity-70">(Review submissions, approve or reject)</span>
        </div>

        <div className="grid md:grid-cols-3 gap-2">
          <div className="grid gap-1">
            <label className="text-sm opacity-80">Task ID</label>
            <input
              className="card"
              placeholder="e.g. 0"
              value={taskId === "" ? "" : String(taskId)}
              onChange={(e) => setTaskId(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={taskIdLocked}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm opacity-80">Status</label>
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
            </div>
          </div>

          <div className="grid gap-1 items-end">
            <button className="btn" onClick={load} disabled={taskId === "" || loading}>
              Refresh
            </button>
          </div>
        </div>

        {!isConnected && (
          <div className="text-sm text-amber-300">
            Note: Connect task creator wallet to approve/reject.
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm opacity-75">No submissions found.</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => {
            const imageLike = isImageUrl(r.proofUrl);
            return (
              <div key={r.id} className="card">
                <div className="flex justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-xs opacity-70">
                      #{r.taskId} • {new Date(r.createdAt).toLocaleString()}
                    </div>
                    <div className="text-sm">
                      User: <b className="break-all">{r.user}</b>
                    </div>
                    <div className="text-sm">Action: {actionLabel(r.action)}</div>
                    {r.note ? (
                      <div className="text-sm opacity-80 mt-1">Note: {r.note}</div>
                    ) : null}

                    <div className="mt-2 flex gap-2 flex-wrap items-center">
                      {imageLike ? (
                        <button
                          className="card p-0"
                          title="Open preview"
                          onClick={() => setPreview(r.proofUrl)}
                        >
                          {/* Thumbnail */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={r.proofUrl}
                            alt="proof"
                            className="h-24 w-24 object-cover rounded-lg"
                            onError={(e) => {
                              // fallback to simple link if image fails
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </button>
                      ) : null}

                      <a
                        className="btn"
                        href={r.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open submitted proof in new tab"
                      >
                        Open proof
                      </a>

                      {r.status === "pending" ? (
                        <>
                          <button className="btn" onClick={() => approve(r)}>
                            Approve & Sign
                          </button>
                          <button
                            className="btn"
                            onClick={() => reject(r)}
                            style={{ backgroundColor: "rgba(239,68,68,.15)" }}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}

                      {r.status !== "pending" ? (
                        <span
                          className={`badge ${
                            r.status === "approved"
                              ? "border-emerald-500/40 text-emerald-300"
                              : "border-red-500/40 text-red-300"
                          }`}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Right column: approval info */}
                  <div className="min-w-[260px] text-sm opacity-80">
                    {r.status === "approved" ? (
                      <div className="grid gap-1">
                        <div>
                          Approved by: <b className="break-all">{r.approvedBy}</b>
                        </div>
                        <div>
                          Approved at:{" "}
                          {r.approvedAt ? new Date(r.approvedAt).toLocaleString() : "-"}
                        </div>
                        <div>Amount (wei): {r.amountWei ?? "-"}</div>
                        <div>Nonce: {r.nonce ?? "-"}</div>
                        <div>Deadline: {r.deadline ?? "-"}</div>
                        <div className="break-all">Sig: {r.signature ?? "-"}</div>
                        <div className="opacity-60">
                          User can claim from the task page or claim screen.
                        </div>
                      </div>
                    ) : r.status === "rejected" ? (
                      <div className="grid gap-1">
                        <div>
                          Rejected by: <b className="break-all">{r.approvedBy ?? "-"}</b>
                        </div>
                        <div>
                          At: {r.approvedAt ? new Date(r.approvedAt).toLocaleString() : "-"}
                        </div>
                        <div className="opacity-60">Reason (if any): {r.note ?? "-"}</div>
                      </div>
                    ) : (
                      <div className="opacity-60">Pending…</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {msg && <div className="text-sm opacity-80">{msg}</div>}

      {/* Lightbox modal */}
      {preview ? (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div className="max-w-5xl max-h-[85vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="proof preview"
              className="max-h-[85vh] rounded-xl object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
