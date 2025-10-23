"use client";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { TASK_MANAGER_ABI } from "@/lib/abi/taskManager";

const TM = process.env.NEXT_PUBLIC_TASK_MANAGER as `0x${string}`;

export default function InlineClaim({ taskId }: { taskId: number }) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [json, setJson] = useState("");
  const [status, setStatus] = useState("");

  async function claimWith(v: any, sig: `0x${string}`) {
    const tx = await writeContractAsync({
      address: TM, abi: TASK_MANAGER_ABI, functionName: "claimWithSig",
      args: [{
        taskId: BigInt(v.taskId),
        user: v.user,
        action: Number(v.action),
        amount: BigInt(v.amount),
        nonce: BigInt(v.nonce),
        deadline: BigInt(v.deadline),
      }, sig]
    });
    setStatus(`Claim tx: ${tx}`);
  }

  async function handleVoucherSubmit(e: React.FormEvent){
    e.preventDefault();
    try{
      const { v, sig } = JSON.parse(json);
      await claimWith(v, sig);
    } catch(e:any){ setStatus(e.message || String(e)); }
  }

  async function handleSignServer(e: React.MouseEvent){
    e.preventDefault();
    if(!address) return setStatus("Cüzdan bağlı değil");
    try{
      const r = await fetch(`/api/sign-voucher?taskId=${taskId}&user=${address}&action=1`);
      const { v, sig, error } = await r.json();
      if(error) throw new Error(error);
      await claimWith(v, sig);
    } catch(e:any){ setStatus(e.message || String(e)); }
  }

  return (
    <div style={{ display:"grid", gap:12 }}>
      <h3 style={{ fontWeight:600 }}>Claim</h3>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={handleSignServer}
          style={{ padding:"8px 12px", borderRadius:12, border:"1px solid rgba(255,255,255,.2)", background:"rgba(255,255,255,.1)" }}>
          Voucher
        </button>
      </div>
      <form onSubmit={handleVoucherSubmit} style={{ display:"grid", gap:8 }}>
        <textarea rows={8} placeholder='{"v":{...},"sig":"0x..."}' value={json} onChange={e=>setJson(e.target.value)}
          style={{ width:"100%", padding:10, borderRadius:12, border:"1px solid rgba(255,255,255,.15)", background:"rgba(255,255,255,.06)" }}/>
        <button type="submit" style={{ padding:"8px 12px", borderRadius:12, border:"1px solid rgba(255,255,255,.2)", background:"rgba(255,255,255,.1)" }}>
          Claim With Voucher
        </button>
      </form>
      <div style={{ fontSize:12, opacity:.85 }}>{status}</div>
    </div>
  );
}
