# Technical Specification: Lightweight Class Attendance & Registration System

## 1. Overview & System Architecture

### 1.1 Purpose
A lightweight, zero-configuration attendance and student registration system designed to run locally on a professor's laptop connected to a local mobile hotspot network. The system eliminates manual data entry while preventing remote/proxy attendance via physical presence validation mechanisms.

### 1.2 Technology Stack
- **Framework**: Next.js (App Router)
- **UI Library**: React, Tailwind CSS, Lucide Icons
- **Database**: SQLite
- **ORM**: Prisma ORM
- **Network Architecture**: Local Host Server (Professor Laptop) + Mobile Hotspot LAN Access

### 1.3 Key Security Mechanisms
1. **Dynamic Rotating QR Codes**: The host dashboard displays a QR code containing a cryptographic token that rotates every 10 seconds.
2. **Local IP & Network Validation**: Student requests are checked against local subnet IP ranges (`req.ip`) to ensure connectivity to the host hotspot.
3. **Persistent Device Tokens**: Devices bind to a single student identity during initial registration via browser cookies/local storage tokens to prevent single-device multi-student scanning.

---

## 2. Database Schema (Prisma + SQLite)

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                String             @id @default(uuid())
  cin               String?            @unique
  studentId         String?            @unique
  fullName          String
  createdAt         DateTime           @default(now())
  attendanceRecords AttendanceRecord[]
}

model Session {
  id                String             @id @default(uuid())
  className         String
  date              DateTime           @default(now())
  hostIp            String
  activeToken       String
  tokenCreatedAt    DateTime           @default(now())
  createdAt         DateTime           @default(now())
  attendanceRecords AttendanceRecord[]
}

model AttendanceRecord {
  id          String   @id @default(uuid())
  sessionId   String
  userId      String
  userIp      String
  deviceToken String
  status      String   @default("PRESENT") // PRESENT | LATE | MANUAL
  timestamp   DateTime @default(now())

  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([sessionId, userId])
}

model SystemSettings {
  id              String   @id @default("global")
  identifierMode  String   @default("CIN") // "CIN" | "STUDENT_ID"
  updatedAt       DateTime @updatedAt
}

3. Core Features & Workflows
3.1 Dynamic Rotating QR Code Generator

    Host View (/host/session/[id]):

        Displays session details and real-time live attendance feed.

        Generates a dynamic token combined with a 10-second timestamp hash: HMAC_SHA256(sessionId + timestamp_bucket, secret).

        Renders the QR code client-side, refreshing the payload automatically every 10 seconds.

3.2 1-Tap Student Attendance Verification

    Student Scan (/scan?token=...&sessionId=...):

        Token Validation: API validates if token matches current or previous (n-1) 10-second hash bucket to account for scan network delay.

        Device Check: Reads existing local device cookie/token.

            Registered Device: Verifies bound user record and automatically marks attendance.

            Unregistered Device: Redirects to First-Time Registration (/register).

        IP Logging: Records client local IPv4/IPv6 address for physical network verification.

3.3 Flexible Identity System (CIN vs. Official Student ID)

    Initial Registration (/register):

        Checks global SystemSettings.identifierMode.

        If CIN: Prompts for Full Name and National ID (CIN).

        If STUDENT_ID: Prompts for Full Name and Official Student ID.

    Dynamic System Switch:

        Host dashboard can toggle identifierMode between CIN and STUDENT_ID.

        When switched to STUDENT_ID, existing users with only a CIN bound are prompted via /update-id to append their official Student ID on their next scan.

3.4 Teacher Dashboard & Live Controls

    Live Feed (/host/dashboard):

        Server-Sent Events (SSE) or short polling to render incoming student scans live.

        Manual toggle actions: Mark Absent, Mark Late, or Delete record.

        Data Export: Single-click download of attendance records as CSV.
