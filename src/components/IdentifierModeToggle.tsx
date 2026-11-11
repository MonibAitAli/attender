"use client";

import { useState } from "react";
import type { IdentifierMode } from "@/lib/types";

const OPTIONS: { value: IdentifierMode; label: string }[] = [
  { value: "CIN", label: "CIN" },
  { value: "STUDENT_ID", label: "Student ID" },
];

export function IdentifierModeToggle({
  initialMode,
}: {
  initialMode: IdentifierMode;
}) {
  const [mode, setMode] = useState<IdentifierMode>(initialMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: IdentifierMode) {
    if (next === mode || pending) return;
    const previous = mode;
    setMode(next);
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifierMode: next }),
      });
      const data = (await response.json()) as {
        settings?: { identifierMode: IdentifierMode };
        error?: string;
      };
      if (!response.ok || !data.settings) {
        setMode(previous);
        setError(data.error ?? "Could not change the identity mode.");
      }
    } catch {
      setMode(previous);
      setError("Could not reach the local server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => {
          const active = option.value === mode;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => change(option.value)}
              aria-pressed={active}
              disabled={pending}
              className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
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
