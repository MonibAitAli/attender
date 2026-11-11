import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl, getLanIp } from "@/lib/network";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    baseUrl: getBaseUrl(request),
    lanIp: getLanIp(),
  });
}
