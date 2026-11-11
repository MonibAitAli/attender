import { prisma } from "@/lib/prisma";
import { getIdentifierMode } from "@/lib/settings";
import { RegisterClient } from "@/components/RegisterClient";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { sessionId?: string; ticket?: string };
}) {
  const sessionId =
    typeof searchParams.sessionId === "string" ? searchParams.sessionId : "";
  const ticket = typeof searchParams.ticket === "string" ? searchParams.ticket : "";

  const [session, mode] = await Promise.all([
    sessionId
      ? prisma.session.findUnique({
          where: { id: sessionId },
          select: { className: true },
        })
      : Promise.resolve(null),
    getIdentifierMode(),
  ]);

  return (
    <RegisterClient
      sessionId={sessionId}
      ticket={ticket}
      sessionName={session?.className ?? null}
      mode={mode}
    />
  );
}
