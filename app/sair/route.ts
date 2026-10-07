import { signOut } from "@/lib/auth";

/** Encerra a sessão de quem perdeu a conta (desativada/bloqueada) e leva ao login. */
export async function GET() {
  await signOut({ redirectTo: "/login" });
}
