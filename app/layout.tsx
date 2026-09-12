import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Bagel_Fat_One, Instrument_Serif, Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { official } from "@/lib/official-config.mjs";

// Fonts are downloaded at build time and served from plovcoin.com.
// No runtime requests to Google Fonts (privacy + performance).
const fontDisplay = Bagel_Fat_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const fontSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});
const fontBody = Geist({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
});
const fontMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
});

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
    site: `@${official.channels.find(channel => channel.id === "x")!.href.split("/").pop()}`,
    images: ["/og-image-v2.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0806",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await headers()).get("x-plov-locale") === "ru" ? "ru" : "en";
  return (
    <html
      lang={locale}
      className={`${fontDisplay.variable} ${fontSerif.variable} ${fontBody.variable} ${fontMono.variable}`}
    >
      <head>
        <noscript><style>{`[style*="opacity:0"], [style*="opacity: 0"] { opacity: 1 !important; transform: none !important; } .faq-interactive { display: none !important; }`}</style></noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([
            { "@context": "https://schema.org", "@type": "Organization", "name": "PlovCoin",
              "url": "https://plovcoin.com", "logo": "https://plovcoin.com/plov-logo.png",
              "sameAs": official.channels.map(channel => channel.href) },
            { "@context": "https://schema.org", "@type": "WebSite", "name": "PlovCoin",
              "url": "https://plovcoin.com", "inLanguage": ["en", "ru"] }
          ]) }}
        />
      </head>
      <body className="noise-overlay">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
