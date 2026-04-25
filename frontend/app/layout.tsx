import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "野心家",
  description: "更产品化的成长策略面板",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(120,10,10,0.16),transparent_22%),radial-gradient(circle_at_top_right,rgba(90,10,10,0.12),transparent_18%),linear-gradient(180deg,#020202_0%,#030303_45%,#080202_100%)] text-white">
        {children}
      </body>
    </html>
  );
}
