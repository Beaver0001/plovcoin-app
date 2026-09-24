"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, Copy, Link2, Search, ShieldCheck, X } from "lucide-react";
import { useI18n } from "../I18nProvider";
import { Navbar } from "../Navbar";
import { Footer } from "../Footer";
import { useCopyFeedback } from "../useCopyFeedback";
import { official } from "@/lib/official-config.mjs";
import { localePath } from "@/lib/i18n";
import { faqCategories, faqEvidence, faqQuestions, faqQuickSets, searchFaq, selectedFaq, type FaqQuestion, type FaqSelection } from "@/lib/faq";
import { faqStatuses } from "@/lib/faq-status";
import { faqGlossary } from "@/lib/faq-glossary";
import snapshot from "@/lib/proof-evidence.json";

type ViewState = { selection: FaqSelection; query: string; open: string[] };
const initialView: ViewState = { selection: "first-time", query: "", open: [] };
const knownIds = new Set(faqQuestions.map(question => question.id));

function CopyMint() {
  const { t } = useI18n();
  const { copied, message, copy } = useCopyFeedback(official.mint);
  return <div className="mt-4 min-w-0 rounded-lg border border-fire/20 bg-bg/70 p-3">
    <code className="select-all break-all text-sm text-rice">{official.mint}</code>
    <button type="button" onClick={copy} className="faq-interactive mt-2 flex min-h-11 items-center gap-2 text-sm text-fire-glow" aria-label={`${t.ui.copy}: ${official.mint}`}>
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied ? t.ui.copied : t.ui.copy}
    </button>
    <span role="status" className="block text-sm text-rice-soft">{message}</span>
  </div>;
}

function Evidence({ reference }: { reference: string }) {
  const { locale } = useI18n();
  const evidence = faqEvidence(reference, locale);
  return evidence.href
    ? <a href={evidence.href} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-fire-glow underline-offset-4 hover:underline">
        {evidence.label}<ArrowUpRight size={15} aria-hidden="true" />
      </a>
    : <p className="py-2 text-sm text-rice-soft">{evidence.label}</p>;
}

function Answer({ question, open, toggle }: { question: FaqQuestion; open: boolean; toggle: () => void }) {
  const { locale } = useI18n();
  const answer = question[locale];
  const permalink = `${official.website}${localePath(locale, "/faq")}#${question.id}`;
  const { copied, message, copy } = useCopyFeedback(permalink);
  const id = `answer-title-${question.id}`;
  return <article id={question.id} aria-labelledby={id} tabIndex={-1} className="faq-answer group scroll-mt-24 rounded-2xl border border-fire/20 bg-bg-soft/80 p-4 sm:p-6">
    <div className="flex items-start justify-between gap-2">
      <h3 id={id} className="min-w-0 break-words text-lg font-semibold leading-snug text-rice sm:text-xl">{answer.question}</h3>
      <button type="button" onClick={copy} title={locale === "ru" ? "Скопировать ссылку на ответ" : "Copy answer link"}
        aria-label={`${locale === "ru" ? "Скопировать ссылку" : "Copy link"}: ${answer.question}`}
        className="faq-interactive faq-permalink inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-fire-glow">
        {copied ? <Check size={18} aria-hidden="true" /> : <Link2 size={18} aria-hidden="true" />}
      </button>
    </div>
    <p className="mt-2 break-words text-base leading-relaxed text-rice-soft">{answer.short}</p>
    {question.id === "token-address" && <CopyMint />}
    <Evidence reference={question.evidenceRef} />
    {message && <div role="status" className="mb-2 break-words text-sm text-rice-soft">{message}{!copied && <code className="mt-1 block select-all break-all">{permalink}</code>}</div>}
    {["supply", "freeze"].includes(question.id) && <p className="mb-2 text-sm text-rice-soft">
      {locale === "ru" ? "Снимок сети: " : "On-chain snapshot: "}<time dateTime={snapshot.observedAt}>{snapshot.observedAt.slice(0, 19).replace("T", " ")} UTC</time>
    </p>}
    {answer.details && <details open={open} className="mt-1 border-t border-fire/15 pt-1">
      <summary onClick={event => { event.preventDefault(); toggle(); }} className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-rice">
        <ChevronDown size={16} className={open ? "rotate-180" : ""} aria-hidden="true" />{locale === "ru" ? "Подробнее" : "Details"}
        <span className="sr-only">: {answer.question}</span>
      </summary>
      <p className="pb-2 text-base leading-relaxed text-rice-soft">{answer.details}</p>
    </details>}
  </article>;
}

