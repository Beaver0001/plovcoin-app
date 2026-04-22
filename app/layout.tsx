import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://plovcoin.com"),
  title: {
    default: "PlovCoin ($PLOV) — The Universal Recipe On-Chain",
    template: "%s | PlovCoin",
  },
  description:
    "PlovCoin is the first universal cultural memecoin on Solana. Billions have tasted it. Now they can own it. Fair launch, 45% to community, no presale, no VC.",
  keywords: [
    "PlovCoin",
    "PLOV",
    "Solana memecoin",
    "fair launch",
    "cultural memecoin",
    "airdrop",
    "Solana",
    "crypto",
  ],
  authors: [{ name: "PlovCoin Team" }],
  creator: "PlovCoin",
  publisher: "PlovCoin",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://plovcoin.com",
    siteName: "PlovCoin",
    title: "PlovCoin ($PLOV) — The Universal Recipe On-Chain",
    description:
      "The first universal cultural memecoin on Solana. Billions have tasted it. Now they can own it.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PlovCoin — The Universal Recipe On-Chain",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PlovCoin ($PLOV) — The Universal Recipe On-Chain",
    description:
      "The first universal cultural memecoin on Solana. Billions have tasted it. Now they can own it.",
    images: ["/og-image.png"],
    creator: "@PlovCoinOfficial",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="noise-overlay">{children}</body>
    </html>
  );
}
