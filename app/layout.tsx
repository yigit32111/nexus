import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXUS AI 2.0",
  description: "Your Personal Intelligence System",
  applicationName: "NEXUS AI 2.0",
  appleWebApp: { capable: true, title: "NEXUS", statusBarStyle: "black-translucent" },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#080b12", width: "device-width", initialScale: 1, maximumScale: 1 };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="tr"><body>{children}</body></html>;
}