function StatusSources() {
  const { locale } = useI18n();
  return <aside aria-label={locale === "ru" ? "Источники статуса запуска" : "Launch status sources"} className="mt-7 grid gap-3 border-y border-fire/15 py-4 sm:grid-cols-2">
    {faqStatuses.map(status => {
      const text = status.confirmedText && ((status.checkedAt && status.sourceUrl) || status.teamConfirmedOn)
        ? status.confirmedText[locale] : null;
      return <div key={status.id} className="min-w-0">
      <p className="flex items-center gap-2 text-sm font-semibold text-rice"><span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />{status[locale]}</p>
      <p className="mt-1 text-sm text-rice-soft">{text ?? (locale === "ru" ? "Свежий статус требует подтверждения" : "Current status needs confirmation")}</p>
      {text && status.teamConfirmedOn && !(status.checkedAt && status.sourceUrl) && <p className="mt-1 text-xs text-rice-soft">
        {locale === "ru" ? "По информации команды · " : "Team update · "}<time dateTime={status.teamConfirmedOn}>{status.teamConfirmedOn}</time>
      </p>}
      {text && status.checkedAt && status.sourceUrl
        ? <a href={status.sourceUrl} className="text-sm text-fire-glow underline"><time dateTime={status.checkedAt}>{status.checkedAt}</time></a>
        : <Evidence reference={status.evidenceRef} />}
    </div>;})}
  </aside>;
}

function OfficialSources() {
  const { t, locale } = useI18n();
  const sources = [
    { id: "website", label: locale === "ru" ? "Сайт" : "Website", href: official.website },
    { id: "claim", label: locale === "ru" ? "Портал клейма" : "Claim portal", href: official.claim },
    ...official.channels.map(channel => ({ id: channel.id, label: channel[locale], href: channel.href })),
    { id: "security", label: official.securityEmail, href: `mailto:${official.securityEmail}` },
  ];
  return <section id="official-sources" className="mt-14 scroll-mt-24 rounded-2xl border border-fire/20 bg-bg-soft/60 p-4 sm:p-6">
    <h2 className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck size={22} className="text-fire-glow" aria-hidden="true" />{t.faq.officialSources.title}</h2>
    <p className="mt-3 text-base leading-relaxed text-rice-soft">{t.faq.officialSources.warning}</p>
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">{sources.map(source => <li key={source.id} className="min-w-0">
      <a href={source.href} className="block rounded-lg border border-fire/15 p-3 hover:border-fire/50">
        <span className="text-sm text-fire-glow">{source.label}</span><span className="mt-1 block break-all text-sm text-rice-soft">{source.href.replace(/^mailto:/, "")}</span>
      </a>
    </li>)}</ul>
  </section>;
}

