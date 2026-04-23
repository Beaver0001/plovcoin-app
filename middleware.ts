import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["en", "ru"] as const;
const DEFAULT_LOCALE = "en";
const COOKIE_NAME = "plov_locale";

function detectLocaleFromHeader(acceptLanguage: string | null): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  // Parse "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
  const parts = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, qPart] = part.trim().split(";");
      const q = qPart ? parseFloat(qPart.replace("q=", "")) : 1.0;
      return { tag: tag.toLowerCase().split("-")[0], q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parts) {
    if (LOCALES.includes(tag as (typeof LOCALES)[number])) {
      return tag;
    }
  }
  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, API routes, Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // file extensions (favicon, og-image, etc.)
  ) {
    return NextResponse.next();
  }

  // If user is already on a non-default locale path, set cookie and continue
  for (const loc of LOCALES) {
    if (loc === DEFAULT_LOCALE) continue;
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      const response = NextResponse.next();
      response.cookies.set(COOKIE_NAME, loc, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: "lax",
        path: "/",
      });
      return response;
    }
  }

  // User is on the default locale path (no prefix).
  // Check cookie first — if user already picked a non-default locale before, redirect.
  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieLocale && cookieLocale !== DEFAULT_LOCALE && LOCALES.includes(cookieLocale as (typeof LOCALES)[number])) {
    const url = request.nextUrl.clone();
    url.pathname = `/${cookieLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // No cookie — detect from browser language, but only on fresh first visits (no cookie at all).
  if (!cookieLocale) {
    const browserLocale = detectLocaleFromHeader(request.headers.get("accept-language"));
    if (browserLocale !== DEFAULT_LOCALE) {
      const url = request.nextUrl.clone();
      url.pathname = `/${browserLocale}${pathname === "/" ? "" : pathname}`;
      const response = NextResponse.redirect(url);
      response.cookies.set(COOKIE_NAME, browserLocale, {
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        path: "/",
      });
      return response;
    }
  }

  // Default locale, no redirect. Set cookie so we don't re-detect every visit.
  const response = NextResponse.next();
  if (!cookieLocale) {
    response.cookies.set(COOKIE_NAME, DEFAULT_LOCALE, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /_next (internals)
     * - /api (API routes)
     * - static files (anything with a dot)
     */
    "/((?!_next|api|.*\\..*).*)",
  ],
};
