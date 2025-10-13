// src/app/layout.tsx
import type { Metadata } from "next";
import { Lato, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/fontawesome";
import ClientOnlyHeader from "@/components/ClientOnlyHeader";

export const metadata: Metadata = {
  title: "Dr Iftikhar",
  description: "Health records and dashboard",
  // Helps iOS/Chrome-iOS avoid blue overpaint in the status bar/top area
  themeColor: "#ffffff",
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover", // use full safe area on iOS
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  },
  colorScheme: "light",
};

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
});
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${lato.variable} ${geistSans.variable} ${geistMono.variable}`}
    >
      <body
        className="antialiased font-sans bg-white text-slate-900"
        // Extra guard at the shell level (in addition to globals.css)
        style={{
          WebkitTapHighlightColor: "transparent",
          WebkitTextSizeAdjust: "100%",
        }}
      >
        {/* App shell with solid background + overscroll containment */}
        <div
          id="app-shell"
          className="min-h-screen isolate bg-[#f5f7fb]"
          style={{
            // Reduce pull-to-refresh overpaint; iOS respects this on the element
            overscrollBehaviorY: "contain",
          }}
        >
          {/* Global header should render on a solid background; Header.tsx uses bg-white */}
          <ClientOnlyHeader />

          {/* Main content area; keep simple here, individual pages can manage their own containers */}
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
