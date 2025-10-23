export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/submissions
 * 
 * Query:
 * - taskId?: number      -> sadece bu görev için kayıtları getir
 * - user?: 0x..          -> sadece bu cüzdanın kayıtlarını getir
 * - status?: pending|approved|rejected (opsiyonel)
 * - take?: number        -> max kayıt (default 100)
 * 
 * Örnek:
 *   /api/submissions?taskId=3&status=pending
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const taskId = url.searchParams.get("taskId");
    const user = url.searchParams.get("user");
    const status = url.searchParams.get("status") as
      | "pending"
      | "approved"
      | "rejected"
      | null;
    const take = Math.min(
      200,
      Math.max(1, Number(url.searchParams.get("take") || "100"))
    );

    const where: any = {};
    if (taskId !== null && taskId !== "") where.taskId = Number(taskId);
    if (user) where.user = user.toLowerCase();
    if (status) where.status = status;

    const rows = await prisma.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

/**
 * POST /api/submissions
 * 
 * Body (JSON):
 * {
 *   taskId: number,
 *   user: "0x...",
 *   action: 0|1|2,         // 0=Follow, 1=Like, 2=Recast
 *   proofUrl: string,      // ekran görüntüsü/kanıt linki
 *   note?: string
 * }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      taskId: number;
      user: `0x${string}`;
      action: 0 | 1 | 2;
      proofUrl: string;
      note?: string;
    };

    // Basit doğrulamalar
    if (
      body == null ||
      typeof body.taskId !== "number" ||
      !/^(0x)?[0-9a-fA-F]{40}$/.test(body.user) ||
      ![0, 1, 2].includes(Number(body.action)) ||
      !body.proofUrl
    ) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }

    const row = await prisma.submission.create({
      data: {
        taskId: body.taskId,
        user: body.user.toLowerCase(),
        action: Number(body.action),
        proofUrl: String(body.proofUrl),
        note: body.note ?? null,
        status: "pending",
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
