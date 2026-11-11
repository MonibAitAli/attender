import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTime } from "@/lib/utils";
import { NewSessionForm } from "@/components/NewSessionForm";

export const dynamic = "force-dynamic";

export default async function HostDashboardPage() {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { attendanceRecords: true } } },
  });

  const totalCheckins = sessions.reduce(
    (sum, session) => sum + session._count.attendanceRecords,
    0,
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-8 sm:px-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl text-chalk">Sessions</h1>
              <span className="rounded-full border border-chalk/15 px-2 py-0.5 font-mono text-[10px] text-chalk-dim">
                {sessions.length}
              </span>
            </div>
            {sessions.length > 0 && (
              <p className="text-[11px] text-chalk-dim">
                {totalCheckins} check-ins
              </p>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="panel flex flex-col items-center justify-center border-dashed px-6 py-14 text-center">
              <p className="font-display text-xl text-chalk">No sessions yet.</p>
              <Link href="#new-session" className="btn-primary mt-4">
                Start a session
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/host/session/${session.id}`}
                  className="group panel flex items-center justify-between gap-4 p-4 transition-colors hover:border-marigold/40 hover:bg-ink-2 sm:p-5"
                >
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-xl text-chalk">
                      {session.className}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-chalk-dim">
                      <span>{formatDate(session.createdAt)}</span>
                      <span className="font-mono">
                        {formatTime(session.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full border border-chalk/15 px-3 py-1 font-mono text-[11px] text-chalk-dim">
                      {session._count.attendanceRecords} in
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-chalk-dim transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-marigold" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside>
          <section id="new-session" className="panel scroll-mt-24 p-5">
            <h2 className="font-display text-lg text-chalk">Start a session</h2>
            <div className="mt-4">
              <NewSessionForm />
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
