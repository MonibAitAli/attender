import { prisma } from "./prisma";
import { DEFAULT_ROTATION_SECONDS, type RotationSeconds } from "./qr";

export type IdentifierMode = "CIN" | "STUDENT_ID";

export async function getSettings() {
  return prisma.systemSettings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      identifierMode: "CIN",
      qrRotationSeconds: DEFAULT_ROTATION_SECONDS,
    },
  });
}

export async function getIdentifierMode(): Promise<IdentifierMode> {
  const settings = await getSettings();
  return settings.identifierMode === "STUDENT_ID" ? "STUDENT_ID" : "CIN";
}

export async function setIdentifierMode(mode: IdentifierMode) {
  return prisma.systemSettings.upsert({
    where: { id: "global" },
    update: { identifierMode: mode },
    create: { id: "global", identifierMode: mode },
  });
}

export async function setQrRotation(seconds: RotationSeconds) {
  return prisma.systemSettings.upsert({
    where: { id: "global" },
    update: { qrRotationSeconds: seconds },
    create: { id: "global", identifierMode: "CIN", qrRotationSeconds: seconds },
  });
}
