import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/db/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icons/|manifest\\.json|landing|blog|api/|robots\\.txt|sitemap\\.xml|login|callback|auth|error|not-found|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
