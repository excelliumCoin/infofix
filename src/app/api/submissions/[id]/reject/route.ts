import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/submissions/:id/reject
 * Body:
 * {
 *   approver: "0x...",    // bilgilendirme amaçlı
 *   reason?: "metin"      // opsiyonel
 * }
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
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
