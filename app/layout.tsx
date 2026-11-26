import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXUS AI 3.1",
  description: "Your private AI workspace with Gems, Canvas and Real-Time Streaming",
  applicationName: "NEXUS AI 3.1",
  appleWebApp: { capable: true, title: "NEXUS 3.1", statusBarStyle: "black-translucent" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0a0c0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}