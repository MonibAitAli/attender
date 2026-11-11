import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

function csvCell(value: string | null | undefined): string {
  const text = value ?? "";
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      attendanceRecords: {
        include: { user: true },
        orderBy: { timestamp: "asc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const rows: string[] = [];
  rows.push(
    [
      "Full name",
      "CIN",
      "Student ID",
      "Status",
      "Timestamp",
      "IP address",
      "Device token",
    ]
      .map(csvCell)
      .join(","),
  );

  for (const record of session.attendanceRecords) {
    rows.push(
      [
        record.user.fullName,
        record.user.cin,
        record.user.studentId,
        statusLabel(record.status),
        record.timestamp.toISOString(),
        record.userIp,
        record.deviceToken,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const slug =
    session.className
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "session";
  const day = session.date.toISOString().slice(0, 10);
  const filename = `${slug}-attendance-${day}.csv`;

  return new NextResponse(`\uFEFF${rows.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
