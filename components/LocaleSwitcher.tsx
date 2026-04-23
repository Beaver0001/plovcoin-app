"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./I18nProvider";
import { locales, localeLabels, stripLocale, localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale } = useI18n();
  const pathname = usePathname();
  const bare = stripLocale(pathname);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-xs uppercase tracking-wider",
        className
      )}
    >
      {locales.map((loc, i) => {
        const isActive = loc === locale;
        const href = localePath(loc, bare);
        return (
          <div key={loc} className="flex items-center gap-0.5">
            {i > 0 && <span className="text-rice-dim px-1">|</span>}
            <Link
              href={href}
              className={cn(
                "transition-colors px-1",
                isActive
                  ? "text-fire font-semibold"
                  : "text-rice-soft hover:text-fire"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {localeLabels[loc as Locale]}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
