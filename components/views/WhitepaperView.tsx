"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "../I18nProvider";
import { Navbar } from "../Navbar";
import { Footer } from "../Footer";
import { MintAddressBlock } from "../MintAddressBlock";
import { TrustStrip } from "../whitepaper/TrustStrip";
import { TokenomicsPie } from "../whitepaper/TokenomicsPie";
import { LaunchStages } from "../whitepaper/LaunchStages";
import { WavesTimeline } from "../whitepaper/WavesTimeline";
import { LoyaltyTiers } from "../whitepaper/LoyaltyTiers";
import { RiskMatrix } from "../whitepaper/RiskMatrix";
import { MultisigTable } from "../whitepaper/MultisigTable";
import { localePath } from "@/lib/i18n";
import { AlertTriangle, ExternalLink, ArrowRight } from "lucide-react";

const SECTION_IDS = [
  "overview",
  "why",
  "tokenomics",
  "liquidity",
  "airdrops",
  "marketing",
  "governance",
  "risks",
  "roadmap",
  "team",
];

// Sticky TOC with scroll-spy
function TableOfContents() {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState<string>(SECTION_IDS[0]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const wp = t.whitepaper;
  const items = [
    { id: "overview", num: wp.overview.num, title: wp.overview.title },
    { id: "why", num: wp.why.num, title: wp.why.title },
    { id: "tokenomics", num: wp.wpTokenomics.num, title: wp.wpTokenomics.title },
    { id: "liquidity", num: wp.liquidity.num, title: wp.liquidity.title },
    { id: "airdrops", num: wp.airdrops.num, title: wp.airdrops.title },
    { id: "marketing", num: wp.marketing.num, title: wp.marketing.title },
    { id: "governance", num: wp.governance.num, title: wp.governance.title },
    { id: "risks", num: wp.risks.num, title: wp.risks.title },
    { id: "roadmap", num: wp.wpRoadmap.num, title: wp.wpRoadmap.title },
    { id: "team", num: wp.team.num, title: wp.team.title },
  ];

  return (
    <nav className="sticky top-24 hidden lg:block">
      <div className="font-mono text-[10px] uppercase tracking-widest text-fire-glow">
        {wp.toc}
      </div>
      <ul className="mt-4 space-y-1.5">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`flex items-baseline gap-3 rounded-lg px-2 py-1.5 transition-all ${
                  isActive
                    ? "bg-fire/10 text-fire"
                    : "text-rice-dim hover:text-rice"
                }`}
              >
                <span className="font-mono text-[10px] tabular-nums opacity-60">{item.num}</span>
                <span className="text-sm">{item.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Section header shared component
function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="mb-8 flex items-baseline gap-4 border-b border-fire/10 pb-4">
      <span className="font-mono text-sm tabular-nums text-fire-glow">{num}</span>
      <h2 className="font-display text-2xl text-rice sm:text-3xl">{title}</h2>
    </div>
  );
}

export function WhitepaperView() {
  const { t, locale } = useI18n();
  const wp = t.whitepaper;

  return (
    <>
      <Navbar />
      <main>
        <div className="container-narrow pb-20 pt-12 sm:pt-16">
          {/* Hero */}
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-fire/30 bg-fire/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-fire"
            >
              {wp.badge}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 font-display text-5xl text-rice sm:text-6xl"
            >
              <span className="text-fire-gradient glow-text">{wp.title}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-base text-rice-soft sm:text-lg"
            >
              {wp.intro}
            </motion.p>
          </div>

          {/* Trust strip */}
          <div className="mt-12">
            <TrustStrip />
          </div>

          {/* Disclaimer */}
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-fire/20 bg-fire/5 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-fire" />
            <p className="text-xs leading-relaxed text-rice-soft">
              <span className="font-semibold text-fire">{wp.disclaimerBold}</span>{" "}
              {wp.disclaimerText}
            </p>
          </div>

          {/* Main content grid: TOC + body */}
          <div className="mt-16 grid gap-12 lg:grid-cols-[220px_1fr]">
            <TableOfContents />

            <article className="min-w-0 space-y-20">
              {/* 01. Overview */}
              <section id="overview" className="scroll-mt-24">
                <SectionHeader num={wp.overview.num} title={wp.overview.title} />
                <p className="text-base leading-relaxed text-rice-soft">{wp.overview.lead}</p>

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <div className="card-warm !p-5">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-fire-glow">
                      {wp.overview.coreIdeaLabel}
                    </div>
                    <ul className="mt-3 space-y-2">
                      {wp.overview.coreIdea.map((point, i) => (
                        <li key={i} className="flex gap-2 text-sm text-rice-soft">
                          <span className="text-fire">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="card-warm !p-5">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-fire-glow">
                      {wp.overview.paramsLabel}
                    </div>
                    <dl className="mt-3 space-y-2 text-sm">
                      {wp.overview.params.map((p, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-baseline justify-between gap-2 border-b border-fire/10 pb-2 last:border-0"
                        >
                          <dt className="text-rice-dim">{p.label}</dt>
                          <dd className="break-all font-mono text-xs text-rice">{p.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>

                {/* Mint block (compact) */}
                <div className="mt-6">
                  <MintAddressBlock variant="compact" />
                </div>

                <p className="mt-6 text-xs italic leading-relaxed text-rice-dim">
                  {wp.overview.formatNote}
                </p>
              </section>

              {/* 02. Why */}
              <section id="why" className="scroll-mt-24">
                <SectionHeader num={wp.why.num} title={wp.why.title} />
                <ul className="space-y-3">
                  {wp.why.points.map((pt, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-xl border border-fire/10 bg-bg-soft/30 p-4 text-base text-rice-soft"
                    >
                      <span className="font-mono text-xs text-fire">0{i + 1}</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 03. Tokenomics */}
              <section id="tokenomics" className="scroll-mt-24">
                <SectionHeader num={wp.wpTokenomics.num} title={wp.wpTokenomics.title} />
                <p className="mb-8 text-base leading-relaxed text-rice-soft">
                  {wp.wpTokenomics.lead}
                </p>

                <TokenomicsPie />

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="card-warm !p-5">
                    <div className="font-display text-base text-fire">
                      {wp.wpTokenomics.fairLaunchTitle}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-rice-soft">
                      {wp.wpTokenomics.fairLaunchText}
                    </p>
                  </div>
                  <div className="card-warm !p-5">
                    <div className="font-display text-base text-fire">
                      {wp.wpTokenomics.vestingTitle}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-rice-soft">
                      {wp.wpTokenomics.vestingText}
                    </p>
                  </div>
                </div>
              </section>

              {/* 04. Liquidity */}
              <section id="liquidity" className="scroll-mt-24">
                <SectionHeader num={wp.liquidity.num} title={wp.liquidity.title} />

                <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-fire-glow">
                  {wp.liquidity.archTitle}
                </div>
                <LaunchStages />

                <div className="mt-8 card-warm !p-5">
                  <div className="font-display text-base text-fire">
                    {wp.liquidity.protectionTitle}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-rice-soft">
                    {wp.liquidity.protectionText}
                  </p>
                </div>

                <div className="mt-8">
                  <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-fire-glow">
                    {wp.liquidity.metricsTitle}
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-fire/15 bg-bg-soft/40">
                    <table className="w-full text-sm">
                      <thead className="bg-bg-soft">
                        <tr>
                          <th className="p-3 text-left font-mono text-[10px] uppercase tracking-widest text-fire-glow">
                            Metric
                          </th>
                          <th className="p-3 text-left font-mono text-[10px] uppercase tracking-widest text-fire-glow">
                            Target
                          </th>
                          <th className="hidden p-3 text-left font-mono text-[10px] uppercase tracking-widest text-fire-glow sm:table-cell">
                            Source
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {wp.liquidity.metrics.map((m, i) => (
                          <tr
                            key={i}
                            className={`border-t border-fire/10 ${i % 2 === 0 ? "" : "bg-bg/20"}`}
                          >
                            <td className="p-3 text-rice">{m.metric}</td>
                            <td className="p-3 font-mono text-fire">{m.target}</td>
                            <td className="hidden p-3 text-rice-dim sm:table-cell">{m.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="mt-6 rounded-lg border border-fire/10 bg-bg-soft/30 p-4 text-sm italic leading-relaxed text-rice-dim">
                  {wp.liquidity.cexNote}
                </p>
              </section>

              {/* 05. Airdrops */}
              <section id="airdrops" className="scroll-mt-24">
                <SectionHeader num={wp.airdrops.num} title={wp.airdrops.title} />
                <p className="mb-8 text-base leading-relaxed text-rice-soft">{wp.airdrops.lead}</p>

                <WavesTimeline />

                <div className="mt-6 card-warm !p-5">
                  <div className="font-display text-base text-fire">
                    {wp.airdrops.antiSybilTitle}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-rice-soft">
                    {wp.airdrops.antiSybilText}
                  </p>
                </div>

                <div className="mt-10">
                  <div className="mb-4 font-display text-lg text-rice">
                    {wp.airdrops.loyaltyTitle}
                  </div>
                  <LoyaltyTiers />
                  <p className="mt-4 rounded-lg border border-fire/10 bg-bg-soft/30 p-4 text-sm italic leading-relaxed text-rice-dim">
                    {wp.airdrops.loyaltyNote}
                  </p>
                </div>
              </section>

              {/* 06. Marketing */}
              <section id="marketing" className="scroll-mt-24">
                <SectionHeader num={wp.marketing.num} title={wp.marketing.title} />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="card-warm !p-5">
                    <div className="font-display text-base text-fire">
                      {wp.marketing.armyTitle}
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {wp.marketing.armyChannels.map((c, i) => (
                        <li key={i} className="flex gap-2 text-sm text-rice-soft">
                          <span className="text-fire">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="card-warm !p-5">
                    <div className="font-display text-base text-fire">
                      {wp.marketing.challengeTitle}
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {wp.marketing.challengePoints.map((p, i) => (
                        <li key={i} className="flex gap-2 text-sm text-rice-soft">
                          <span className="text-fire">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 card-warm !p-5">
                  <div className="font-display text-base text-fire">{wp.marketing.kolTitle}</div>
                  <p className="mt-2 text-sm leading-relaxed text-rice-soft">
                    {wp.marketing.kolText}
                  </p>
                </div>

                <div className="mt-6 card-warm !p-5">
                  <div className="font-display text-base text-fire">{wp.marketing.labTitle}</div>
                  <ul className="mt-3 space-y-1.5">
                    {wp.marketing.labPoints.map((p, i) => (
                      <li key={i} className="flex gap-2 text-sm text-rice-soft">
                        <span className="text-fire">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* 07. Governance */}
              <section id="governance" className="scroll-mt-24">
                <SectionHeader num={wp.governance.num} title={wp.governance.title} />

                <div className="mb-8 card-warm !p-5">
                  <div className="font-display text-base text-fire">
                    {wp.governance.transitionalTitle}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-rice-soft">
                    {wp.governance.transitionalText}
                  </p>
                </div>

                <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-fire-glow">
                  {wp.governance.multisigTitle}
                </div>
                <MultisigTable />

                <div className="mt-8 card-warm !p-5">
                  <div className="font-display text-base text-fire">
                    {wp.governance.transparencyTitle}
                  </div>
                  <ul className="mt-3 space-y-2">
                    {wp.governance.transparencyPoints.map((p, i) => (
                      <li key={i} className="flex gap-2 text-sm leading-relaxed text-rice-soft">
                        <span className="text-fire">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* 08. Risks */}
              <section id="risks" className="scroll-mt-24">
                <SectionHeader num={wp.risks.num} title={wp.risks.title} />
                <RiskMatrix />

                <div className="mt-6 card-warm !p-5">
                  <div className="font-display text-base text-fire">{wp.risks.deskTitle}</div>
                  <p className="mt-2 text-sm leading-relaxed text-rice-soft">
                    {wp.risks.deskText}
                  </p>
                </div>
              </section>

              {/* 09. Roadmap */}
              <section id="roadmap" className="scroll-mt-24">
                <SectionHeader num={wp.wpRoadmap.num} title={wp.wpRoadmap.title} />

                <div className="space-y-3">
                  {wp.wpRoadmap.rows.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.08 }}
                      className="grid gap-3 rounded-xl border border-fire/15 bg-bg-soft/40 p-4 md:grid-cols-[130px_1fr]"
                    >
                      <div className="font-mono text-sm font-semibold text-fire">{r.period}</div>
                      <div className="text-sm leading-relaxed text-rice-soft">{r.goals}</div>
                    </motion.div>
                  ))}
                </div>

                <p className="mt-6 rounded-lg border border-fire/10 bg-bg-soft/30 p-4 text-sm italic leading-relaxed text-rice-dim">
                  {wp.wpRoadmap.note}
                </p>
              </section>

              {/* 10. Team */}
              <section id="team" className="scroll-mt-24">
                <SectionHeader num={wp.team.num} title={wp.team.title} />

                <div className="grid gap-3 sm:grid-cols-2">
                  {wp.team.members.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="flex gap-3 rounded-xl border border-fire/15 bg-bg-soft/40 p-4"
                    >
                      <div className="text-3xl leading-none">{m.emoji}</div>
                      <div>
                        <div className="font-display text-base text-rice">{m.name}</div>
                        <div className="mt-0.5 text-xs text-rice-dim">{m.role}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 card-warm !p-5">
                  <div className="font-display text-base text-fire">
                    {wp.team.contactsTitle}
                  </div>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {wp.team.contacts.map((c, i) => (
                      <li key={i} className="flex justify-between gap-3 text-sm">
                        <span className="text-rice-dim">{c.label}</span>
                        <a
                          href={c.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate font-mono text-xs text-fire hover:underline"
                        >
                          {c.value}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Quick FAQ (4 items) with link to /faq */}
              <section className="mt-20 border-t border-fire/10 pt-12">
                <div className="mb-6 flex items-baseline justify-between gap-4">
                  <h2 className="font-display text-2xl text-rice">Quick answers</h2>
                  <Link
                    href={localePath(locale, "/faq")}
                    className="group inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-fire hover:underline"
                  >
                    See all FAQ
                    <ArrowRight
                      size={12}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </div>

                <div className="space-y-3">
                  {(() => {
                    // pick 4 most common from first FAQ category
                    const quickQs = [
                      { q: t.faq.categories[1].items[1].q, a: t.faq.categories[1].items[1].a },
                      { q: t.faq.categories[1].items[2].q, a: t.faq.categories[1].items[2].a },
                      { q: t.faq.categories[2].items[2].q, a: t.faq.categories[2].items[2].a },
                      { q: t.faq.categories[2].items[0].q, a: t.faq.categories[2].items[0].a },
                    ];
                    return quickQs.map((item, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-fire/15 bg-bg-soft/40 p-4"
                      >
                        <div className="font-display text-sm text-rice">{item.q}</div>
                        <p className="mt-2 text-sm leading-relaxed text-rice-soft">{item.a}</p>
                      </div>
                    ));
                  })()}
                </div>
              </section>
            </article>
          </div>

          {/* Footer tagline */}
          <div className="mt-20 border-t border-fire/10 pt-8 text-center">
            <p className="font-display text-lg italic text-fire-gradient glow-text">
              {wp.footerTagline}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
