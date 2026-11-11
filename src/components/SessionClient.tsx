"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { LiveQr, type QrData } from "@/components/LiveQr";
import type { AttendanceItem, IdentifierMode, SessionSummary } from "@/lib/types";
import { cn, formatDate, formatTime, initials } from "@/lib/utils";

function statusClass(status: string): string {
  switch (status) {
    case "PRESENT":
      return "border-mint/40 bg-mint/10 text-mint";
    case "LATE":
      return "border-marigold/40 bg-marigold/10 text-marigold";
    case "ABSENT":
      return "border-coral/40 bg-coral/10 text-coral";
    default:
      return "border-chalk/20 bg-chalk/5 text-chalk-dim";
  }
}

function identifierFor(record: AttendanceItem, mode: IdentifierMode) {
  const preferred = mode === "CIN" ? record.user.cin : record.user.studentId;
  const fallback = mode === "CIN" ? record.user.studentId : record.user.cin;
  if (preferred) {
    return { label: mode === "CIN" ? "CIN" : "STU", value: preferred };
  }
  if (fallback) {
    return { label: mode === "CIN" ? "STU" : "CIN", value: fallback };
  }
  return { label: "ID", value: "not set" };
}

export function SessionClient({
  session,
  initialRecords,
  identifierMode,
  initialQr,
}: {
  session: SessionSummary;
  initialRecords: AttendanceItem[];
  identifierMode: IdentifierMode;
  initialQr: QrData;
}) {
  const router = useRouter();
  const [records, setRecords] = useState<AttendanceItem[]>(initialRecords);
  const [query, setQuery] = useState("");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmSessionDelete, setConfirmSessionDelete] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);

  const recordsRef = useRef(initialRecords);
  const flashTimer = useRef<number | null>(null);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function sync() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`/api/sessions/${session.id}/records`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { records: AttendanceItem[] };
        if (!active) return;

        const known = new Set(recordsRef.current.map((record) => record.id));
        const fresh = data.records.filter((record) => !known.has(record.id));

        if (fresh.length > 0) {
          setNewIds(new Set(fresh.map((record) => record.id)));
          if (flashTimer.current) window.clearTimeout(flashTimer.current);
          flashTimer.current = window.setTimeout(() => setNewIds(new Set()), 1800);
        }

        recordsRef.current = data.records;
        setRecords(data.records);
      } catch {
        // Keep the last known list; the next tick retries.
      }
    }

    const timer = window.setInterval(sync, 2500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [session.id]);

  const stats = useMemo(() => {
    const inRoom = records.filter((record) => record.status !== "ABSENT").length;
    const late = records.filter((record) => record.status === "LATE").length;
    const absent = records.filter((record) => record.status === "ABSENT").length;
    return { inRoom, late, absent };
  }, [records]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((record) => {
      return (
        record.user.fullName.toLowerCase().includes(needle) ||
        (record.user.cin ?? "").toLowerCase().includes(needle) ||
        (record.user.studentId ?? "").toLowerCase().includes(needle)
      );
    });
  }, [records, query]);

  async function updateStatus(recordId: string, status: string) {
    if (busyId) return;
    setBusyId(recordId);
    setError(null);
    try {
      const response = await fetch(
        `/api/sessions/${session.id}/records/${recordId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const data = (await response.json()) as {
        record?: AttendanceItem;
        error?: string;
      };
      if (!response.ok || !data.record) {
        throw new Error(data.error ?? "Could not update that record.");
      }
      setRecords((previous) =>
        previous.map((record) =>
          record.id === recordId ? (data.record as AttendanceItem) : record,
        ),
      );
      recordsRef.current = recordsRef.current.map((record) =>
        record.id === recordId ? (data.record as AttendanceItem) : record,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update that record.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeRecord(recordId: string) {
    if (busyId) return;
    setBusyId(recordId);
    setError(null);
    try {
      const response = await fetch(
        `/api/sessions/${session.id}/records/${recordId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not delete that record.");
      }
      setRecords((previous) =>
        previous.filter((record) => record.id !== recordId),
      );
      recordsRef.current = recordsRef.current.filter(
        (record) => record.id !== recordId,
      );
      setConfirmingId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete that record.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteSession() {
    setDeletingSession(true);
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not delete the session.");
      }
      router.push("/host/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the session.");
      setDeletingSession(false);
      setConfirmSessionDelete(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-16 pt-8 sm:px-8">
      <div className="animate-rise">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="max-w-2xl truncate font-display text-4xl leading-[1.05] tracking-tight text-chalk sm:text-5xl">
              {session.className}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-chalk-dim">
              <span>
                <span className="font-mono">{formatDate(session.date)}</span> at{" "}
                <span className="font-mono">{formatTime(session.createdAt)}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/sessions/${session.id}/export`}
              className="btn-ghost"
              download
            >
              Export CSV
            </a>
            {confirmSessionDelete ? (
              <div className="flex items-center gap-2 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2">
                <span className="text-[11px] text-coral">Delete session?</span>
                <button
                  type="button"
                  onClick={deleteSession}
                  disabled={deletingSession}
                  className="text-[11px] font-semibold text-coral underline underline-offset-2 disabled:opacity-50"
                >
                  {deletingSession ? "Deleting…" : "Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmSessionDelete(false)}
                  className="text-[11px] text-chalk-dim hover:text-chalk"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmSessionDelete(true)}
                className="btn-quiet text-coral hover:bg-coral/10"
                title="Delete session"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 divide-x divide-chalk/10 overflow-hidden rounded-xl border border-chalk/10 bg-ink-2/50">
          <div className="px-4 py-3 sm:px-5 sm:py-4">
            <p className="data-label">In the room</p>
            <p className="mt-1 font-display text-3xl leading-none text-chalk sm:text-4xl">
              {stats.inRoom}
            </p>
          </div>
          <div className="px-4 py-3 sm:px-5 sm:py-4">
            <p className="data-label">Late</p>
            <p className="mt-1 font-display text-3xl leading-none text-marigold sm:text-4xl">
              {stats.late}
            </p>
          </div>
          <div className="px-4 py-3 sm:px-5 sm:py-4">
            <p className="data-label">Absent</p>
            <p className="mt-1 font-display text-3xl leading-none text-coral sm:text-4xl">
              {stats.absent}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <LiveQr
          sessionId={session.id}
          className={session.className}
          initialQr={initialQr}
        />

        <section className="panel flex min-w-0 flex-col overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-chalk/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl text-chalk">Live feed</h2>
              <span className="rounded-full border border-chalk/15 px-2 py-0.5 font-mono text-[10px] text-chalk-dim">
                {records.length}
              </span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-chalk-dim" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a student"
                aria-label="Find a student"
                className="field h-9 w-full pl-8 text-xs sm:w-52"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-chalk-dim hover:bg-chalk/10 hover:text-chalk"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="border-b border-coral/20 bg-coral/10 px-4 py-2 text-xs text-coral"
            >
              {error}
            </div>
          )}

          {records.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
              <p className="text-sm text-chalk-dim">No check-ins yet.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <h3 className="font-display text-lg text-chalk">
                No student matches “{query}”
              </h3>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="btn-quiet mt-2"
              >
                Clear search
              </button>
            </div>
          ) : (
            <ul className="flex-1">
              {filtered.map((record) => {
                const identifier = identifierFor(record, identifierMode);
                const busy = busyId === record.id;
                return (
                  <li
                    key={record.id}
                    className={cn(
                      "ledger-row flex items-start gap-3 border-b border-chalk/[0.07] px-4 py-3 last:border-b-0",
                      newIds.has(record.id) && "animate-flash",
                    )}
                  >
                    <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-chalk/15 bg-ink/50 font-mono text-[11px] text-chalk-dim">
                      {initials(record.user.fullName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-chalk">
                        {record.user.fullName}
                      </p>
                      <div className="mt-1 flex min-w-0 items-center gap-2 font-mono text-[10px] text-chalk-dim">
                        <span className="shrink-0 text-chalk-dim/60">
                          {identifier.label}
                        </span>
                        <span className="truncate">{identifier.value}</span>
                        <span className="h-2.5 w-px shrink-0 bg-chalk/20" />
                        <span className="truncate">{record.userIp}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="font-mono text-[10px] text-chalk-dim">
                        {formatTime(record.timestamp)}
                      </span>

                      {confirmingId === record.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-coral">Delete?</span>
                          <button
                            type="button"
                            onClick={() => removeRecord(record.id)}
                            disabled={busy}
                            className="rounded-md border border-coral/40 bg-coral/10 px-1.5 py-0.5 text-[10px] font-semibold text-coral disabled:opacity-50"
                          >
                            {busy ? "…" : "Yes"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            className="rounded-md border border-chalk/15 px-1.5 py-0.5 text-[10px] text-chalk-dim hover:text-chalk"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="relative">
                            <select
                              value={record.status}
                              onChange={(event) =>
                                updateStatus(record.id, event.target.value)
                              }
                              disabled={busy}
                              aria-label={`Attendance status for ${record.user.fullName}`}
                              className={cn(
                                "appearance-none rounded-full border py-1 pl-2.5 pr-6 font-mono text-[9px] uppercase tracking-[0.08em] outline-none transition-colors disabled:opacity-50",
                                statusClass(record.status),
                              )}
                            >
                              <option className="bg-ink-2 text-chalk" value="PRESENT">
                                Present
                              </option>
                              <option className="bg-ink-2 text-chalk" value="LATE">
                                Late
                              </option>
                              <option className="bg-ink-2 text-chalk" value="ABSENT">
                                Absent
                              </option>
                              <option className="bg-ink-2 text-chalk" value="MANUAL">
                                Manual
                              </option>
                            </select>
                            {busy ? (
                              <Loader2 className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin opacity-70" />
                            ) : (
                              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 opacity-60" />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(record.id)}
                            className="grid h-6 w-6 place-items-center rounded-md text-chalk-dim transition-colors hover:bg-coral/10 hover:text-coral"
                            title={`Delete record for ${record.user.fullName}`}
                            aria-label={`Delete record for ${record.user.fullName}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
