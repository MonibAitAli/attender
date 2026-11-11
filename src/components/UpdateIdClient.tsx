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

export function UpdateIdClient({
  sessionId,
  ticket,
  sessionName,
  fullName,
  mode,
}: {
  sessionId: string;
  ticket: string;
  sessionName: string | null;
  fullName: string | null;
  mode: IdentifierMode;
}) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    status: "marked" | "already";
    message?: string;
    record: AttendanceItem | null;
    session: { id: string; className: string } | null;
  } | null>(null);

  const ready = Boolean(sessionId && ticket && sessionName && fullName);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);

    if (value.trim().length < 2) {
      setError(
        mode === "CIN" ? "Enter your national ID (CIN)." : "Enter your official student ID.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/update-id", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...deviceHeaders() },
        body: JSON.stringify({ sessionId, ticket, value }),
      });
      rememberDeviceFromResponse(response);
      const data = (await response.json().catch(() => ({}))) as ScanResponse & {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Could not update your record.");
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

      setError("The update did not complete. Scan the classroom code again.");
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
            Scan again
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink/65">
            This device is not linked to a student record, or the update link has
            expired. Scan the QR code on the classroom screen.
          </p>
        </div>
      </PassCard>
    );
  }

  const identifierLabel = mode === "CIN" ? "National ID (CIN)" : "Official student ID";

  return (
    <PassCard label="Update your record">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">
        One more field
      </p>
      <h1 className="mt-1 font-display text-2xl leading-tight text-ink">
        {fullName}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/60">
        Your record is missing a {identifierLabel.toLowerCase()}. Add it once to
        finish checking in to {sessionName}.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="identifierValue" className="label-light">
            {identifierLabel}
          </label>
          <input
            id="identifierValue"
            name="identifierValue"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="field-light mt-1.5 font-mono"
            placeholder={mode === "CIN" ? "e.g. 12345678" : "e.g. 2024-00123"}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={40}
            required
            autoFocus
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
              Updating record…
            </>
          ) : (
            <>
              Save and check in
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </PassCard>
  );
}
