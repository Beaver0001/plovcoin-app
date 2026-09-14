"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "./I18nProvider";
import { locales, localeLabels, stripLocale, localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale } = useI18n();
  const pathname = usePathname();
  const bare = stripLocale(pathname);
  const [suffix, setSuffix] = useState("");
  useEffect(() => {
    const update = () => setSuffix(window.location.search + window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    window.addEventListener("plov:faq-navigation", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
      window.removeEventListener("plov:faq-navigation", update);
    };
  }, [pathname]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-xs uppercase tracking-wider",
        className
      )}
    >
      {locales.map((loc, i) => {
        const isActive = loc === locale;
        const href = localePath(loc, bare) + suffix;
        return (
          <div key={loc} className="flex items-center gap-0.5">
            {i > 0 && <span className="text-rice-dim px-1">|</span>}
            <a
              href={href}
              onClick={event => { event.currentTarget.href = localePath(loc, bare) + window.location.search + window.location.hash; }}
              className={cn(
                "transition-colors px-1",
                isActive
                  ? "text-fire font-semibold"
                  : "text-rice-soft hover:text-fire"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {localeLabels[loc as Locale]}
            </a>
          </div>
        );
      })}
    </div>
  );
}
