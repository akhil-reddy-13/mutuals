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
    // suppressHydrationWarning: browser extensions (Grammarly, password managers) inject attributes into <html>/<body>
    // before React hydrates. This only ignores attribute diffs on these two tags, not on anything inside them.
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <FbShell>{children}</FbShell>
      </body>
    </html>
  );
}
