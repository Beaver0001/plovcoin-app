import type { ReactNode } from "react";
import { ArrowUpRight, ChevronDown, Link2, ArrowDown } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";
import { official } from "@/lib/official-config.mjs";
import { faqStatuses } from "@/lib/faq-status";
import { faqEvidence } from "@/lib/faq";
import { custodyObservation, formatProofTokens, proofEvidence as evidence, proofGroups, proofObservedAt, proofRegister as register, solscan } from "@/lib/proof";

type Copy = ReturnType<typeof getDictionary>["proof"];

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("https://");
  return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="proof-source">
    <span>{children}</span><ArrowUpRight size={16} className="shrink-0" aria-hidden="true" />
  </a>;
}

function Permalink({ id, title, copy }: { id: string; title: string; copy: Copy }) {
  return <a href={`#${id}`} className="proof-permalink" aria-label={`${copy.permalink}: ${title}`}><Link2 size={18} aria-hidden="true" /></a>;
}

function Observation({ copy }: { copy: Copy }) {
  return <p className="mt-3 text-xs leading-relaxed text-rice-soft">{copy.observedLabel}: <time dateTime={evidence.observedAt}>{proofObservedAt}</time></p>;
}

function Details({ copy, title, children }: { copy: Copy; title: string; children: ReactNode }) {
  return <details className="proof-details">
    <summary><ChevronDown size={17} className="proof-chevron" aria-hidden="true" />{copy.details}<span className="sr-only">: {title}</span></summary>
    <div className="proof-detail-body">{children}</div>
  </details>;
}

function Card({ id, title, status, copy, children, className = "" }: { id: string; title: string; status?: string; copy: Copy; children: ReactNode; className?: string }) {
  return <article id={id} aria-labelledby={`${id}-title`} className={`proof-card ${className}`}>
    <div className="flex items-start justify-between gap-3"><div className="min-w-0">
      {status && <p className="mb-2 text-xs leading-relaxed text-gold">{status}</p>}
      <h3 id={`${id}-title`} className="break-words font-display text-xl leading-snug text-rice sm:text-2xl">{title}</h3>
    </div><Permalink id={id} title={title} copy={copy} /></div>
    {children}
  </article>;
}

function Group({ id, index, copy, children }: { id: (typeof proofGroups)[number]; index: number; copy: Copy; children: ReactNode }) {
  const group = copy.groups[id];
  return <section id={id} className="proof-group" aria-labelledby={`${id}-heading`}>
    <div className="mb-7 flex items-start gap-4 sm:gap-5">
      <span className="mt-1 font-mono text-sm text-fire-glow" aria-hidden="true">{String(index).padStart(2, "0")}</span>
      <div className="min-w-0 flex-1"><h2 id={`${id}-heading`} className="break-words font-display text-3xl leading-tight text-rice sm:text-4xl">{group.title}</h2><p className="mt-3 max-w-3xl text-base leading-relaxed text-rice-soft">{group.intro}</p></div>
      <Permalink id={id} title={group.title} copy={copy} />
    </div>{children}
  </section>;
}

function EmptyRegister({ kind, id = kind, copy, children }: { kind: keyof Copy["registries"]; id?: string; copy: Copy; children?: ReactNode }) {
  const state = register.registers.find(item => item.id === kind);
  if (state?.publicationStatus !== "not-published") throw new Error(`Missing renderer for proof register ${kind}`);
  const text = copy.registries[kind];
  return <Card id={id} title={text.title} status={copy.pending} copy={copy}>
    <p className="mt-4 text-base leading-relaxed text-rice">{text.empty}</p><p className="mt-3 text-sm leading-relaxed text-rice-soft">{text.note}</p>{children}
  </Card>;
}

function Address({ value }: { value: string }) {
  return <code className="proof-address">{value}</code>;
}

