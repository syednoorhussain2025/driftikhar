// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Lato, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/fontawesome";
import ClientOnlyHeader from "@/components/ClientOnlyHeader";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Dr Iftikhar",
  description: "Health records and dashboard",
  appleWebApp: { capable: true, statusBarStyle: "default" },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      {/* 1) First-paint style: full-viewport mask (white) when html[data-fpmask] is present */}
      <head>
        <style
          // keep minimal so it loads instantly
          dangerouslySetInnerHTML={{
            __html: `
              html[data-fpmask]::before{
                content:"";
                position:fixed; inset:0;
                background:#ffffff;           /* same as header/bg on first paint */
                z-index:2147483647;           /* above everything */
                pointer-events:none;
              }
            `,
          }}
        />
      </head>

      {/* 2) Before-interactive: if iOS/WebKit, set the attribute for the *first* paint */}
      <Script id="fp-mask-on" strategy="beforeInteractive">{`
        (function(){
          var ua = navigator.userAgent || "";
          var isiOS = /iP(ad|hone|od)/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
          if(isiOS){ document.documentElement.setAttribute('data-fpmask',''); }
        })();
      `}</Script>

      <body className="antialiased font-sans bg-white text-slate-900">
        <div
          id="app-shell"
          className="min-h-screen isolate bg-[#f5f7fb]"
          style={{ overscrollBehaviorY: "contain" }}
        >
          <ClientOnlyHeader />
          <main>{children}</main>
        </div>

        {/* 3) After-interactive: remove the mask after two RAFs, clear any selection/focus */}
        <Script id="fp-mask-off" strategy="afterInteractive">{`
          (function(){
            var html = document.documentElement;
            if(!html.hasAttribute('data-fpmask')) return;
            var clearSel = function(){
              try {
                var s = window.getSelection && window.getSelection();
                if(s && s.removeAllRanges) s.removeAllRanges();
                var ae = document.activeElement; if(ae && ae.blur) ae.blur();
              } catch(e){}
            };
            requestAnimationFrame(function(){
              requestAnimationFrame(function(){
                clearSel();
                html.removeAttribute('data-fpmask');
              });
            });
          })();
        `}</Script>
      </body>
    </html>
  );
}
