import React from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { SwapRecoveryPanel } from "../../components/trading/SwapRecoveryPanel";
import type { RecoverySource } from "../../lib/trading/recovery-panel";
import { SwapRecoveryHostPanel, type RecoveryHost } from "../../components/trading/SwapRecoveryHostPanel";
import { SwapEvidenceExport } from "../../components/trading/SwapEvidenceExport";

let root: Root | null = null;
export function mount(source: RecoverySource, locale: "ru" | "en" = "ru") {
  let element = document.getElementById("recovery-root");
  if (!element) { element = document.createElement("main"); element.id = "recovery-root"; element.style.padding = "20px"; document.body.append(element); }
  if (!root) root = createRoot(element);
  flushSync(() => root!.render(<React.StrictMode><SwapRecoveryPanel source={source} locale={locale} /></React.StrictMode>));
}
export function unmount() { if (root) { flushSync(() => root!.unmount()); root = null; } }
export function mountExport(source: RecoverySource, locale: "ru" | "en" = "ru") {
  let element = document.getElementById("recovery-root");
  if (!element) { element = document.createElement("main"); element.id = "recovery-root"; element.style.padding = "20px"; document.body.append(element); }
  if (!root) root = createRoot(element);
  flushSync(() => root!.render(<React.StrictMode><SwapEvidenceExport source={source} locale={locale} /></React.StrictMode>));
}
export function mountHost(host: RecoveryHost, locale: "ru" | "en" = "ru") {
  let element = document.getElementById("recovery-root");
  if (!element) { element = document.createElement("main"); element.id = "recovery-root"; element.style.padding = "20px"; document.body.append(element); }
  if (!root) root = createRoot(element);
  flushSync(() => root!.render(<React.StrictMode><SwapRecoveryHostPanel host={host} locale={locale} /></React.StrictMode>));
}
export function hydrate(source: RecoverySource, html: string, locale: "ru" | "en" = "ru") {
  unmount();
  let element = document.getElementById("recovery-root");
  if (!element) { element = document.createElement("main"); element.id = "recovery-root"; element.style.padding = "20px"; document.body.append(element); }
  element.innerHTML = html;
  root = hydrateRoot(element, <React.StrictMode><SwapRecoveryPanel source={source} locale={locale} /></React.StrictMode>);
}
