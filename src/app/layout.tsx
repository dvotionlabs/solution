import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  title: { default: "CG Performance | Coaching with Chris Gkoufas", template: "%s | CG Performance" },
  description: "Individual strength, movement and performance coaching with Chris Gkoufas. In person in London and St Albans, and online.",
  robots: { index: false, follow: false },
  openGraph: { title: "CG Performance", description: "Move better. Build strength. Keep progressing.", images: [{ url: "/force-plate-squat.webp", width: 1600, height: 1067 }] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-GB"><body>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="wrap header-inner">
      <Link href="/" className="brand" aria-label="CG Performance home">cgp<span>●</span><small>CG PERFORMANCE</small></Link>
      <nav aria-label="Main navigation"><Link className="nav-secondary" href="/#approach">The approach</Link><Link className="nav-secondary" href="/#coaching">Coaching</Link><Link className="nav-cta" href="/#contact">Free appointment <span aria-hidden="true">↗</span></Link></nav>
    </div></header>
    <main id="main">{children}</main>
    <footer className="site-footer wrap"><div className="footer-top"><Link href="/" className="footer-brand">cgp<span>.</span></Link><p>Coaching with Chris Gkoufas.<br />London · St Albans · Online</p></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} CG Performance</span><div><Link href="/referrals">Refer a friend</Link><Link href="/direct-debit">Client payments</Link><Link href="/privacy">Privacy</Link><a href="mailto:chrisgkoufas.performance@gmail.com">Get in touch ↗</a></div></div>
    </footer>
  </body></html>;
}
