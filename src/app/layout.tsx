import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/fontawesome"; // keep if you previously had this global setup

import ClientOnlyHeader from "@/components/ClientOnlyHeader";

export const metadata: Metadata = {
  title: "Dr Iftikhar",
  description: "Health records and dashboard",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientOnlyHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
