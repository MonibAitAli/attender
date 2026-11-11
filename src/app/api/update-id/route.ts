import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markAttendance, serializeRecord } from "@/lib/attendance";
import { readDevice, setDevice } from "@/lib/device";
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
    value?: unknown;
  };

  const sessionId = typeof data.sessionId === "string" ? data.sessionId : "";
  const ticket = typeof data.ticket === "string" ? data.ticket : "";
  const value = typeof data.value === "string" ? data.value.trim() : "";

  if (!sessionId || !ticket) {
    return NextResponse.json(
      { error: "Scan the classroom QR code to continue." },
      { status: 400 },
    );
  }

  const pass = verifyPass(ticket, "update", sessionId);
  if (!pass) {
    return NextResponse.json(
      { error: "This update pass has expired. Scan the classroom code again." },
      { status: 410 },
    );
  }

  if (value.length < 2 || value.length > 40) {
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

  const device = readDevice(request);
  if (!device) {
    return NextResponse.json(
      { error: "This device is not linked to a student record. Scan the code again." },
      { status: 401 },
    );
  }

  if (pass.u && pass.u !== device.userId) {
    return NextResponse.json(
      { error: "This update pass belongs to a different device." },
      { status: 403 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: device.userId } });
  if (!user) {
    return NextResponse.json(
      { error: "Student record not found. Register again from the scan screen." },
      { status: 404 },
    );
  }

  const mode = await getIdentifierMode();
  const field = mode === "CIN" ? "cin" : "studentId";
  const currentValue = field === "cin" ? user.cin : user.studentId;

  let updated = user;

  if (!currentValue) {
    const conflict = await prisma.user.findUnique({
      where: field === "cin" ? { cin: value } : { studentId: value },
    });
    if (conflict && conflict.id !== user.id) {
      return NextResponse.json(
        { error: "That identifier is already used by another student." },
        { status: 409 },
      );
    }

    updated = await prisma.user.update({
      where: { id: user.id },
      data: field === "cin" ? { cin: value } : { studentId: value },
    });
  }

  const { record, already } = await markAttendance({
    sessionId,
    userId: updated.id,
    userIp: clientIp,
    deviceToken: device.deviceToken,
  });

  const responseBody: ScanResponse = {
    action: already ? "already" : "marked",
    record: serializeRecord(record),
    session: { id: session.id, className: session.className },
    message: already
      ? "Your record was updated. This device was already checked in for this session."
      : "Record updated. You are marked present.",
  };

  return setDevice(NextResponse.json(responseBody), updated.id, device.deviceToken);
}
