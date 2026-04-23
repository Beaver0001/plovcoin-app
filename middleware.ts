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
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // If user is on a non-default locale path, remember that choice in cookie.
  for (const loc of LOCALES) {
    if (loc === DEFAULT_LOCALE) continue;
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      const response = NextResponse.next();
      response.cookies.set(COOKIE_NAME, loc, {
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        path: "/",
      });
      return response;
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

  // Default locale (English). Set cookie so we don't keep checking.
  // We explicitly do NOT detect browser language — English is always the default
  // for first-time visitors, regardless of browser settings.
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
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
