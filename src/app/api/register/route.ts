import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markAttendance, serializeRecord } from "@/lib/attendance";
import { createDeviceToken, readDevice, setDevice } from "@/lib/device";
import { getClientIp, isAllowedClient } from "@/lib/network";
import { verifyPass } from "@/lib/qr";
import { getIdentifierMode } from "@/lib/settings";
import type { ScanResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const data = body as {
    sessionId?: unknown;
    ticket?: unknown;
    fullName?: unknown;
    identifierValue?: unknown;
  };

  const sessionId = typeof data.sessionId === "string" ? data.sessionId : "";
  const ticket = typeof data.ticket === "string" ? data.ticket : "";
  const fullName = typeof data.fullName === "string" ? data.fullName.trim() : "";
  const identifierValue =
    typeof data.identifierValue === "string" ? data.identifierValue.trim() : "";

  if (!sessionId || !ticket) {
    return NextResponse.json(
      { error: "Scan the classroom QR code before registering." },
      { status: 400 },
    );
  }

  const pass = verifyPass(ticket, "register", sessionId);
  if (!pass) {
    return NextResponse.json(
      { error: "This registration pass has expired. Scan the classroom code again." },
      { status: 410 },
    );
  }

  if (fullName.length < 2 || fullName.length > 80) {
    return NextResponse.json(
      { error: "Enter your full name (2 to 80 characters)." },
      { status: 400 },
    );
  }

  if (identifierValue.length < 2 || identifierValue.length > 40) {
    return NextResponse.json(
      { error: "Enter a valid identifier (2 to 40 characters)." },
      { status: 400 },
    );
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

  const mode = await getIdentifierMode();
  const field = mode === "CIN" ? "cin" : "studentId";
  const existingDevice = readDevice(request);

  let user = await prisma.user.findUnique({
    where: field === "cin" ? { cin: identifierValue } : { studentId: identifierValue },
  });

  if (existingDevice) {
    const boundUser = await prisma.user.findUnique({
      where: { id: existingDevice.userId },
    });
    if (boundUser && (!user || boundUser.id !== user.id)) {
      return NextResponse.json(
        {
          error: `This device is already linked to ${boundUser.fullName}. Ask the professor to reset the device if this is wrong.`,
        },
        { status: 409 },
      );
    }
  }

  if (!user) {
    try {
      user = await prisma.user.create({
        data:
          field === "cin"
            ? { fullName, cin: identifierValue }
            : { fullName, studentId: identifierValue },
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        return NextResponse.json(
          { error: "That identifier is already registered. Try scanning again." },
          { status: 409 },
        );
      }
      throw error;
    }
  }

  const deviceToken = existingDevice?.deviceToken ?? createDeviceToken();
  const { record, already } = await markAttendance({
    sessionId,
    userId: user.id,
    userIp: clientIp,
    deviceToken,
  });

  const responseBody: ScanResponse = {
    action: already ? "already" : "marked",
    record: serializeRecord(record),
    session: { id: session.id, className: session.className },
    message: already
      ? "This device was already checked in for this session."
      : "Registration complete. You are marked present.",
  };

  return setDevice(NextResponse.json(responseBody), user.id, deviceToken);
}
