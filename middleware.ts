import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["en", "ru"] as const;
const DEFAULT_LOCALE = "en";
const COOKIE_NAME = "plov_locale";

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

  // Explicit locale override: any path + ?setLocale=en|ru
  // This is the ONLY place the locale cookie is set.
  const setLocale = request.nextUrl.searchParams.get("setLocale");
  if (setLocale && LOCALES.includes(setLocale as (typeof LOCALES)[number])) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("setLocale");
    let rest = pathname;
    for (const loc of LOCALES) {
      if (rest === `/${loc}`) rest = "/";
      else if (rest.startsWith(`/${loc}/`)) rest = rest.slice(loc.length + 1);
    }
    url.pathname =
      setLocale === DEFAULT_LOCALE ? rest : `/${setLocale}${rest === "/" ? "" : rest}`;
    const response = NextResponse.redirect(url);
    response.cookies.set(COOKIE_NAME, setLocale, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secure: true,
    });
    return response;
  }

  // Locale-prefixed paths render as-is.
  for (const loc of LOCALES) {
    if (loc === DEFAULT_LOCALE) continue;
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      return NextResponse.next();
    }
  }

  // User is on a default-locale path (no prefix).
  // If cookie says they previously picked a non-default locale, redirect.
  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value;
  if (
    cookieLocale &&
    cookieLocale !== DEFAULT_LOCALE &&
    LOCALES.includes(cookieLocale as (typeof LOCALES)[number])
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/${cookieLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // Default locale (English), no cookie or cookie=en: render as-is.
  // No cookie is written here: first-time visitors get no cookie at all.
  // English is always the default regardless of browser language.
  return NextResponse.next();
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
