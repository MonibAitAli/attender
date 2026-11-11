import { BrandLockup } from "@/components/BrandMark";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-chalk/10">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <BrandLockup />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
            Student check-in
          </span>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="border-t border-chalk/10">
        <div className="mx-auto w-full max-w-3xl px-5 py-5 text-[11px] leading-relaxed text-chalk-dim sm:px-8">
          Attendance is tied to this device and the classroom network. Connect to
          the professor&apos;s hotspot before scanning.
        </div>
      </footer>
    </div>
  );
}
