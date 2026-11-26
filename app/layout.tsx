import {Presence} from "../components/Presence";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXUS AI 4.0",
  description: "Your private AI workspace with Gems, Canvas and Real-Time Streaming",
  applicationName: "NEXUS AI 4.0",
  appleWebApp: { capable: true, title: "NEXUS 4.0", statusBarStyle: "black-translucent" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0a0c0f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body><Presence/>{children}</body>
    </html>
  );
}