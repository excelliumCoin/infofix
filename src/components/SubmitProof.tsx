"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

export default function SubmitProof({ defaultTaskId }: { defaultTaskId?: number }) {
  const { address, isConnected } = useAccount();
  const [taskId, setTaskId] = useState<number | "">(defaultTaskId ?? "");
  const [action, setAction] = useState<0 | 1 | 2>(1); // 0=Follow,1=Like,2=Recast
  const [proofUrl, setProofUrl] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  async function submit() {
    if (!isConnected || !address) return setMsg("Connect your wallet.");
    if (taskId === "") return setMsg("Select or enter a Task ID.");
    if (!proofUrl) return setMsg("Proof URL (screenshot link) is required.");

    try {
      setMsg("Submitting…");
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          taskId: Number(taskId),
          user: address,
          action,
          proofUrl,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      setMsg("Submitted ✓ — The task owner will review it. After approval you can claim.");
      setProofUrl("");
      setNote("");
    } catch (e: any) {
      setMsg("Error: " + (e?.message || String(e)));
    }
  }

  return (
    <div className="card grid gap-2 max-w-2xl">
      <b>Submit Proof</b>

      <div className="grid md:grid-cols-3 gap-2">
        <div className="grid gap-1">
          <label className="text-sm opacity-80">Task ID</label>
          <input
            className="card"
            placeholder="e.g. 0"
            value={taskId === "" ? "" : String(taskId)}
            onChange={(e) => setTaskId(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={typeof defaultTaskId === "number"}
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm opacity-80">Action</label>
          <div className="flex gap-2">
            <button className={`btn ${action === 0 ? "ring-2 ring-cyan-400" : ""}`} onClick={() => setAction(0)}>
              Follow
            </button>
            <button className={`btn ${action === 1 ? "ring-2 ring-cyan-400" : ""}`} onClick={() => setAction(1)}>
              Like
            </button>
            <button className={`btn ${action === 2 ? "ring-2 ring-cyan-400" : ""}`} onClick={() => setAction(2)}>
              Recast
            </button>
          </div>
        </div>
      </div>

      <label className="text-sm opacity-80">Screenshot / proof URL</label>
      <input
        className="card"
        placeholder="https://..."
        value={proofUrl}
        onChange={(e) => setProofUrl(e.target.value)}
      />

      <label className="text-sm opacity-80">Note (optional)</label>
      <input className="card" placeholder="Any extra info…" value={note} onChange={(e) => setNote(e.target.value)} />

      <button className="btn" onClick={submit} disabled={!isConnected}>
        Submit
      </button>
      <div className="text-sm opacity-80">{msg}</div>
    </div>
  );
}
