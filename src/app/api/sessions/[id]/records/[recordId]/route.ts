import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeRecord } from "@/lib/attendance";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set(["PRESENT", "LATE", "ABSENT", "MANUAL"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; recordId: string } },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const status = (body as { status?: unknown })?.status;
  if (typeof status !== "string" || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Unknown attendance status." }, { status: 400 });
  }

  const existing = await prisma.attendanceRecord.findFirst({
    where: { id: params.recordId, sessionId: params.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  }

  const record = await prisma.attendanceRecord.update({
    where: { id: existing.id },
    data: { status },
    include: { user: true },
  });

  return NextResponse.json({ record: serializeRecord(record) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; recordId: string } },
) {
  const existing = await prisma.attendanceRecord.findFirst({
    where: { id: params.recordId, sessionId: params.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  }

  await prisma.attendanceRecord.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
