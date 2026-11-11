import { NextRequest, NextResponse } from "next/server";
import {
  getSettings,
  setIdentifierMode,
  setQrRotation,
  type IdentifierMode,
} from "@/lib/settings";
import { ALLOWED_ROTATION_SECONDS, type RotationSeconds } from "@/lib/qr";

export const dynamic = "force-dynamic";

function serializeSettings(settings: {
  identifierMode: string;
  qrRotationSeconds: number;
}) {
  return {
    identifierMode: settings.identifierMode,
    qrRotationSeconds: settings.qrRotationSeconds,
  };
}

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings: serializeSettings(settings) });
}

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const data = body as {
    identifierMode?: unknown;
    qrRotationSeconds?: unknown;
  };

  const hasMode = data.identifierMode !== undefined;
  const hasRotation = data.qrRotationSeconds !== undefined;

  if (!hasMode && !hasRotation) {
    return NextResponse.json(
      { error: "Nothing to update." },
      { status: 400 },
    );
  }

  if (hasMode && data.identifierMode !== "CIN" && data.identifierMode !== "STUDENT_ID") {
    return NextResponse.json(
      { error: "Identifier mode must be CIN or STUDENT_ID." },
      { status: 400 },
    );
  }

  if (
    hasRotation &&
    !ALLOWED_ROTATION_SECONDS.some((value) => value === data.qrRotationSeconds)
  ) {
    return NextResponse.json(
      { error: "Code rotation must be 10 seconds, 60 seconds, or static." },
      { status: 400 },
    );
  }

  if (hasMode) {
    await setIdentifierMode(data.identifierMode as IdentifierMode);
  }
  if (hasRotation) {
    await setQrRotation(data.qrRotationSeconds as RotationSeconds);
  }

  const settings = await getSettings();
  return NextResponse.json({ settings: serializeSettings(settings) });
}
