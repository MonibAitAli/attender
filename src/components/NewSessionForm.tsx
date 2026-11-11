"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function NewSessionForm() {
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ className }),
      });
      const data = (await response.json()) as {
        session?: { id: string };
        error?: string;
      };

      if (!response.ok || !data.session) {
        setError(data.error ?? "Could not start the session.");
        setLoading(false);
        return;
      }

      router.push(`/host/session/${data.session.id}`);
    } catch {
      setError("Could not reach the local server. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="className" className="label">
          Class or section
        </label>
        <input
          id="className"
          name="className"
          value={className}
          onChange={(event) => setClassName(event.target.value)}
          className="field mt-1.5"
          placeholder="e.g. CS 204 — Section A"
          maxLength={80}
          autoComplete="off"
          required
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-coral/30 bg-coral/10 px-3 py-2 text-xs text-coral">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting…
          </>
        ) : (
          "Start session"
        )}
      </button>
    </form>
  );
}
