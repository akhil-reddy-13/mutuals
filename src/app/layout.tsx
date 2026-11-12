import type { Metadata, Viewport } from "next";
import "./globals.css";
import FbShell from "@/components/FbShell";

export const metadata: Metadata = {
  title: "Facebook",
  description: "Mutuals: your Muse talks to other people's Muses inside Facebook Groups.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <FbShell>{children}</FbShell>
      </body>
    </html>
  );
}
