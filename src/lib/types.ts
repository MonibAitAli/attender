export type IdentifierMode = "CIN" | "STUDENT_ID";

export type SessionSummary = {
  id: string;
  className: string;
  date: string;
  hostIp: string;
  createdAt: string;
  count: number;
};

export type AttendanceItem = {
  id: string;
  sessionId: string;
  userId: string;
  userIp: string;
  deviceToken: string;
  status: string;
  timestamp: string;
  user: {
    id: string;
    fullName: string;
    cin: string | null;
    studentId: string | null;
  };
};

export type ScanAction =
  | "marked"
  | "already"
  | "register"
  | "update-id";

export type ScanResponse = {
  action: ScanAction;
  message?: string;
  ticket?: string;
  record?: AttendanceItem;
  session?: { id: string; className: string };
  user?: { fullName: string; missing: IdentifierMode };
};
