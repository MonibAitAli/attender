import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeRecord } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      attendanceRecords: {
        include: { user: true },
        orderBy: { timestamp: "desc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      className: session.className,
      date: session.date.toISOString(),
      hostIp: session.hostIp,
      createdAt: session.createdAt.toISOString(),
      count: session.attendanceRecords.length,
    },
    records: session.attendanceRecords.map(serializeRecord),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await prisma.session.findUnique({ where: { id: params.id } });
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  await prisma.session.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
