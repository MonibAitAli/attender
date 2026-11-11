import type { AttendanceRecord, User } from "@prisma/client";
import { prisma } from "./prisma";

export type AttendanceWithUser = AttendanceRecord & { user: User };

export async function markAttendance(input: {
  sessionId: string;
  userId: string;
  userIp: string;
  deviceToken: string;
}): Promise<{ record: AttendanceWithUser; already: boolean }> {
  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      sessionId_userId: { sessionId: input.sessionId, userId: input.userId },
    },
    include: { user: true },
  });

  if (existing) {
    return { record: existing, already: true };
  }

  try {
    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId: input.sessionId,
        userId: input.userId,
        userIp: input.userIp,
        deviceToken: input.deviceToken,
        status: "PRESENT",
      },
      include: { user: true },
    });
    return { record, already: false };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "P2002") {
      const record = await prisma.attendanceRecord.findUnique({
        where: {
          sessionId_userId: { sessionId: input.sessionId, userId: input.userId },
        },
        include: { user: true },
      });
      if (record) return { record, already: true };
    }
    throw error;
  }
}

export function serializeRecord(record: AttendanceWithUser) {
  return {
    id: record.id,
    sessionId: record.sessionId,
    userId: record.userId,
    userIp: record.userIp,
    deviceToken: record.deviceToken,
    status: record.status,
    timestamp: record.timestamp.toISOString(),
    user: {
      id: record.user.id,
      fullName: record.user.fullName,
      cin: record.user.cin,
      studentId: record.user.studentId,
    },
  };
}
