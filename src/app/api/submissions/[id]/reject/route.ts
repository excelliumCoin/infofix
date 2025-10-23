export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/submissions/:id/reject
 * Body:
 * {
 *   approver: "0x...",   // optional, bilgi amaçlı
 *   reason?: "..."       // optional
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = (await req.json().catch(() => ({}))) as {
      approver?: `0x${string}`;
      reason?: string;
    };

    const sub = await prisma.submission.findUnique({ where: { id } });
    if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (sub.status === "approved")
      return NextResponse.json(
        { error: "already approved (cannot reject)" },
        { status: 409 }
      );

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        status: "rejected",
        approvedAt: new Date(),
        approvedBy: body.approver ?? null,
        note: body.reason ? `[REJECTED] ${body.reason}` : sub.note,
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
