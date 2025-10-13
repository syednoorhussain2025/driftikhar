import type { Metadata } from "next";
import { Lato, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/fontawesome";
import ClientOnlyHeader from "@/components/ClientOnlyHeader";

export const metadata: Metadata = {
  title: "Dr Iftikhar",
  description: "Health records and dashboard",
  themeColor: "#ffffff",
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  },
  colorScheme: "light",
  // Stop iOS from auto-linking during first paint
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
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
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* 👇 Inline, first-paint style to kill iOS tap highlight BEFORE CSS loads */}
      <head>
        <style
          // Important: keep this tiny and inline so it wins the very first paint
          dangerouslySetInnerHTML={{
            __html: `
              *,*::before,*::after{ -webkit-tap-highlight-color: rgba(0,0,0,0) !important; }
              html,body{ background:#fff; }
            `,
          }}
        />
      </head>

      <body
        className="antialiased font-sans bg-white text-slate-900"
        style={{ WebkitTextSizeAdjust: "100%" }}
      >
        <div
          id="app-shell"
          className="min-h-screen isolate bg-[#f5f7fb]"
          style={{ overscrollBehaviorY: "contain", WebkitUserSelect: "none" }}
        >
          <ClientOnlyHeader />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
