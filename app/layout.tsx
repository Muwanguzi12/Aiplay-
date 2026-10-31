import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Riplay — AI Creative Studio",
  description: "Create music-led videos with Aiplay, the Riplay video generation engine."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
