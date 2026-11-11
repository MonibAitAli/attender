"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ScanLine, TriangleAlert } from "lucide-react";
import { PassCard } from "@/components/PassCard";
import { CheckInResult } from "@/components/CheckInResult";
import { deviceHeaders, rememberDeviceFromResponse } from "@/lib/device-client";
import type { AttendanceItem, ScanResponse } from "@/lib/types";

type Phase = "checking" | "success" | "already" | "redirecting" | "error";

export function ScanClient({
  sessionId,
  token,
}: {
  sessionId: string;
  token: string;
}) {
  const router = useRouter();
  const started = useRef(false);
  const [phase, setPhase] = useState<Phase>("checking");
  const [message, setMessage] = useState<string | undefined>();
  const [record, setRecord] = useState<AttendanceItem | null>(null);
  const [session, setSession] = useState<{ id: string; className: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!sessionId || !token) {
      setPhase("error");
      setError(
        "This check-in link is incomplete. Scan the QR code on the classroom screen again.",
      );
      return;
    }

    setPhase("checking");
    setError(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...deviceHeaders() },
        body: JSON.stringify({ sessionId, token }),
      });
      rememberDeviceFromResponse(response);
      const data = (await response.json().catch(() => ({}))) as ScanResponse & {
        error?: string;
      };

      if (!response.ok) {
        setPhase("error");
        setError(data.error ?? "Could not verify this check-in.");
        return;
      }

      if (data.action === "register" && data.ticket) {
        setPhase("redirecting");
        router.replace(
          `/register?sessionId=${encodeURIComponent(sessionId)}&ticket=${encodeURIComponent(
            data.ticket,
          )}`,
        );
        return;
      }

      if (data.action === "update-id" && data.ticket) {
        setPhase("redirecting");
        router.replace(
          `/update-id?sessionId=${encodeURIComponent(sessionId)}&ticket=${encodeURIComponent(
            data.ticket,
          )}`,
        );
        return;
      }

      if (data.action === "marked" || data.action === "already") {
        setMessage(data.message);
        setRecord(data.record ?? null);
        setSession(data.session ?? null);
        setPhase(data.action === "already" ? "already" : "success");
        return;
      }

      setPhase("error");
      setError("The check-in could not be completed. Scan the code again.");
    } catch {
      setPhase("error");
      setError(
        "Could not reach the local server. Make sure you are on the classroom hotspot.",
      );
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "success" || phase === "already") {
    return (
      <PassCard>
        <CheckInResult
          status={phase === "already" ? "already" : "marked"}
          message={message}
          record={record}
          session={session}
        />
      </PassCard>
    );
  }

  if (phase === "redirecting") {
    return (
      <PassCard label="First check-in">
        <div className="flex flex-col items-center py-10 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full border border-ink/15">
            <ScanLine className="h-7 w-7 text-ink/70" />
          </div>
          <h1 className="mt-5 font-display text-2xl text-ink">
            Setting up this device
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            One quick registration, then check-in is a single tap.
          </p>
        </div>
      </PassCard>
    );
  }

  if (phase === "error") {
    return (
      <PassCard>
        <div className="flex flex-col items-center py-6 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-coral/15 text-coral">
            <TriangleAlert className="h-9 w-9" />
          </div>
          <h1 className="mt-6 font-display text-3xl leading-tight text-ink">
            Check-in paused
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink/65">
            {error}
          </p>
          <button type="button" onClick={() => void run()} className="btn-ink mt-6 w-full">
            Try again
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-3 text-[11px] leading-relaxed text-ink/45">
            If the code expired, scan the refreshed QR on the classroom screen.
          </p>
        </div>
      </PassCard>
    );
  }

  return (
    <PassCard>
      <div className="flex flex-col items-center py-8 text-center">
        <div className="relative grid h-20 w-20 place-items-center rounded-full border border-ink/15">
          <span className="absolute inset-0 rounded-full border border-ink/20 animate-ping-soft" />
          <ScanLine className="h-8 w-8 text-ink" />
        </div>
        <h1 className="mt-6 font-display text-3xl leading-tight text-ink">
          Verifying presence
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink/60">
          Checking the live code, this device, and the classroom network.
        </p>
        <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-ink/10">
          <div className="animate-sweep h-full w-1/3 rounded-full bg-marigold" />
        </div>
      </div>
    </PassCard>
  );
}
