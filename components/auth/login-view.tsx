"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { resolveLoginRedirect } from "@/app/(auth)/login/actions";
import { SampsLogo } from "@/components/brand/samps-logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Só e-mail — nunca senha. localStorage do dispositivo. */
const REMEMBERED_EMAIL_KEY = "samps.login.rememberedEmail";

function readRememberedEmail(): string | null {
  try {
    const value = localStorage.getItem(REMEMBERED_EMAIL_KEY)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

function writeRememberedEmail(email: string | null) {
  try {
    if (email) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // private mode / blocked storage — ignore
  }
}

export function LoginView({
  callbackUrl,
  defaultEmail,
}: {
  callbackUrl?: string;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultEmail) return;
    const saved = readRememberedEmail();
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, [defaultEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Preencha e-mail e senha para continuar.");
      return;
    }

    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    const result = await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setError(
        "Não foi possível entrar. Verifique o e-mail e a senha, ou confirme se a sua conta está ativa."
      );
      setLoading(false);
      return;
    }

    writeRememberedEmail(remember ? normalizedEmail : null);

    // O destino depende da função e de haver senha pendente de troca, que só
    // são conhecidos no servidor depois que a sessão existe.
    try {
      const destination =
        (await resolveLoginRedirect(callbackUrl)) ?? "/demandas";
      router.replace(destination);
      router.refresh();
    } catch {
      setError("Login ok, mas falhou o redirecionamento. Recarregue a página.");
      setLoading(false);
    }
  }

  const errorId = "login-error";

  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <main className="flex flex-col justify-center border-border bg-background px-6 pb-16 pt-20 md:border-e md:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <SampsLogo withWordmark />

          <div className="mt-8">
            <h1 className="text-balance font-display text-2xl font-semibold tracking-tight text-foreground">
              Entrar
            </h1>
            <p className="mt-2 text-pretty text-sm text-muted-foreground">
              Bem-vindo de volta! Acesse a intranet operacional.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-4"
            aria-busy={loading}
          >
            {error ? (
              <Alert variant="destructive">
                <AlertDescription id={errorId}>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="voce@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
              />
            </div>

            <div className="flex min-h-10 items-center justify-between gap-4">
              <div className="flex min-h-10 items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(value) => {
                    const on = value === true;
                    setRemember(on);
                    if (!on) writeRememberedEmail(null);
                  }}
                />
                <Label htmlFor="remember" className="cursor-pointer font-normal">
                  Lembrar e-mail
                </Label>
              </div>
              <Link
                href="/forgot-password"
                className="inline-flex min-h-10 items-center text-sm text-primary underline-offset-4 hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--primary))] text-primary-foreground hover:opacity-95"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-8 text-pretty text-center text-sm text-muted-foreground">
            Diagnóstico + Planejamento + Método ={" "}
            <span className="font-medium text-brand">Resultado</span>
          </p>
        </div>
      </main>

      <aside
        className="relative hidden overflow-hidden md:flex md:flex-col md:items-center md:justify-center md:px-12"
        aria-hidden="true"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/20 via-background to-primary/20" />
        <div className="pointer-events-none absolute -start-16 top-24 size-64 rounded-full bg-brand/25 blur-3xl" />
        <div className="pointer-events-none absolute -end-10 bottom-16 size-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative z-10 flex max-w-sm flex-col items-center text-center">
          <div className="scale-125">
            <SampsLogo withWordmark />
          </div>
          <p className="mt-8 text-balance font-display text-2xl font-semibold text-foreground">
            Bem-vindo à Samps
          </p>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
            Sua central de operação criativa — demandas, setores, agenda e
            performance em um só lugar, com método e resultado.
          </p>
        </div>
      </aside>
    </div>
  );
}
