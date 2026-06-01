import type { Metadata } from "next";
import "./globals.css"; // 💡 이 부분이 핵심입니다! Tailwind CSS를 불러옵니다.

export const metadata: Metadata = {
  title: "Smart Farm Control Center",
  description: "Dashboard for Smart Farm",
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