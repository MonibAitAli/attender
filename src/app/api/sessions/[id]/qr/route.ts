import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBaseUrl, getHostAddress } from "@/lib/network";
import { describeCurrentToken } from "@/lib/qr";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const [session, settings] = await Promise.all([
    prisma.session.findUnique({ where: { id: params.id } }),
    getSettings(),
  ]);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const rotationSeconds = settings.qrRotationSeconds;
  const current = describeCurrentToken(session.id, rotationSeconds);
  const baseUrl = getBaseUrl(request);
  const hostIp = getHostAddress(request);

  const updates: {
    activeToken?: string;
    tokenCreatedAt?: Date;
    hostIp?: string;
  } = {};

  if (session.activeToken !== current.token) {
    updates.activeToken = current.token;
    updates.tokenCreatedAt = new Date();
  }

  if (hostIp && hostIp !== session.hostIp) {
    updates.hostIp = hostIp;
  }

  if (Object.keys(updates).length > 0) {
    await prisma.session.update({
      where: { id: session.id },
      data: updates,
    });
  }

  return NextResponse.json({
    sessionId: session.id,
    className: session.className,
    token: current.token,
    bucket: current.bucket,
    expiresAt: current.expiresAt,
    msRemaining: current.msRemaining,
    rotationSeconds: current.rotationSeconds,
    baseUrl,
    payload: `${baseUrl}/scan?sessionId=${encodeURIComponent(session.id)}&token=${encodeURIComponent(current.token)}`,
  });
}
