import { SessionProvider } from "next-auth/react";
import { VibeAuthShell } from "@/components/auth/vibe-auth-shell";

/**
 * Rotas de autenticação usam exclusivamente o Vibe Design System.
 * A intranet (agency) continua no design system Samps / Tailwind.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <VibeAuthShell>{children}</VibeAuthShell>
    </SessionProvider>
  );
}