// Server-rendered evidence: ordinary anchors and native details need no event handlers.
export function ProofHubView({ locale }: { locale: Locale }) {
  const copy = getDictionary(locale).proof;
  const mintUrl = solscan("token", official.mint);
  const account = (address: string) => solscan("account", address);
  const metadataRole = register.roles.find(role => role.vault === evidence.updateAuthority);
  const evidenceLink = (ref: string) => {
    const item = faqEvidence(ref, locale);
    return item.href ? <SourceLink href={item.href}>{item.label}</SourceLink> : <p className="text-sm leading-relaxed text-rice-soft">{item.label}</p>;
  };

  return <>
    <Navbar />
    <main className="proof-page pt-28 pb-20 sm:pt-32">
      <div className="container-narrow">
        <header className="mb-10 sm:mb-14">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-fire-glow">{copy.chapter}</p>
          <h1 className="font-display text-[clamp(3rem,8vw,5.5rem)] leading-none tracking-tight text-rice">Proof<span className="text-fire-gradient">-hub</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-rice-soft sm:text-xl">{copy.intro}</p>
          <p className="mt-4 text-xs text-rice-soft">{copy.copyReviewedLabel}: <time dateTime={evidence.copyReviewedOn}>{evidence.copyReviewedOn}</time></p>
          <div className="mt-7 rounded-2xl border border-fire/20 bg-bg-soft p-5 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-6">
            <div className="min-w-0"><p className="mb-2 text-xs text-rice-soft">{copy.mintLabel} · Solana · SPL</p><Address value={official.mint} /></div>
            <div className="mt-4 shrink-0 sm:mt-0"><SourceLink href={mintUrl}>Mint · Solscan</SourceLink></div>
          </div>
        </header>

        <aside aria-label={copy.statusTitle} className="proof-status-grid">
          {faqStatuses.map(status => <div key={status.id} className="min-w-0">
            <p className="mb-2 font-mono text-xs text-fire-glow">{status[locale]}</p>
            <p className="font-semibold leading-snug text-rice">{(status.teamConfirmedOn || (status.checkedAt && status.sourceUrl)) && status.confirmedText ? status.confirmedText[locale] : copy.statusUnknown}</p>
            {status.checkedAt && status.sourceUrl ? <p className="mt-2 text-xs text-rice-soft"><time dateTime={status.checkedAt}>{status.checkedAt}</time></p> : status.teamConfirmedOn ? <p className="mt-2 text-xs leading-relaxed text-rice-soft">{copy.teamUpdate} · <time dateTime={status.teamConfirmedOn}>{status.teamConfirmedOn}</time></p> : null}
            <div className="mt-3">{status.sourceUrl ? <SourceLink href={status.sourceUrl}>{copy.source}</SourceLink> : evidenceLink(status.evidenceRef)}</div>
          </div>)}
        </aside>

        <nav aria-label={copy.browse} className="my-12 sm:my-16">
          <h2 className="mb-5 font-display text-xl text-rice">{copy.browse}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {proofGroups.map((id, index) => <a key={id} href={`#${id}`} className="proof-nav-link"><span className="font-mono text-xs text-fire-glow" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1">{copy.groups[id].title}</span><ArrowDown size={16} className="shrink-0 text-fire-glow" aria-hidden="true" /></a>)}
          </div>
        </nav>

        <Group id="token" index={1} copy={copy}>
          <div className="proof-grid">
            <Card id="token-supply" title={copy.token.supply} status={copy.snapshot} copy={copy}>
              <p className="mt-5 break-words font-display text-2xl text-rice sm:text-3xl">{formatProofTokens(evidence.supply, locale)}</p>
              <p className="mt-3 text-sm text-rice-soft">{copy.token.decimals}: {evidence.decimals}</p>
              <Observation copy={copy} /><div className="mt-4"><SourceLink href={mintUrl}>Mint · Solscan</SourceLink></div>
              <Details copy={copy} title={copy.token.supply}><p>{copy.snapshotNote}</p><p className="mt-3 font-mono text-xs">{evidence.commitment} · slot {evidence.slot}</p></Details>
            </Card>
            {(["mint", "freeze"] as const).map(kind => {
              const value = kind === "mint" ? evidence.mintAuthority : evidence.freezeAuthority;
              return <Card key={kind} id={`token-${kind}-authority`} title={copy.token[kind]} status={copy.snapshot} copy={copy}>
                <p className="mt-5 font-display text-2xl text-rice">{value === null ? copy.token.revoked : copy.token.retained}</p>
                <p className="mt-3 text-sm leading-relaxed text-rice-soft">{kind === "mint" ? copy.token.mintLimit : copy.token.freezeLimit}</p>
                <Observation copy={copy} /><div className="mt-4"><SourceLink href={mintUrl}>Mint · Solscan</SourceLink></div>
                <Details copy={copy} title={copy.token[kind]}><p>{copy.token.onchainFields}</p><p className="mt-2 font-mono text-xs">{kind}Authority: {value ?? "null"}</p><p className="mt-3 font-mono text-xs">{evidence.commitment} · slot {evidence.slot}</p></Details>
              </Card>;
            })}
            <Card id="token-metadata" title={copy.token.metadata} status={copy.snapshot} copy={copy}>
              <p className="mt-5 font-display text-2xl text-rice">{metadataRole ? copy.funds.roles[metadataRole.id as keyof Copy["funds"]["roles"]] : copy.token.metadata}</p>
              <p className="mt-3 text-sm leading-relaxed text-rice-soft">{copy.token.metadataLimit}</p>
              <Observation copy={copy} /><div className="mt-4"><SourceLink href={account(evidence.metadataAccount)}>{copy.token.metadataAccount} · Solscan</SourceLink></div>
              <Details copy={copy} title={copy.token.metadata}><p>Update authority</p><Address value={evidence.updateAuthority} /><div className="mt-3"><SourceLink href={account(evidence.updateAuthority)}>Update authority · Solscan</SourceLink></div><p className="mt-5">{copy.token.metadataAccount}</p><Address value={evidence.metadataAccount} /><p className="mt-3 font-mono text-xs">{evidence.commitment} · slot {evidence.slot}</p></Details>
            </Card>
          </div>
        </Group>

        <Group id="addresses" index={2} copy={copy}>
          <Card id="treasury-balance" title={copy.funds.balance} status={copy.snapshot} copy={copy} className="mb-5">
            <p className="mt-5 break-words font-display text-2xl text-rice sm:text-4xl">{formatProofTokens(evidence.treasuryBalance, locale)}</p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-rice-soft">{copy.funds.balanceNote}</p>
            <Observation copy={copy} /><div className="mt-4"><SourceLink href={account(evidence.treasuryTokenAccount)}>{copy.funds.tokenAccount} · Solscan</SourceLink></div>
            <Details copy={copy} title={copy.funds.balance}><Address value={evidence.treasuryTokenAccount} /><p className="mt-3 font-mono text-xs">{evidence.commitment} · slot {evidence.slot}</p></Details>
          </Card>
          <div className="proof-grid">
            {register.roles.map(role => {
              const observed = custodyObservation(role.multisig);
              const title = copy.funds.roles[role.id as keyof Copy["funds"]["roles"]];
              const delay = observed.timelockSeconds % 3600 === 0 ? `${observed.timelockSeconds / 3600} ${copy.funds.hours}` : `${observed.timelockSeconds} ${copy.funds.seconds}`;
              return <Card key={role.id} id={`role-${role.id}`} title={title} status={copy.snapshot} copy={copy}>
                <dl className="my-5 flex flex-wrap gap-x-7 gap-y-3 text-sm"><div><dt className="text-xs text-rice-soft">{copy.funds.threshold}</dt><dd className="mt-1 font-mono text-lg text-rice">{observed.threshold} / {observed.memberCount}</dd></div><div><dt className="text-xs text-rice-soft">{copy.funds.timelock}</dt><dd className="mt-1 font-mono text-lg text-rice">{delay}</dd></div></dl>
                <Address value={role.vault} /><Observation copy={copy} />
                <div className="mt-4 flex flex-col items-start gap-2"><SourceLink href={account(role.vault)}>{copy.funds.vault}</SourceLink><SourceLink href={account(role.multisig)}>{copy.funds.multisig}</SourceLink></div>
                <Details copy={copy} title={title}><p>{copy.funds.multisig} · Squads v4</p><Address value={role.multisig} /><p className="mt-4">{copy.funds.custodyNote}</p><p className="mt-3 font-mono text-xs">{evidence.commitment} · slot {evidence.slot}</p></Details>
              </Card>;
            })}
            <EmptyRegister kind="vesting" copy={copy} />
          </div>
          <div className="mt-9">
            <h3 className="font-display text-xl text-rice">{copy.funds.history}</h3><p className="mt-2 text-sm leading-relaxed text-rice-soft">{copy.funds.historyNote}</p>
            <div className="mt-5 space-y-4">
              {register.transactions.map(tx => <Card key={tx.id} id={tx.id} title={copy.funds.transactions[tx.id as keyof Copy["funds"]["transactions"]]} status={copy.historical} copy={copy}>
                {tx.amountRaw && <p className="mt-4 break-words font-mono text-sm text-rice">{copy.funds.amount}: {formatProofTokens(tx.amountRaw, locale)}</p>}
                <p className="mt-3 text-xs text-rice-soft">{tx.executedOn ? <time dateTime={tx.executedOn}>{tx.executedOn}</time> : copy.funds.transactionDate}</p>
                <div className="mt-4"><SourceLink href={solscan("tx", tx.signature)}>{copy.historical} · Solscan</SourceLink></div>
                <Details copy={copy} title={copy.funds.transactions[tx.id as keyof Copy["funds"]["transactions"]]}><Address value={tx.signature} /><p className="mt-4">{copy.snapshotNote}</p></Details>
              </Card>)}
            </div>
          </div>
        </Group>

        <Group id="liquidity" index={3} copy={copy}>
          <EmptyRegister kind="liquidity" id="liquidity-record" copy={copy}><div className="mt-5 space-y-3">{evidenceLink("alpha")}{evidenceLink("launch-announcement")}<SourceLink href={`${localePath(locale, "/faq")}#fees`}>{getDictionary(locale).nav.faq} · {copy.groups.liquidity.title}</SourceLink></div></EmptyRegister>
        </Group>
        <Group id="airdrop" index={4} copy={copy}>
          <EmptyRegister kind="airdrop" id="airdrop-record" copy={copy}><div className="mt-5 space-y-3">{evidenceLink("wave-policy")}{evidenceLink("claim")}</div></EmptyRegister>
        </Group>
        <Group id="security" index={5} copy={copy}>
          <Card id="hacken-review" title={copy.audit.title} status={copy.audit.reportState} copy={copy}>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <a href={official.hacken.projectUrl} target="_blank" rel="noopener noreferrer" className="inline-block shrink-0"><img src={official.hacken.badgeAsset} alt={copy.audit.badgeAlt} width={174} height={64} style={{ width: 174, height: "auto", maxWidth: "100%" }} /></a>
              <p className="text-sm leading-relaxed text-rice">{copy.audit.scopeLine} · <a href={official.hacken.reportUrl} target="_blank" rel="noopener noreferrer" className="text-fire underline">{copy.audit.reportLink}</a></p>
            </div>
            <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-5"><div><dt className="text-sm text-rice-soft">{copy.audit.result}</dt><dd className="mt-2 font-display text-3xl text-rice">{evidence.review.fixed} / {evidence.review.findings}</dd></div><div><dt className="text-sm text-rice-soft">{copy.audit.critical}</dt><dd className="mt-2 font-display text-3xl text-rice">{evidence.review.critical}</dd></div><div><dt className="text-sm text-rice-soft">{copy.audit.high}</dt><dd className="mt-2 font-display text-3xl text-rice">{evidence.review.high}</dd></div></dl>
            <p className="mt-6 text-sm leading-relaxed text-rice"><strong>{copy.audit.scopeLabel}: </strong>{copy.audit.scope}</p>
            <p className="mt-3 text-sm leading-relaxed text-rice-soft"><strong>{copy.audit.exclusionsLabel}: </strong>{copy.audit.exclusions}</p>
            <p className="mt-3 text-sm leading-relaxed text-rice-soft">{copy.audit.version}</p>
            <p className="mt-5 text-xs text-rice-soft">{copy.audit.coverDate}: <time dateTime={evidence.review.coverDate}>{evidence.review.coverDate}</time></p>
            <p className="mt-2 text-xs text-rice-soft">{copy.audit.publishedOn}: <time dateTime={official.hacken.publishedOn}>{official.hacken.publishedOn}</time></p>
            <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:gap-8"><SourceLink href={official.hacken.reportUrl}>{copy.audit.reportLink}</SourceLink><SourceLink href={official.hacken.projectUrl}>{copy.audit.projectLink}</SourceLink></div>
            <Details copy={copy} title={copy.audit.title}><p>{copy.audit.pdfSha}: <code className="break-all">{official.hacken.publicPdfSha256}</code> · {official.hacken.publicPdfBytes.toLocaleString("en-US")} bytes</p><p className="mt-3">{copy.audit.pdfVerified}.</p><p className="mt-3">{copy.audit.pdfDate}: <time dateTime={evidence.review.updatedPdfCreatedOn}>{evidence.review.updatedPdfCreatedOn}</time></p><p className="mt-3">{copy.audit.changelogDate}: <time dateTime={evidence.review.changelogFinalReportDate}>{evidence.review.changelogFinalReportDate}</time></p></Details>
          </Card>
          <div className="my-5"><SourceLink href="#token">{copy.audit.tokenLink}</SourceLink></div>
          <EmptyRegister kind="incidents" copy={copy}><div className="mt-5"><SourceLink href={`mailto:${official.securityEmail}`}>{official.securityEmail}</SourceLink></div></EmptyRegister>
        </Group>
        <Group id="transparency" index={6} copy={copy}>
          <div className="space-y-4"><EmptyRegister kind="transparency" id="monitoring-record" copy={copy} /><EmptyRegister kind="advertising" copy={copy} /><EmptyRegister kind="burn-log" copy={copy} /></div>
        </Group>
        <section id="archive" aria-labelledby="archive-heading" className="proof-group">
          <h2 id="archive-heading" className="mb-5 font-display text-2xl text-rice">{copy.archiveTitle}</h2>
          <Card id="creator-archive" title={copy.creator} status={copy.archived} copy={copy}><p className="my-4 text-sm leading-relaxed text-rice-soft">{copy.archiveNote}</p><Address value={register.archive.creator} /><div className="mt-4"><SourceLink href={account(register.archive.creator)}>{copy.creator} · Solscan</SourceLink></div></Card>
        </section>
        <div className="mt-16 rounded-2xl border border-fire/25 bg-bg-soft p-6 sm:p-8">
          <h2 className="font-display text-2xl text-rice">{copy.verifyTitle}</h2><p className="mt-4 max-w-3xl text-sm leading-relaxed text-rice-soft">{copy.verifyText}</p>
          <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:gap-8"><SourceLink href={localePath(locale, "/faq")}>{copy.readFaq}</SourceLink><SourceLink href={localePath(locale, "/whitepaper")}>{copy.readWhitepaper}</SourceLink></div>
        </div>
      </div>
    </main>
    <Footer />
  </>;
}
