import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import { ToastProvider } from "@/components/Toast";
import { ThemeProvider, ThemeToggle } from "@/components/ThemeProvider";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Tea — Anonymous Gen Z Kettles",
  description:
    "Spill anonymous Gen Z tea in high-energy themed kettles. No profiles, only vibes.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tea",
  },
  openGraph: {
    title: "Tea — Anonymous Gen Z Kettles",
    description: "Spill anonymous Gen Z tea in high-energy themed kettles. No profiles, only vibes.",
    type: "website",
    siteName: "Tea",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tea — Anonymous Gen Z Kettles",
    description: "Spill anonymous Gen Z tea in high-energy themed kettles. No profiles, only vibes.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1c" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/Kettlelogo.png" sizes="any" />
        <link rel="apple-touch-icon" href="/Kettlelogo.png" />
      </head>
      <body
        className={`${archivo.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <ToastProvider>
            <div className="min-h-screen flex flex-col bg-charcoal text-foreground">
              <header className="border-b border-white/10 bg-charcoal/80 backdrop-blur-2xl sticky top-0 z-50">
                <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
                  <Link href="/" className="flex items-center gap-2 group">
                    <img 
                      src="/Kettlelogo.png" 
                      alt="Kettle" 
                      className="h-8 w-8 object-contain group-hover:opacity-80 transition-opacity"
                    />
                    <span className="bg-gradient-to-r from-neon-green to-hot-pink bg-clip-text text-lg font-bold text-transparent">
                      Tea
                    </span>
                  </Link>
                  <nav className="flex items-center gap-4">
                    <Link
                      href="/kettles"
                      className="hidden sm:inline text-xs font-bold text-zinc-400 hover:text-neon-green transition-colors"
                    >
                      Browse Kettles
                    </Link>
                    <Link
                      href="/admin"
                      className="hidden sm:inline text-xs font-bold text-zinc-400 hover:text-hot-pink transition-colors"
                    >
                      Admin
                    </Link>
                    <ThemeToggle />
                    <span className="hidden lg:inline text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Anonymous. Chaotic. Real.
                    </span>
                  </nav>
                </div>
              </header>

              <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
                {children}
              </main>

              <footer className="border-t border-white/5 bg-charcoal/60 backdrop-blur-xl py-4 text-center text-xs font-medium text-zinc-500">
                Built for the ones who always have receipts ☕
              </footer>
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
