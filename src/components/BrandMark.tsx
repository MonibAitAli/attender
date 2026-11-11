import Link from "next/link";
import { ScanLine } from "lucide-react";

export function BrandMark({ small = false }: { small?: boolean }) {
  const size = small ? "h-8 w-8" : "h-10 w-10";
  return (
    <span
      className={`${size} grid place-items-center rounded-lg bg-marigold text-ink shadow-[0_0_0_1px_rgba(233,180,76,0.4),0_8px_24px_-12px_rgba(233,180,76,0.8)]`}
    >
      <ScanLine className={small ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2.4} />
    </span>
  );
}

export function BrandLockup() {
  return (
    <Link href="/host/dashboard" className="inline-flex items-center gap-2.5">
      <BrandMark small />
      <span className="font-display text-xl tracking-tight text-chalk">
        Attender
      </span>
    </Link>
  );
}
