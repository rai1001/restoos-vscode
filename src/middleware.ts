import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/db/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (static assets)
     * - favicon.ico, icons/, manifest.json (PWA assets)
     * - landing, blog, api/*, robots.txt, sitemap.xml (public routes)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icons/|manifest\\.json|landing|blog|api/|robots\\.txt|sitemap\\.xml|login|callback|auth|error|not-found).*)",
  ],
};
