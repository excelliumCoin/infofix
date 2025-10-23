"use client";

import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { parseEther } from "viem";
import { TASK_MANAGER_ABI } from "@/lib/abi/taskManager";
import { ERC20_ABI } from "@/lib/abi/erc20";
import { monadTestnet } from "@/lib/chains";
import { ensureMonadClient } from "@/lib/useEnsureMonad";
import { toastTx, toastErr } from "@/lib/toast";

import { useForm, SubmitHandler, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const TM = process.env.NEXT_PUBLIC_TASK_MANAGER as `0x${string}`;
const TOKEN = process.env.NEXT_PUBLIC_TOKEN_IFX as `0x${string}`;

const mask = (f: boolean, l: boolean, r: boolean) =>
  (f ? 1 : 0) | (l ? 2 : 0) | (r ? 4 : 0);

const schema = z.object({
  url: z.string().min(3, "URL is required"),
  endDays: z.coerce.number().int().min(1).max(90),
  enableFollow: z.boolean().default(false),
  enableLike: z.boolean().default(true),
  enableRecast: z.boolean().default(false),
  rewardFollow: z.string().default("0"),
  rewardLike: z.string().default("1"),
  rewardRecast: z.string().default("0"),
  quotaFollow: z.coerce.number().int().min(0),
  quotaLike: z.coerce.number().int().min(0),
  quotaRecast: z.coerce.number().int().min(0),
  budget: z.string().min(1, "Budget is required"),
});
type FormVals = z.infer<typeof schema>;

export default function CreateTaskForm() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const { data: allowance } = useReadContract({
    address: TOKEN,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address ?? "0x0000000000000000000000000000000000000000", TM],
    query: { enabled: !!address },
  });

const {
  register,
  handleSubmit,
  watch,
  formState: { errors, isSubmitting },
} = useForm<FormVals, any, FormVals>({
  // ✅ TS uyumluluğu için tip cast
  resolver: zodResolver(schema) as Resolver<FormVals>,
  defaultValues: {
    url: "",
    endDays: 7,
    enableFollow: false,
    enableLike: true,
    enableRecast: false,
    rewardFollow: "0",
    rewardLike: "1",
    rewardRecast: "0",
    quotaFollow: 0,
    quotaLike: 100,
    quotaRecast: 0,
    budget: "100",
  },
});


  const vals = watch();
  const suggested =
    (vals.enableFollow ? Number(vals.rewardFollow) * vals.quotaFollow : 0) +
    (vals.enableLike ? Number(vals.rewardLike) * vals.quotaLike : 0) +
    (vals.enableRecast ? Number(vals.rewardRecast) * vals.quotaRecast : 0);

  const needsApprove = (() => {
    try {
      return (allowance ?? 0n) < parseEther(vals.budget || "0");
    } catch {
      return true;
    }
  })();

  const onSubmit = async (v: FormVals) => {
    if (!isConnected) return toastErr("Connect your wallet");
    if (!v.enableFollow && !v.enableLike && !v.enableRecast)
      return toastErr("Select at least one action");

    try {
      await ensureMonadClient();

      const budgetWei = parseEther(v.budget);
      if (needsApprove) {
        const approveHash = await writeContractAsync({
          address: TOKEN,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [TM, budgetWei],
          chainId: monadTestnet.id,
        });
        toastTx(approveHash, "Approve sent");
      }

      const end = BigInt(
        Math.floor(Date.now() / 1000) + v.endDays * 24 * 60 * 60
      );

      const txHash = await writeContractAsync({
        address: TM,
        abi: TASK_MANAGER_ABI,
        functionName: "createTask",
        args: [
          v.url,
          mask(v.enableFollow, v.enableLike, v.enableRecast),
          parseEther(v.enableFollow ? v.rewardFollow : "0"),
          parseEther(v.enableLike ? v.rewardLike : "0"),
          parseEther(v.enableRecast ? v.rewardRecast : "0"),
          v.enableFollow ? v.quotaFollow : 0,
          v.enableLike ? v.quotaLike : 0,
          v.enableRecast ? v.quotaRecast : 0,
          TOKEN,
          end,
          budgetWei,
        ],
        chainId: monadTestnet.id,
      });
      toastTx(txHash, "Task created");
    } catch (e) {
      toastErr(e);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      {/* URL */}
      <div className="grid gap-1">
        <label className="text-sm opacity-80">Task URL</label>
        <input className="card" placeholder="https://x.com/..." {...register("url")} />
        {errors.url && <p className="text-red-400 text-sm">{errors.url.message}</p>}
      </div>

      {/* FOLLOW */}
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register("enableFollow")} /> <b>Follow</b>
      </label>
      {vals.enableFollow && (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <label className="text-xs opacity-75">Reward (IFX)</label>
            <input className="card" placeholder="e.g. 1" {...register("rewardFollow")} />
          </div>
          <div className="grid gap-1">
            <label className="text-xs opacity-75">Quota (# of completions)</label>
            <input
              className="card"
              type="number"
              placeholder="e.g. 100"
              {...register("quotaFollow")}
            />
          </div>
        </div>
      )}

      {/* LIKE */}
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register("enableLike")} /> <b>Like</b>
      </label>
      {vals.enableLike && (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <label className="text-xs opacity-75">Reward (IFX)</label>
            <input className="card" placeholder="e.g. 1" {...register("rewardLike")} />
          </div>
          <div className="grid gap-1">
            <label className="text-xs opacity-75">Quota (# of completions)</label>
            <input
              className="card"
              type="number"
              placeholder="e.g. 100"
              {...register("quotaLike")}
            />
          </div>
        </div>
      )}

      {/* RECAST / RETWEET */}
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register("enableRecast")} /> <b>Retweet</b>
      </label>
      {vals.enableRecast && (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <label className="text-xs opacity-75">Reward (IFX)</label>
            <input className="card" placeholder="e.g. 1" {...register("rewardRecast")} />
          </div>
          <div className="grid gap-1">
            <label className="text-xs opacity-75">Quota (# of completions)</label>
            <input
              className="card"
              type="number"
              placeholder="e.g. 50"
              {...register("quotaRecast")}
            />
          </div>
        </div>
      )}

      {/* END + BUDGET */}
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <label className="text-sm opacity-80">End (days)</label>
          <input className="card" type="number" placeholder="e.g. 7" {...register("endDays")} />
          {errors.endDays && <p className="text-red-400 text-sm">{errors.endDays.message}</p>}
        </div>
        <div className="grid gap-1">
          <label className="text-sm opacity-80">Budget (IFX)</label>
          <input className="card" placeholder="e.g. 100" {...register("budget")} />
          {errors.budget && <p className="text-red-400 text-sm">{errors.budget.message}</p>}
        </div>
      </div>

      <div className="text-sm opacity-80">
        Suggested budget: <b>{suggested}</b> IFX{" "}
        {Number(vals.budget) < suggested ? "(lower than suggested)" : ""}
      </div>

      <button className="btn" type="submit" disabled={isSubmitting}>
        {needsApprove ? "Approve + Create" : "Create"}
      </button>
    </form>
  );
}
