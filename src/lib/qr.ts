import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_ROTATION_SECONDS = 60;
export const ALLOWED_ROTATION_SECONDS = [0, 10, 60] as const;
export type RotationSeconds = (typeof ALLOWED_ROTATION_SECONDS)[number];

let cachedSecret: string | null = null;

function getSecret(): string {
  if (cachedSecret) return cachedSecret;

  const envSecret = process.env.ATTENDER_SECRET;
  if (envSecret && envSecret.length >= 16) {
    cachedSecret = envSecret;
    return cachedSecret;
  }

  const secretPath = path.join(process.cwd(), ".attender-secret");
  try {
    if (fs.existsSync(secretPath)) {
      const fromFile = fs.readFileSync(secretPath, "utf8").trim();
      if (fromFile.length >= 16) {
        cachedSecret = fromFile;
        return cachedSecret;
      }
    }

    const generated = crypto.randomBytes(48).toString("hex");
    fs.writeFileSync(secretPath, generated, { encoding: "utf8", mode: 0o600 });
    cachedSecret = generated;
    return cachedSecret;
  } catch {
    cachedSecret =
      process.env.ATTENDER_SECRET ?? "attender-local-fallback-secret-please-set";
    return cachedSecret;
  }
}

export function rotationWindowMs(rotationSeconds: number): number {
  return rotationSeconds > 0 ? rotationSeconds * 1000 : 0;
}

export function currentBucket(windowMs: number, now: number = Date.now()): number {
  if (windowMs <= 0) return 0;
  return Math.floor(now / windowMs);
}

export function bucketExpiresAt(windowMs: number, bucket: number): number {
  if (windowMs <= 0) return 0;
  return (bucket + 1) * windowMs;
}

export function makeToken(
  sessionId: string,
  windowMs: number,
  bucket: number,
  secret: string = getSecret(),
): string {
  const material =
    windowMs > 0
      ? `${sessionId}:${windowMs}:${bucket}`
      : `${sessionId}:static`;
  return crypto.createHmac("sha256", secret).update(material).digest("hex");
}

export function signValue(value: string, context: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`${context}:${value}`)
    .digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyToken(
  sessionId: string,
  token: string,
  rotationSeconds: number,
  now: number = Date.now(),
): boolean {
  if (!token || typeof token !== "string") return false;
  const windowMs = rotationWindowMs(rotationSeconds);
  const bucket = currentBucket(windowMs, now);

  if (windowMs <= 0) {
    return safeEqual(makeToken(sessionId, 0, 0), token);
  }

  const candidates = [
    makeToken(sessionId, windowMs, bucket),
    makeToken(sessionId, windowMs, bucket - 1),
  ];
  return candidates.some((candidate) => safeEqual(candidate, token));
}

export function describeCurrentToken(
  sessionId: string,
  rotationSeconds: number,
  now: number = Date.now(),
) {
  const windowMs = rotationWindowMs(rotationSeconds);
  const bucket = currentBucket(windowMs, now);
  const expiresAt = bucketExpiresAt(windowMs, bucket);
  return {
    token: makeToken(sessionId, windowMs, bucket),
    bucket,
    expiresAt,
    msRemaining: windowMs > 0 ? Math.max(0, expiresAt - now) : 0,
    rotationSeconds,
    windowMs,
  };
}

export type PassKind = "register" | "update";

type PassPayload = {
  s: string;
  k: PassKind;
  u?: string;
  e: number;
};

function encodePayload(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodePayload(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function makePass(input: {
  sessionId: string;
  kind: PassKind;
  userId?: string;
  ttlMs?: number;
}): string {
  const payload: PassPayload = {
    s: input.sessionId,
    k: input.kind,
    u: input.userId,
    e: Date.now() + (input.ttlMs ?? 15 * 60 * 1000),
  };
  const encoded = encodePayload(JSON.stringify(payload));
  return `${encoded}.${signValue(encoded, "pass")}`;
}

export function verifyPass(
  ticket: string,
  kind: PassKind,
  sessionId: string,
): PassPayload | null {
  if (!ticket || typeof ticket !== "string") return null;
  const [encoded, signature] = ticket.split(".");
  if (!encoded || !signature) return null;
  if (!safeEqual(signValue(encoded, "pass"), signature)) return null;

  const decoded = decodePayload(encoded);
  if (!decoded) return null;

  try {
    const payload = JSON.parse(decoded) as Partial<PassPayload>;
    if (payload.s !== sessionId || payload.k !== kind) return null;
    if (typeof payload.e !== "number" || payload.e < Date.now()) return null;
    if (payload.u !== undefined && typeof payload.u !== "string") return null;
    return payload as PassPayload;
  } catch {
    return null;
  }
}