export function FaqView() {
  const { t, locale } = useI18n();
  const [view, setView] = useState<ViewState>(initialView);
  const [hydrated, setHydrated] = useState(false);
  const [revision, setRevision] = useState(0);
  const restore = useRef<{ top?: number; id?: string } | null>(null);
  const searchEditing = useRef(false);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let restoredPopUrl = "";
    const rememberPosition = () => window.history.replaceState({ ...window.history.state, plovFaq: { scrollY: window.scrollY } }, "", window.location.href);
    const restoreLocation = (event?: Event) => {
      // A history traversal can emit both events; restore its saved position once.
      if (event?.type === "hashchange" && restoredPopUrl === window.location.href) {
        restoredPopUrl = "";
        return;
      }
      restoredPopUrl = event?.type === "popstate" ? window.location.href : "";
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("view");
      let selection: FaqSelection = raw === "crypto" || raw === "all" ? raw : "first-time";
      let query = params.get("q") ?? "";
      const open = (params.get("open") ?? "").split(",").filter(id => knownIds.has(id));
      let id = "";
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { /* Malformed hashes do not break the FAQ. */ }
      if (knownIds.has(id)) {
        if (!open.includes(id)) open.push(id);
        if (query && !searchFaq(query).some(result => result.question.id === id)) query = "";
        if (selection !== "all" && !faqQuickSets[selection].includes(id)) selection = "all";
      } else if (id.startsWith("topic-") && faqCategories.some(category => `topic-${category.id}` === id)) {
        selection = "all"; query = "";
      }
      if (query) searchFaq(query).filter(result => result.detailsMatch).forEach(result => { if (!open.includes(result.question.id)) open.push(result.question.id); });
      setView({ selection, query, open });
      const saved = event?.type === "hashchange" ? undefined : window.history.state?.plovFaq?.scrollY;
      restore.current = typeof saved === "number" ? { top: saved } : id ? { id } : null;
      setHydrated(true); setRevision(value => value + 1);
    };
    const rememberLinkPosition = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a[href]")) rememberPosition();
    };
    restoreLocation();
    window.addEventListener("popstate", restoreLocation);
    window.addEventListener("hashchange", restoreLocation);
    window.addEventListener("pagehide", rememberPosition);
    document.addEventListener("click", rememberLinkPosition, true);
    return () => {
      window.removeEventListener("popstate", restoreLocation);
      window.removeEventListener("hashchange", restoreLocation);
      window.removeEventListener("pagehide", rememberPosition);
      document.removeEventListener("click", rememberLinkPosition, true);
    };
  }, []);

  useEffect(() => {
    const target = restore.current;
    if (!hydrated || !target) return;
    restore.current = null;
    const frame = requestAnimationFrame(() => {
      if (target.top !== undefined) window.scrollTo({ top: target.top, behavior: "instant" });
      else if (target.id) document.getElementById(target.id)?.scrollIntoView({ block: "start", behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [hydrated, revision]);

  function navigate(next: ViewState, mode: "push" | "replace", hash = "", jumpToHash = false) {
    const url = new URL(window.location.href);
    window.history.replaceState({ ...window.history.state, plovFaq: { scrollY: window.scrollY } }, "", url);
    next.selection === "first-time" ? url.searchParams.delete("view") : url.searchParams.set("view", next.selection);
    next.query ? url.searchParams.set("q", next.query) : url.searchParams.delete("q");
    next.open.length ? url.searchParams.set("open", next.open.join(",")) : url.searchParams.delete("open");
    url.hash = hash;
    window.history[mode === "push" ? "pushState" : "replaceState"]({ ...window.history.state, plovFaq: { scrollY: window.scrollY } }, "", url);
    setView(next);
    window.dispatchEvent(new Event("plov:faq-navigation"));
    if (hash && jumpToHash) { restore.current = { id: hash }; setRevision(value => value + 1); }
  }

  function updateSearch(query: string) {
    const automatic = searchFaq(query).filter(result => query.trim() && result.detailsMatch).map(result => result.question.id);
    navigate({ ...view, query, open: Array.from(new Set([...view.open, ...automatic])) }, searchEditing.current ? "replace" : "push");
    searchEditing.current = true;
  }

  const results = searchFaq(view.query);
  const questions = !hydrated ? faqQuestions : view.query.trim() ? results.map(result => result.question) : selectedFaq(view.selection);
  const all = !hydrated || (view.selection === "all" && !view.query.trim());
  const labels = locale === "ru"
    ? { first: "Я тут впервые", crypto: "Я в крипте", all: "Все вопросы", search: "Поиск по всем 40 вопросам", hint: "Например: пресейл, газ, не успел", clear: "Очистить поиск", found: "Найдено ответов", empty: "Ничего не найдено. Попробуйте другое слово или откройте все вопросы.", terms: "Термины простыми словами", links: "Официальные ссылки" }
    : { first: "I'm new here", crypto: "I know crypto", all: "All questions", search: "Search all 40 questions", hint: "Try: presale, gas, missed deadline", clear: "Clear search", found: "Answers found", empty: "No answers found. Try another word or browse all questions.", terms: "Terms in plain language", links: "Official links" };
  const renderAnswer = (question: FaqQuestion) => <Answer key={question.id} question={question} open={view.open.includes(question.id)} toggle={() => navigate({ ...view, open: view.open.includes(question.id) ? view.open.filter(id => id !== question.id) : [...view.open, question.id] }, "replace", window.location.hash.slice(1))} />;

  return <>
    <Navbar />
    <main className="faq-page">
      <div className="container-narrow pb-16 pt-10 sm:pt-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-sm uppercase tracking-wider text-fire-glow">{t.faq.badge}</p>
          <a href="#official-sources" onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(view, "push", "official-sources", true); }} className="text-sm text-fire-glow underline underline-offset-4">{labels.links}</a>
        </div>
        <h1 className="mt-4 max-w-3xl break-words font-display text-4xl leading-tight text-fire-gradient sm:text-5xl">{t.faq.title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-rice-soft">{t.faq.intro}</p>
        <div className="faq-interactive mt-7 max-w-3xl" role="search">
          <label htmlFor="faq-search" className="mb-2 block text-sm font-medium text-rice">{labels.search}</label>
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-fire/35 bg-bg-soft px-3 focus-within:border-fire">
            <Search size={20} className="shrink-0 text-fire-glow" aria-hidden="true" />
            <input id="faq-search" ref={searchInput} type="search" autoComplete="off" value={view.query} onChange={event => updateSearch(event.target.value)} onBlur={() => { searchEditing.current = false; }}
              placeholder={labels.hint} className="min-w-0 flex-1 bg-transparent py-4 text-base text-rice placeholder:text-rice-soft" aria-controls="faq-results" />
            {view.query && <button type="button" onClick={() => { navigate({ ...view, query: "" }, "push"); searchInput.current?.focus(); }} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-fire-glow" aria-label={labels.clear}><X size={20} aria-hidden="true" /></button>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2" aria-label={locale === "ru" ? "Подборки вопросов" : "Question collections"}>
            {(["first-time", "crypto", "all"] as const).map(selection => <button key={selection} type="button" aria-pressed={!view.query && view.selection === selection}
              onClick={() => navigate({ ...view, selection, query: "" }, "push")}
              className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium ${!view.query && view.selection === selection ? "border-fire bg-fire text-[#17130F]" : "border border-fire/25 bg-bg-soft text-rice hover:border-fire/60"}`}>
              {selection === "first-time" ? labels.first : selection === "crypto" ? labels.crypto : `${labels.all} · ${faqQuestions.length}`}
            </button>)}
          </div>
        </div>
        <StatusSources />
        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <nav aria-label={locale === "ru" ? "Разделы FAQ" : "FAQ topics"} className="lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold text-rice">{locale === "ru" ? "По темам" : "Browse by topic"}</h2>
            <div className="mt-3 flex flex-wrap gap-2 lg:flex-col">{faqCategories.map(category => <a key={category.id} href={`?view=all#topic-${category.id}`}
              onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate({ ...view, selection: "all", query: "" }, "push", `topic-${category.id}`, true); }}
              className="rounded-lg border border-fire/15 px-3 py-2.5 text-sm text-rice-soft hover:border-fire/50 hover:text-rice">{category[locale]}</a>)}</div>
            <a href="#faq-glossary" onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(view, "push", "faq-glossary", true); }} className="mt-4 inline-block py-2 text-sm text-fire-glow underline underline-offset-4">{labels.terms}</a>
          </nav>
          <section id="faq-results" aria-label={labels.all} className="min-w-0 scroll-mt-24">
            <p role="status" aria-live="polite" className="mb-4 text-sm text-rice-soft">{view.query.trim() ? `${labels.found}: ${questions.length}` : `${locale === "ru" ? "Ответов" : "Answers"}: ${questions.length}`}</p>
            {questions.length === 0 && <div className="rounded-2xl border border-fire/20 p-6"><p className="text-base text-rice-soft">{labels.empty}</p><button type="button" onClick={() => navigate({ selection: "all", query: "", open: view.open }, "push")} className="mt-4 min-h-11 rounded-full bg-fire px-4 text-sm font-semibold text-[#17130F]">{labels.all}</button></div>}
            {all ? faqCategories.map(category => <section key={category.id} id={`topic-${category.id}`} className="mb-10 scroll-mt-24">
              <h2 className="mb-4 text-xl font-semibold text-rice">{category[locale]}</h2><div className="space-y-4">{questions.filter(question => question.category === category.id).map(renderAnswer)}</div>
            </section>) : <div className="space-y-4">{questions.map(renderAnswer)}</div>}
          </section>
        </div>
        <section id="faq-glossary" className="mt-12 scroll-mt-24 border-t border-fire/20 pt-7">
          <h2 className="text-xl font-semibold text-rice">{labels.terms}</h2>
          <div className="mt-4 grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">{faqGlossary.map(item => <details key={item.term} className="rounded-xl border border-fire/20 bg-bg-soft/50 px-4">
            <summary className="cursor-pointer py-3 text-base font-medium text-rice">{item.term}</summary><p className="pb-4 text-base leading-relaxed text-rice-soft">{item[locale]}</p>
          </details>)}</div>
        </section>
        <OfficialSources />
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-fire/20 pt-6">
          <p className="text-base text-rice-soft">{locale === "ru" ? "Остались вопросы? Обсудим в PlovCoin Kitchen." : "More questions? Join the conversation in PlovCoin Kitchen."}</p>
          <div className="flex flex-wrap gap-3"><a href={official.channels.find(channel => channel.id === "community")!.href} className="btn-primary">PlovCoin Kitchen</a><Link href={localePath(locale, "/whitepaper")} className="btn-secondary">Whitepaper</Link></div>
        </div>
      </div>
    </main>
    <Footer />
  </>;
}
