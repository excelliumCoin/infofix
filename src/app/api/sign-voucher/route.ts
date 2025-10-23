import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPublicClient, http } from "viem";
import { monadTestnet } from "@/lib/chains";
import { TASK_MANAGER_ABI } from "@/lib/abi/taskManager";
import { ethers } from "ethers";

const RPC = process.env.NEXT_PUBLIC_MONAD_RPC!;
const TM = process.env.NEXT_PUBLIC_TASK_MANAGER as `0x${string}`;
const ORACLE_PK = process.env.ORACLE_PK!;
const client = createPublicClient({ chain: monadTestnet, transport: http(RPC) });

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
 * GET /api/sign-voucher?taskId=0&user=0x...&action=1&ttl=900
 * 
 * - Önce DB'de taskId + user + action için onaylı submission arar.
 * - Onaylı kayıt varsa, oradaki imzalı voucher'ı döner.
 * - Yoksa 404 döner (manuel onay bekleniyor).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const taskId = Number(url.searchParams.get("taskId") || "");
    const user = url.searchParams.get("user") as `0x${string}` | null;
    const action = Number(url.searchParams.get("action") || "1");

    if (!Number.isInteger(taskId) || !user)
      return NextResponse.json({ error: "bad params" }, { status: 400 });

    // 🔹 1. Onaylı submission var mı?
    const approved = await prisma.submission.findFirst({
      where: { taskId, user: user.toLowerCase(), action, status: "approved" },
      orderBy: { approvedAt: "desc" },
    });

    if (approved && approved.signature && approved.amountWei && approved.nonce && approved.deadline) {
      return NextResponse.json({
        voucher: {
          taskId: approved.taskId,
          user: approved.user,
          action: approved.action,
          amount: approved.amountWei,
          nonce: approved.nonce,
          deadline: approved.deadline,
        },
        sig: approved.signature,
      });
    }

    // 🔹 2. Eğer henüz onaylanmadıysa — 404 döndür.
    return NextResponse.json(
      { error: "no approved submission (awaiting manual verification)" },
      { status: 404 }
    );

  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

/**
 * (Opsiyonel) POST — Otomatik test veya admin override için.
 * Kullanmak istemiyorsan silebilirsin.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { taskId, user, action, amountWei, ttl = 900 } = body;
    if (!taskId || !user || amountWei === undefined)
      return NextResponse.json({ error: "missing params" }, { status: 400 });

    const wallet = new ethers.Wallet(ORACLE_PK);
    const now = Math.floor(Date.now() / 1000);
    const voucher = {
      taskId: BigInt(taskId),
      user: user as `0x${string}`,
      action: Number(action),
      amount: BigInt(amountWei),
      nonce: BigInt(now) * 1000000n + BigInt(Math.floor(Math.random() * 1_000_000)),
      deadline: BigInt(now + Math.max(60, Math.min(ttl, 3600))),
    };

    const sig = await wallet.signTypedData(DOMAIN, TYPES as any, voucher as any);
    return NextResponse.json({ voucher, sig });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
