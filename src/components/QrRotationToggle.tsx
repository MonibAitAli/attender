"use client";

import { useState } from "react";

const OPTIONS = [
  { value: 10, label: "10 sec" },
  { value: 60, label: "60 sec" },
  { value: 0, label: "Static" },
] as const;

export function QrRotationToggle({
  initialSeconds,
}: {
  initialSeconds: number;
}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: number) {
    if (next === seconds || pending) return;
    const previous = seconds;
    setSeconds(next);
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrRotationSeconds: next }),
      });
      const data = (await response.json()) as {
        settings?: { qrRotationSeconds: number };
        error?: string;
      };
      if (!response.ok || !data.settings) {
        setSeconds(previous);
        setError(data.error ?? "Could not change code rotation.");
      }
    } catch {
      setSeconds(previous);
      setError("Could not reach the local server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => {
          const active = option.value === seconds;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => change(option.value)}
              aria-pressed={active}
              disabled={pending}
              className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                active
                  ? "border-marigold bg-marigold text-ink"
                  : "border-chalk/15 text-chalk-dim hover:border-chalk/30 hover:text-chalk"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-xs text-coral">
          {error}
        </p>
      )}
    </div>
  );
}
