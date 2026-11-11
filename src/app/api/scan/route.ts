import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markAttendance, serializeRecord } from "@/lib/attendance";
import { readDevice, setDevice } from "@/lib/device";
import { getClientIp, isAllowedClient } from "@/lib/network";
import { makePass, verifyToken } from "@/lib/qr";
import { getSettings } from "@/lib/settings";
import type { IdentifierMode, ScanResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sessionId = (body as { sessionId?: unknown })?.sessionId;
  const token = (body as { token?: unknown })?.token;
  if (typeof sessionId !== "string" || typeof token !== "string") {
    return NextResponse.json({ error: "Missing scan details." }, { status: 400 });
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "This session no longer exists." }, { status: 404 });
  }

  const clientIp = getClientIp(request);
  if (!isAllowedClient(clientIp, session.hostIp)) {
    return NextResponse.json(
      {
        error:
          "You are not on the classroom network. Connect to the professor's hotspot and scan again.",
      },
      { status: 403 },
    );
  }

  const settings = await getSettings();
  const rotationSeconds = settings.qrRotationSeconds;

  if (!verifyToken(sessionId, token, rotationSeconds)) {
    return NextResponse.json(
      {
        error:
          rotationSeconds > 0
            ? "That code has expired. Scan the refreshed code on the classroom screen."
            : "That code is not valid for this session. Scan the code on the classroom screen again.",
      },
      { status: 410 },
    );
  }

  const device = readDevice(request);
  const sessionInfo = { id: session.id, className: session.className };

  if (!device) {
    const response: ScanResponse = {
      action: "register",
      ticket: makePass({ sessionId, kind: "register" }),
      session: sessionInfo,
      message: "First scan on this device. Add your details once, then you are set.",
    };
    return NextResponse.json(response);
  }

  const user = await prisma.user.findUnique({ where: { id: device.userId } });
  if (!user) {
    const response: ScanResponse = {
      action: "register",
      ticket: makePass({ sessionId, kind: "register" }),
      session: sessionInfo,
      message: "This device is not linked to a student record yet.",
    };
    return NextResponse.json(response);
  }

  const mode: IdentifierMode =
    settings.identifierMode === "STUDENT_ID" ? "STUDENT_ID" : "CIN";
  const missing = mode === "CIN" ? !user.cin : !user.studentId;

  if (missing) {
    const response: ScanResponse = {
      action: "update-id",
      ticket: makePass({ sessionId, kind: "update", userId: user.id }),
      session: sessionInfo,
      user: { fullName: user.fullName, missing: mode },
      message:
        mode === "CIN"
          ? "Your record is missing a national ID. Add it once to continue."
          : "Your record is missing an official student ID. Add it once to continue.",
    };
    return setDevice(NextResponse.json(response), user.id, device.deviceToken);
  }

  const { record, already } = await markAttendance({
    sessionId,
    userId: user.id,
    userIp: clientIp,
    deviceToken: device.deviceToken,
  });

  const response: ScanResponse = {
    action: already ? "already" : "marked",
    record: serializeRecord(record),
    session: sessionInfo,
    message: already
      ? `You were already checked in at ${new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(record.timestamp)}.`
      : "You are marked present.",
  };

  return setDevice(NextResponse.json(response), user.id, device.deviceToken);
}
