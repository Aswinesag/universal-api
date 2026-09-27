import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Universal AI API Connector & API Hub",
  description:
    "Production-ready multi-provider AI endpoint router, gateway, and schema-enforced API Hub.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>Universal AI API Connector & Hub • Powered by Next.js, Prisma & SQLite</div>
            <div className="flex items-center gap-4">
              <span>OpenAI (GPT-4o)</span>
              <span>•</span>
              <span>Gemini (1.5 Flash/Pro)</span>
              <span>•</span>
              <span>JSON Schema Enforcement</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
