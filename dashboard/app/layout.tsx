import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fly.AI — Operational Intelligence",
  description: "Internal control plane.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body>{children}</body>
    </html>
  );
}
