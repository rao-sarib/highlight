import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_TOKEN_KEY = "highlight-auth-token";
const protectedPrefixes = ["/dashboard", "/projects", "/settings"];
const authPages = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_KEY)?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isAuthPage = authPages.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/settings/:path*", "/login", "/signup"],
};
