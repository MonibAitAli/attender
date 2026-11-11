import { headers } from "next/headers";
import { getSettings } from "@/lib/settings";
import { resolveBaseUrl } from "@/lib/network";
import { IdentifierModeToggle } from "@/components/IdentifierModeToggle";
import { QrRotationToggle } from "@/components/QrRotationToggle";
import { CopyButton } from "@/components/CopyButton";
import type { IdentifierMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HostSettingsPage() {
  const settings = await getSettings();
  const headerStore = headers();
  const baseUrl = resolveBaseUrl(
    headerStore.get("host") ?? "localhost:3000",
    headerStore.get("x-forwarded-proto") ?? "http",
  );
  const mode: IdentifierMode =
    settings.identifierMode === "STUDENT_ID" ? "STUDENT_ID" : "CIN";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-8 sm:px-8">
      <h1 className="font-display text-3xl text-chalk">Settings</h1>

      <div className="mt-6 space-y-5">
        <section className="panel p-5">
          <h2 className="font-display text-lg text-chalk">Student identity</h2>
          <div className="mt-4">
            <IdentifierModeToggle initialMode={mode} />
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="font-display text-lg text-chalk">Code rotation</h2>
          <div className="mt-4">
            <QrRotationToggle initialSeconds={settings.qrRotationSeconds} />
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="font-display text-lg text-chalk">Join address</h2>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-chalk/10 bg-ink/40 px-3 py-2">
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-chalk">
              {baseUrl}
            </code>
            <CopyButton value={baseUrl} label="Copy" />
          </div>
        </section>
      </div>
    </main>
  );
}
