import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AviTrack — Aircraft Utilisation Manager",
  description: "Automate filling and QC of aircraft utilisation records",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
