import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketPulse",
  description: "A Vercel-ready MVP foundation for a real-time market dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
