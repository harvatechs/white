import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WHITE Search — Clean. Minimal. Of the People.",
  description:
    "WHITE Search is the world's cleanest search engine. No ads. No sponsors. No tracking. Powered by Markov chains and the open web. Internet of the people, by the people, for the people.",
  keywords: [
    "white search",
    "clean search engine",
    "no ads search",
    "open source search",
    "markov chain search",
    "minimal search",
    "private search",
  ],
  authors: [{ name: "WHITE Search" }],
  applicationName: "WHITE Search",
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/><circle cx="16" cy="16" r="4" fill="#1a1a1a"/></svg>`
          ),
      },
    ],
  },
  openGraph: {
    title: "WHITE Search",
    description: "The world's cleanest search engine. No ads. No sponsors. Just answers.",
    siteName: "WHITE Search",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "WHITE Search",
    description: "The world's cleanest search engine. No ads. No sponsors. Just answers.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "var(--ws-bg)" }}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
