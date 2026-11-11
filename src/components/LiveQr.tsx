"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type QrData = {
  token: string;
  expiresAt: number;
  msRemaining: number;
  rotationSeconds: number;
  payload: string;
};

const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function LiveQr({
  sessionId,
  className,
  initialQr,
}: {
  sessionId: string;
  className: string;
  initialQr: QrData;
}) {
  const [qr, setQr] = useState<QrData>(initialQr);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const mounted = useRef(true);
  const cardRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/qr`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("QR refresh failed");
      const data = (await response.json()) as QrData;
      if (!mounted.current) return;
      setQr(data);
      setError(false);
    } catch {
      if (mounted.current) setError(true);
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) setExpanded(false);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (!expanded) {
      setExpanded(true);
      try {
        await cardRef.current?.requestFullscreen();
      } catch {
        // The fixed overlay remains usable if the browser blocks fullscreen.
      }
      return;
    }

    setExpanded(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore; the overlay has already been dismissed.
      }
    }
  }

  useEffect(() => {
    if (qr.rotationSeconds <= 0) {
      const timer = window.setTimeout(load, 30_000);
      return () => window.clearTimeout(timer);
    }
    const delay = Math.max(350, qr.expiresAt - Date.now() + 200);
    const timer = window.setTimeout(load, delay);
    return () => window.clearTimeout(timer);
  }, [qr.expiresAt, qr.rotationSeconds, load]);

  const isStatic = qr.rotationSeconds <= 0;
  const windowMs = qr.rotationSeconds > 0 ? qr.rotationSeconds * 1000 : 0;
  const remaining = windowMs > 0 ? Math.max(0, qr.expiresAt - now) : 0;
  const secondsLeft = windowMs > 0 ? Math.ceil(remaining / 1000) : 0;
  const progress =
    windowMs > 0 ? Math.min(1, Math.max(0, remaining / windowMs)) : 1;
  const expired = !isStatic && remaining <= 0;

  return (
    <section
      ref={cardRef}
      className={cn(
        "rounded-2xl bg-chalk p-5 text-ink shadow-pass sm:p-6",
        expanded &&
          "fixed inset-0 z-50 flex flex-col overflow-auto rounded-none shadow-none",
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-4",
          expanded && "mx-auto w-full max-w-6xl",
        )}
      >
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/55">
            Scan to check in
          </p>
          <h2
            className={cn(
              "mt-1 truncate font-display text-2xl leading-tight text-ink sm:text-3xl",
              expanded && "text-3xl sm:text-4xl",
            )}
          >
            {className}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {isStatic ? (
            <span className="rounded-full border border-ink/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/60">
              Static
            </span>
          ) : (
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative",
                  expanded ? "h-16 w-16" : "h-12 w-12",
                )}
              >
                <svg
                  viewBox="0 0 48 48"
                  className={cn(
                    "-rotate-90",
                    expanded ? "h-16 w-16" : "h-12 w-12",
                  )}
                >
                  <circle
                    cx="24"
                    cy="24"
                    r={RING_RADIUS}
                    fill="none"
                    stroke="rgba(11,31,26,0.12)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r={RING_RADIUS}
                    fill="none"
                    stroke={error ? "#E76F51" : "#E9B44C"}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                    className="transition-[stroke-dashoffset] duration-100 ease-linear"
                  />
                </svg>
                <span
                  className={cn(
                    "absolute inset-0 grid place-items-center font-mono font-semibold text-ink",
                    expanded ? "text-base" : "text-[13px]",
                  )}
                >
                  {expired ? "0" : secondsLeft}
                </span>
              </div>
              <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink/45">
                sec
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink/20 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/60 transition-colors hover:border-ink/40 hover:text-ink"
            title={expanded ? "Exit fullscreen" : "Fullscreen QR"}
            aria-label={expanded ? "Exit fullscreen" : "Fullscreen QR"}
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
            {expanded ? "Exit" : "Fullscreen"}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "mt-5 flex justify-center",
          expanded && "min-h-0 flex-1 items-center py-2",
        )}
      >
        <div
          className={cn(
            "rounded-2xl border border-ink/10 bg-white p-3",
            expanded && "h-[min(68vh,78vw)] w-[min(68vh,78vw)] p-4",
          )}
        >
          <QRCodeSVG
            value={qr.payload}
            size={expanded ? 1024 : 208}
            bgColor="#ffffff"
            fgColor="#0B1F1A"
            level="M"
            className={cn(expanded ? "h-full w-full" : "h-[208px] w-[208px]")}
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1 rounded-md border border-coral/40 px-2 py-1 text-[10px] font-semibold text-coral transition-colors hover:bg-coral/10"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Reconnecting
          </button>
        </div>
      )}
    </section>
  );
}
