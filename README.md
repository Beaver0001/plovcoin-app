# PlovCoin Website (Next.js 15)

Official website for PlovCoin ($PLOV) — universal cultural memecoin on Solana.

## Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS 3** (Brand Guide v1.2 palette)
- **Framer Motion** (animations)
- **Lucide React** (icons)
- **Hosting:** Vercel
- **Domain:** plovcoin.com

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build for production

```bash
npm run build
npm run start
```

## Pages

- `/` — Hero + Story + Manifesto + Tokenomics + Roadmap + Security + Community
- `/proof` — Proof-Hub (9 sections per Brand Guide v1.2)
- `/whitepaper` — Whitepaper v7.3 download + ToC
- `/plovdrop` — Airdrop waves overview

## Deployment

This repo auto-deploys to Vercel on every push to `main`.

1. Push to GitHub `Beaver0001/plovcoin-app`
2. Vercel picks up the commit automatically
3. Production URL: `plovcoin.com`

### Initial Vercel setup

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `Beaver0001/plovcoin-app`
3. Framework Preset: **Next.js** (auto-detected)
4. Build Command: `npm run build` (default)
5. Output Directory: `.next` (default)
6. Deploy

### Domain

Settings → Domains → Add `plovcoin.com`. DNS already pointed to Vercel.

## Brand Guide compliance

- ✅ Universal narrative (no regional references)
- ✅ Brand Guide v1.2 palette (Fire/Gold/Rice/Deep Night)
- ✅ Typography: Bagel Fat One + Instrument Serif + Geist + JetBrains Mono
- ✅ Anti-phishing notice on every page
- ✅ Risk disclaimer in footer
- ✅ Audit banner: "review initiated" (not "in progress")
- ✅ No false claims (no fake CertiK/Hacken)

## Security headers

Configured in `next.config.js`:
- HSTS (2 years, includeSubDomains, preload)
- CSP (strict)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## Future

- `claim.plovcoin.com` — claim portal (separate Next.js app, T-7d to TGE)
- Internationalization (en/ru/uz) — post-TGE
- Live on-chain data on Proof-Hub (Solscan API integration)

---

© 2026 PlovCoin. Built with discipline.
