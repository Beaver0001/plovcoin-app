import React from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { SwapRecoveryPanel } from "../../components/trading/SwapRecoveryPanel";
import type { RecoverySource } from "../../lib/trading/recovery-panel";

let root: Root | null = null;
export function mount(source: RecoverySource, locale: "ru" | "en" = "ru") {
  let element = document.getElementById("recovery-root");
  if (!element) { element = document.createElement("main"); element.id = "recovery-root"; element.style.padding = "20px"; document.body.append(element); }
  if (!root) root = createRoot(element);
  flushSync(() => root!.render(<React.StrictMode><SwapRecoveryPanel source={source} locale={locale} /></React.StrictMode>));
}
export function unmount() { if (root) { flushSync(() => root!.unmount()); root = null; } }
export function hydrate(source: RecoverySource, html: string, locale: "ru" | "en" = "ru") {
  unmount();
  let element = document.getElementById("recovery-root");
  if (!element) { element = document.createElement("main"); element.id = "recovery-root"; element.style.padding = "20px"; document.body.append(element); }
  element.innerHTML = html;
  root = hydrateRoot(element, <React.StrictMode><SwapRecoveryPanel source={source} locale={locale} /></React.StrictMode>);
}
