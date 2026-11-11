import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DEVICE_COOKIE, verifyDevice } from "@/lib/device";
import { getIdentifierMode } from "@/lib/settings";
import { UpdateIdClient } from "@/components/UpdateIdClient";

export const dynamic = "force-dynamic";

export default async function UpdateIdPage({
  searchParams,
}: {
  searchParams: { sessionId?: string; ticket?: string };
}) {
  const sessionId =
    typeof searchParams.sessionId === "string" ? searchParams.sessionId : "";
  const ticket = typeof searchParams.ticket === "string" ? searchParams.ticket : "";

  const device = verifyDevice(cookies().get(DEVICE_COOKIE)?.value);

  const [session, mode, user] = await Promise.all([
    sessionId
      ? prisma.session.findUnique({
          where: { id: sessionId },
          select: { className: true },
        })
      : Promise.resolve(null),
    getIdentifierMode(),
    device
      ? prisma.user.findUnique({
          where: { id: device.userId },
          select: { fullName: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <UpdateIdClient
      sessionId={sessionId}
      ticket={ticket}
      sessionName={session?.className ?? null}
      fullName={user?.fullName ?? null}
      mode={mode}
    />
  );
}
