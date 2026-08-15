import type { Metadata } from "next";
import { Overpass, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const overpass = Overpass({
  variable: "--font-overpass",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Case Closed?",
  description:
    "NYC closes almost every 311 complaint. Closed is a status code, not an outcome — we read the city's own closure text to find out what really happened.",
};

import FileTabs from "@/components/FileTabs";
import Seal from "@/components/Seal";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${overpass.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="mx-auto w-full max-w-5xl px-0 pt-6 sm:px-6 print:max-w-none print:p-0">
          <FileTabs />
          <div className="sheet flex min-h-screen flex-col print:border-0 print:shadow-none">
            <div className="flex-1">{children}</div>
            <footer className="flex items-center justify-between gap-4 border-t border-hairline px-6 py-6 print:hidden">
              <p className="max-w-md font-mono text-[11px] leading-relaxed text-ink-3">
                FORM CC-311 · Case Closed? · Built for NYC AI Hackathon, NYPL, Aug 2026 · all
                figures derive from NYC Open Data and carry their query as a receipt
              </p>
              <Seal size={92} className="shrink-0 -rotate-6 opacity-80" />
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
