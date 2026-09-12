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

  // The explicit URL owns the locale. Old cookies must not redirect EN links.
  // Always overwrite the internal header; client input is not trusted.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-plov-locale", pathname === "/ru" || pathname.startsWith("/ru/") ? "ru" : "en");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
