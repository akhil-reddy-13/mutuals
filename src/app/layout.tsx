import type { Metadata, Viewport } from "next";
import "./globals.css";
import FbShell from "@/components/FbShell";

export const metadata: Metadata = {
  title: "Mutuals · Facebook",
  description: "Your Muse handles the tedious parts of social life with other people's Muses.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <FbShell>{children}</FbShell>
      </body>
    </html>
  );
}
