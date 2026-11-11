import { formatTime } from "@/lib/utils";
import type { AttendanceItem } from "@/lib/types";

export function CheckInResult({
  status,
  message,
  record,
  session,
}: {
  status: "marked" | "already";
  message?: string;
  record: AttendanceItem | null;
  session: { id: string; className: string } | null;
}) {
  const identifier = record?.user.studentId ?? record?.user.cin;
  const identifierLabel = record?.user.studentId ? "Student ID" : "CIN";

  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-mint/25">
        <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
          <path
            className="check-path"
            d="M12 25 L21 34 L36 15"
            fill="none"
            stroke="#0B1F1A"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className="mt-6 font-display text-3xl leading-tight text-ink">
        {status === "already" ? "Already checked in" : "You're marked present"}
      </h1>
      {session && (
        <p className="mt-1 text-sm font-medium text-ink/60">{session.className}</p>
      )}
      {record && (
        <p className="mt-1 font-mono text-[11px] text-ink/45">
          Recorded at {formatTime(record.timestamp)}
        </p>
      )}

      {message && (
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/60">
          {message}
        </p>
      )}

      {record && (
        <div className="mt-6 w-full rounded-xl border border-dashed border-ink/20 bg-ink/[0.03] p-3.5 text-left">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink/45">
            Student
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {record.user.fullName}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-ink/55">
            {identifierLabel} {identifier ?? "not set"}
          </p>
        </div>
      )}

      <p className="mt-5 text-[11px] text-ink/45">
        You can close this page. This device stays linked to your name.
      </p>
    </div>
  );
}
