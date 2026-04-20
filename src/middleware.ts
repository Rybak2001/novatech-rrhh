import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // Rate limit auth endpoints
    if (pathname.startsWith("/api/auth") && req.method === "POST") {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const { allowed, resetIn } = checkRateLimit(`auth:${ip}`, 10, 60000);

      if (!allowed) {
        return NextResponse.json(
          { error: "Demasiados intentos. Intente de nuevo más tarde." },
          {
            status: 429,
            headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) },
          }
        );
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Allow public pages
        if (
          pathname === "/login" ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/_next") ||
          pathname === "/icon.svg" ||
          pathname === "/favicon.ico"
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icon\\.svg|favicon\\.ico).*)",
  ],
};
