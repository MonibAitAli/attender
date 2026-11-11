import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDevice } from "@/lib/device";
import { getIdentifierMode } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const device = readDevice(request);
  const mode = await getIdentifierMode();

  if (!device) {
    return NextResponse.json({ user: null, settings: { identifierMode: mode } });
  }

  const user = await prisma.user.findUnique({ where: { id: device.userId } });
  if (!user) {
    return NextResponse.json({ user: null, settings: { identifierMode: mode } });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      cin: user.cin,
      studentId: user.studentId,
    },
    settings: { identifierMode: mode },
  });
}
