import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth middleware desativado temporariamente.
 * Login simulado na UI — NextAuth/Supabase na próxima etapa.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|fonts).*)"],
};
