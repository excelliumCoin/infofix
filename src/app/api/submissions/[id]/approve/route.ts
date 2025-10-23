export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPublicClient, http } from "viem";
import { monadTestnet } from "@/lib/chains";
import { TASK_MANAGER_ABI } from "@/lib/abi/taskManager";
import { ethers } from "ethers";

const RPC = process.env.NEXT_PUBLIC_MONAD_RPC!;
const TM = process.env.NEXT_PUBLIC_TASK_MANAGER as `0x${string}`;
const ORACLE_PK = process.env.ORACLE_PK!;

const client = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC),
});

const DOMAIN = {
  name: "InfoFix",
  version: "1",
  chainId: monadTestnet.id,
  verifyingContract: TM,
} as const;

const TYPES = {
  RewardVoucher: [
    { name: "taskId", type: "uint256" },
    { name: "user", type: "address" },
    { name: "action", type: "uint8" },
    { name: "amount", type: "uint96" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

/**
 * PATCH /api/submissions/:id/approve
 * Body:
 * {
 *   approver: "0x...",             // task creator wallet
 *   signedMessage: "0x...",         // signer.signMessage("approve:<id>:<nonce>")
 *   nonce: "..."                    // replay guard
 *   amountWei?: "..."               // optional override
 *   ttl?: number                    // optional; default 900s
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = (await req.json()) as {
      approver: `0x${string}`;
      signedMessage: string;
      nonce: string;
      amountWei?: string;
      ttl?: number;
    };

    if (!/^0x[0-9a-fA-F]{40}$/.test(body.approver))
      return NextResponse.json({ error: "bad approver" }, { status: 400 });

    // 1) Basit EIP-191 mesaj imzası doğrulama
    const expected = `approve:${id}:${body.nonce}`;
    const recovered = ethers.verifyMessage(expected, body.signedMessage);
    if (recovered.toLowerCase() !== body.approver.toLowerCase()) {
      return NextResponse.json({ error: "bad signature" }, { status: 401 });
    }

    // 2) Submission getir
    const sub = await prisma.submission.findUnique({ where: { id } });
    if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (sub.status === "approved")
      return NextResponse.json({ error: "already approved" }, { status: 409 });

    // 3) On-chain kontrol: Task creator mı?
    const task: any = await client.readContract({
      address: TM,
      abi: TASK_MANAGER_ABI,
      functionName: "tasks",
      args: [BigInt(sub.taskId)],
    });
    const creator = (task[0] as string).toLowerCase();
    if (creator !== body.approver.toLowerCase()) {
      return NextResponse.json({ error: "not task creator" }, { status: 403 });
    }

    // 4) Ödül miktarı
    let amount: bigint;
    if (body.amountWei) {
      amount = BigInt(body.amountWei);
    } else {
      amount =
        sub.action === 0
          ? (task[3] as bigint)
          : sub.action === 1
          ? (task[4] as bigint)
          : (task[5] as bigint);
      if (amount <= 0n)
        return NextResponse.json({ error: "reward is zero" }, { status: 400 });
    }

    // 5) Voucher
    const now = Math.floor(Date.now() / 1000);
    const voucher = {
      taskId: BigInt(sub.taskId),
      user: sub.user as `0x${string}`,
      action: sub.action as number,
      amount,
      nonce:
        BigInt(now) * 1_000_000n + BigInt(Math.floor(Math.random() * 1_000_000)),
      deadline: BigInt(now + Math.max(60, Math.min(body.ttl ?? 900, 3600))),
    };

    // 6) Oracle imzası (EIP-712)
    const wallet = new ethers.Wallet(ORACLE_PK);
    const sig = await wallet.signTypedData(DOMAIN, TYPES as any, voucher as any);

    // 7) DB update
    await prisma.submission.update({
      where: { id },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: body.approver,
        amountWei: voucher.amount.toString(),
        nonce: voucher.nonce.toString(),
        deadline: voucher.deadline.toString(),
        signature: sig,
      },
    });

    return NextResponse.json({
      voucher: {
        taskId: sub.taskId,
        user: sub.user,
        action: sub.action,
        amount: voucher.amount.toString(),
        nonce: voucher.nonce.toString(),
        deadline: voucher.deadline.toString(),
      },
      sig,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
