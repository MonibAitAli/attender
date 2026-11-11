import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { safeEqual, signValue } from "./qr";

export const DEVICE_COOKIE = "attender_device";
export const DEVICE_HEADER = "x-attender-device";
const DEVICE_CONTEXT = "device-binding";

export type DeviceIdentity = {
  userId: string;
  deviceToken: string;
};

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function createDeviceToken(): string {
  return crypto.randomUUID();
}

export function signDevice(userId: string, deviceToken: string): string {
  const payload = encode(JSON.stringify({ u: userId, d: deviceToken }));
  const signature = signValue(payload, DEVICE_CONTEXT);
  return `${payload}.${signature}`;
}

export function verifyDevice(raw: string | undefined | null): DeviceIdentity | null {
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = signValue(payload, DEVICE_CONTEXT);
  if (!safeEqual(expected, signature)) return null;

  const decoded = decode(payload);
  if (!decoded) return null;

  try {
    const parsed = JSON.parse(decoded) as { u?: unknown; d?: unknown };
    if (typeof parsed.u !== "string" || typeof parsed.d !== "string") return null;
    return { userId: parsed.u, deviceToken: parsed.d };
  } catch {
    return null;
  }
}

export function readDevice(request: NextRequest): DeviceIdentity | null {
  const cookieValue = request.cookies.get(DEVICE_COOKIE)?.value;
  const headerValue = request.headers.get(DEVICE_HEADER);
  return verifyDevice(cookieValue) ?? verifyDevice(headerValue);
}

export function setDevice(
  response: NextResponse,
  userId: string,
  deviceToken: string,
): NextResponse {
  const value = signDevice(userId, deviceToken);
  response.cookies.set({
    name: DEVICE_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: false,
  });
  response.headers.set(DEVICE_HEADER, value);
  return response;
}
