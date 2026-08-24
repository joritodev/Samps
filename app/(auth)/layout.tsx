import { SampsAuthShell } from "@/components/auth/samps-auth-shell";

/**
 * Auth shares the Samps Tailwind tokens (Providers = Session + Theme).
 * SessionProvider lives only inside Providers — do not wrap it again here.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SampsAuthShell>{children}</SampsAuthShell>;
}
