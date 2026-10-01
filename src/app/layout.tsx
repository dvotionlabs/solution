import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/source-serif-4/opsz.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solution",
  description: "Find your professional.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="serif text-xl font-semibold tracking-tight">
              Solution
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/" className="hidden text-muted hover:text-foreground sm:inline">
                Find a professional
              </Link>
              <Link href="/pro" className="text-muted hover:text-foreground">
                For professionals
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl px-5 py-6 text-sm text-muted">Solution</div>
        </footer>
      </body>
    </html>
  );
}
