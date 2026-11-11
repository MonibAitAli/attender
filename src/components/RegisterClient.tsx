"use client";

import { useState } from "react";
import { ArrowRight, Loader2, TriangleAlert } from "lucide-react";
import { PassCard } from "@/components/PassCard";
import { CheckInResult } from "@/components/CheckInResult";
import { deviceHeaders, rememberDeviceFromResponse } from "@/lib/device-client";
import type {
  AttendanceItem,
  IdentifierMode,
  ScanResponse,
} from "@/lib/types";

export function RegisterClient({
  sessionId,
  ticket,
  sessionName,
  mode,
}: {
  sessionId: string;
  ticket: string;
  sessionName: string | null;
  mode: IdentifierMode;
}) {
  const [fullName, setFullName] = useState("");
  const [identifierValue, setIdentifierValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    status: "marked" | "already";
    message?: string;
    record: AttendanceItem | null;
    session: { id: string; className: string } | null;
  } | null>(null);

  const ready = Boolean(sessionId && ticket && sessionName);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);

    if (fullName.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (identifierValue.trim().length < 2) {
      setError(
        mode === "CIN"
          ? "Enter your national ID (CIN)."
          : "Enter your official student ID.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...deviceHeaders() },
        body: JSON.stringify({
          sessionId,
          ticket,
          fullName,
          identifierValue,
        }),
      });
      rememberDeviceFromResponse(response);
      const data = (await response.json().catch(() => ({}))) as ScanResponse & {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Could not complete registration.");
        setLoading(false);
        return;
      }

      if (data.action === "marked" || data.action === "already") {
        setResult({
          status: data.action,
          message: data.message,
          record: data.record ?? null,
          session: data.session ?? null,
        });
        return;
      }

      setError("Registration did not complete. Scan the classroom code again.");
      setLoading(false);
    } catch {
      setError(
        "Could not reach the local server. Make sure you are on the classroom hotspot.",
      );
      setLoading(false);
    }
  }

  if (result) {
    return (
      <PassCard>
        <CheckInResult
          status={result.status}
          message={result.message}
          record={result.record}
          session={result.session}
        />
      </PassCard>
    );
  }

  if (!ready) {
    return (
      <PassCard>
        <div className="flex flex-col items-center py-6 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-coral/15 text-coral">
            <TriangleAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-3xl leading-tight text-ink">
            Scan first
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink/65">
            This registration link is missing or the session is gone. Scan the QR
            code on the classroom screen to start again.
          </p>
        </div>
      </PassCard>
    );
  }

  const identifierLabel = mode === "CIN" ? "National ID (CIN)" : "Official student ID";

  return (
    <PassCard label="First check-in">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">
        Checking in to
      </p>
      <h1 className="mt-1 font-display text-2xl leading-tight text-ink">
        {sessionName}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/60">
        Add your details once. This device will stay linked to your name for
        future scans.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="fullName" className="label-light">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="field-light mt-1.5"
            placeholder="e.g. Amina Benali"
            autoComplete="name"
            maxLength={80}
            required
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="identifierValue" className="label-light">
            {identifierLabel}
          </label>
          <input
            id="identifierValue"
            name="identifierValue"
            value={identifierValue}
            onChange={(event) => setIdentifierValue(event.target.value)}
            className="field-light mt-1.5 font-mono"
            placeholder={mode === "CIN" ? "e.g. 12345678" : "e.g. 2024-00123"}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={40}
            required
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-coral/30 bg-coral/10 px-3 py-2 text-xs leading-relaxed text-coral"
          >
            {error}
          </p>
        )}

        <button type="submit" className="btn-ink w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking you in…
            </>
          ) : (
            <>
              Check me in
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-4 text-[11px] leading-relaxed text-ink/45">
        One device, one student. If this device is already linked to someone
        else, check-in stops and asks the professor to reset it.
      </p>
    </PassCard>
  );
}
