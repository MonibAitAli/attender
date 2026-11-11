import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeRecord } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await prisma.session.findUnique({ where: { id: params.id } });
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId: params.id },
    include: { user: true },
    orderBy: { timestamp: "desc" },
  });

  return NextResponse.json({
    records: records.map(serializeRecord),
    count: records.length,
  });
}
