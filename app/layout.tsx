import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NFC Review Card",
  description: "Kartu NFC & QR Code untuk Google Review bisnis Anda.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-paper font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
