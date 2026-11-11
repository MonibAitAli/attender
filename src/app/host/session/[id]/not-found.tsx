import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function SessionNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-5 py-20 text-center sm:px-8">
      <div className="grid h-12 w-12 place-items-center rounded-full border border-chalk/15 text-chalk-dim">
        <SearchX className="h-5 w-5" />
      </div>
      <h1 className="mt-4 font-display text-3xl text-chalk">Session not found</h1>
      <p className="mt-2 max-w-sm text-sm text-chalk-dim">
        It may have been deleted, or the link is from a different local database.
      </p>
      <Link href="/host/dashboard" className="btn-primary mt-6">
        <ArrowLeft className="h-4 w-4" />
        Back to the session ledger
      </Link>
    </main>
  );
}
