import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";


export const metadata: Metadata = {
  metadataBase: new URL("https://plovcoin.com"),
  title: { default: "PlovCoin ($PLOV)", template: "%s" },
  description: "The first universal cultural memecoin on Solana. Fair launch, 45% to community, no presale, no VC.",
  openGraph: {
    type: "website",
    siteName: "PlovCoin",
    images: [{ url: "/og-image-v2.png", width: 1200, height: 630, alt: "PlovCoin ($PLOV)" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@PlovTeam",
    images: ["/og-image-v2.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0806",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([
            { "@context": "https://schema.org", "@type": "Organization", "name": "PlovCoin",
              "url": "https://plovcoin.com", "logo": "https://plovcoin.com/plov-logo.png",
              "sameAs": ["https://x.com/PlovTeam", "https://t.me/PlovCoinAnnouncements"] },
            { "@context": "https://schema.org", "@type": "WebSite", "name": "PlovCoin",
              "url": "https://plovcoin.com", "inLanguage": ["en", "ru"] }
          ]) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="noise-overlay">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
