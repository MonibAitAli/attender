import { ScanClient } from "@/components/ScanClient";

export default function ScanPage({
  searchParams,
}: {
  searchParams: { sessionId?: string; token?: string };
}) {
  return (
    <ScanClient
      sessionId={typeof searchParams.sessionId === "string" ? searchParams.sessionId : ""}
      token={typeof searchParams.token === "string" ? searchParams.token : ""}
    />
  );
}
