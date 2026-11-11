import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeRecord } from "@/lib/attendance";
import { resolveBaseUrl } from "@/lib/network";
import { describeCurrentToken } from "@/lib/qr";
import { getSettings } from "@/lib/settings";
import { SessionClient } from "@/components/SessionClient";
import type { IdentifierMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HostSessionPage({
  params,
}: {
  params: { id: string };
}) {
  const [session, settings] = await Promise.all([
    prisma.session.findUnique({
      where: { id: params.id },
      include: {
        attendanceRecords: {
          include: { user: true },
          orderBy: { timestamp: "desc" },
        },
      },
    }),
    getSettings(),
  ]);

  if (!session) notFound();

  const identifierMode: IdentifierMode =
    settings.identifierMode === "STUDENT_ID" ? "STUDENT_ID" : "CIN";
  const rotationSeconds = settings.qrRotationSeconds;

  const headerStore = headers();
  const baseUrl = resolveBaseUrl(
    headerStore.get("host") ?? "localhost:3000",
    headerStore.get("x-forwarded-proto") ?? "http",
  );
  const current = describeCurrentToken(session.id, rotationSeconds);

  return (
    <SessionClient
      session={{
        id: session.id,
        className: session.className,
        date: session.date.toISOString(),
        hostIp: session.hostIp,
        createdAt: session.createdAt.toISOString(),
        count: session.attendanceRecords.length,
      }}
      initialRecords={session.attendanceRecords.map(serializeRecord)}
      identifierMode={identifierMode}
      initialQr={{
        token: current.token,
        expiresAt: current.expiresAt,
        msRemaining: current.msRemaining,
        rotationSeconds: current.rotationSeconds,
        payload: `${baseUrl}/scan?sessionId=${encodeURIComponent(
          session.id,
        )}&token=${encodeURIComponent(current.token)}`,
      }}
    />
  );
}
