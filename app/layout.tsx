import type { Metadata, Viewport } from "next";
import { Archivo, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav, TopNav } from "@/components/layout/site-nav";
import { ThemeSync, themeBootstrapScript } from "@/components/layout/theme-sync";
import "./globals.css";

/* Display face: an industrial grotesque with enough character to carry the
   wordmark and the large score readouts. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

/* UI face: neutral, sturdy, legible at 12px. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

/* Typing face: chosen for character disambiguation. Telling 1/l/I and 0/O
   apart matters more here than anywhere else in the interface. */
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Klack - typing practice that fixes your weak keys",
    template: "%s - Klack",
  },
  description:
    "Measure your typing speed and accuracy key by key, then practise the exact keys slowing you down. Runs entirely in your browser.",
  applicationName: "Klack",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#131210" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The bootstrap script sets the theme class before React hydrates.
      suppressHydrationWarning
      className={`${bricolage.variable} ${archivo.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Applies the saved theme before anything paints, so there is no flash
            of the wrong colours. `beforeInteractive` puts this in the server HTML
            ahead of every Next.js module. */}
        <Script
          id="klack-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
        <TooltipProvider>
          <ToastProvider>
            <ThemeSync />
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-ink"
            >
              Skip to content
            </a>
            <TopNav />
            <main
              id="main"
              className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-14"
            >
              {children}
            </main>
            <BottomNav />
          </ToastProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
