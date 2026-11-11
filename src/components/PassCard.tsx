import { cn } from "@/lib/utils";

export function PassCard({
  label = "Presence pass",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "animate-rise relative overflow-hidden rounded-2xl bg-chalk p-6 text-ink shadow-pass sm:p-7",
        className,
      )}
    >
      <div className="mb-5 border-b border-dashed border-ink/20 pb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50">
          {label}
        </span>
      </div>
      {children}
    </section>
  );
}
