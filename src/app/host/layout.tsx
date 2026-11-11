import Link from "next/link";
import { BrandLockup } from "@/components/BrandMark";

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-chalk/10">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <BrandLockup />
          <nav className="flex items-center gap-1">
            <Link
              href="/host/dashboard"
              className="rounded-md px-3 py-2 text-sm text-chalk-dim transition-colors hover:bg-chalk/5 hover:text-chalk"
            >
              Sessions
            </Link>
            <Link
              href="/host/settings"
              className="rounded-md px-3 py-2 text-sm text-chalk-dim transition-colors hover:bg-chalk/5 hover:text-chalk"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
