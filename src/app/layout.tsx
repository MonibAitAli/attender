import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Attender — Local attendance desk",
  description:
    "A zero-configuration classroom attendance system for local hotspots. Rotating QR codes, live check-in, and CSV export.",
};

export const viewport: Viewport = {
  themeColor: "#0B1F1A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans text-chalk antialiased">{children}</body>
    </html>
  );
}
