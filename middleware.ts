import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const publicPaths = [
  "/api/health",
  "/api/auth/request-otp",
  "/api/auth/verify-otp",
  "/api/auth/signup",
  "/api/auth/login",
  "/api/public-key",
  "/api/lunar",
  "/api/events",
  "/api/ads",
  "/ads",
  "/challenges",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|css|js)$).*)",
  ],
};