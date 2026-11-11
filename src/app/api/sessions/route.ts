import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHostAddress } from "@/lib/network";
import { currentBucket, makeToken, rotationWindowMs } from "@/lib/qr";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { attendanceRecords: true } } },
  });

  return NextResponse.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      className: session.className,
      date: session.date.toISOString(),
      hostIp: session.hostIp,
      createdAt: session.createdAt.toISOString(),
      count: session._count.attendanceRecords,
    })),
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const className = (body as { className?: unknown })?.className;
  if (typeof className !== "string" || className.trim().length < 2) {
    return NextResponse.json(
      { error: "Give the session a name of at least 2 characters." },
      { status: 400 },
    );
  }

  const trimmed = className.trim();
  if (trimmed.length > 80) {
    return NextResponse.json(
      { error: "Session name must be 80 characters or fewer." },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const settings = await getSettings();
  const windowMs = rotationWindowMs(settings.qrRotationSeconds);
  const activeToken = makeToken(id, windowMs, currentBucket(windowMs, now.getTime()));

  const session = await prisma.session.create({
    data: {
      id,
      className: trimmed,
      hostIp: getHostAddress(request),
      activeToken,
      tokenCreatedAt: now,
    },
  });

  return NextResponse.json(
    {
      session: {
        id: session.id,
        className: session.className,
        date: session.date.toISOString(),
        hostIp: session.hostIp,
        createdAt: session.createdAt.toISOString(),
        count: 0,
      },
    },
    { status: 201 },
  );
}
