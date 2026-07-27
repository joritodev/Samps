"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { resolveLoginRedirect } from "@/app/(auth)/login/actions";

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
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Preencha e-mail e senha para continuar.");
      return;
    }

    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
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

  return (
    <div className="samps-signin">
      <div className="samps-signin-shell">
        <section className="samps-signin-form">
          <div className="samps-signin-brand">
            <div className="samps-signin-mark" aria-hidden>
              S
            </div>
            <span className="samps-signin-brand-name">SAMPS Digital</span>
          </div>

          <div>
            <h1 className="samps-signin-title">Entrar</h1>
            <p className="samps-signin-subtitle">
              Bem-vindo de volta! Acesse a intranet operacional.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {error ? (
              <div
                className="alert alert-error"
                style={{ marginBottom: "var(--space-4)" }}
              >
                {error}
              </div>
            ) : null}

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="voce@samps.digital"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="samps-signin-row">
              <label className="samps-signin-remember">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Lembrar de mim
              </label>
              <Link href="/forgot-password" className="samps-signin-link">
                Esqueceu a senha?
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="samps-signin-footer">
            Diagnóstico + Planejamento + Método ={" "}
            <span className="samps-signin-accent">Resultado</span>
          </p>
        </section>

        <aside className="samps-signin-visual" aria-hidden>
          <div className="samps-signin-blob samps-signin-blob-1" />
          <div className="samps-signin-blob samps-signin-blob-2" />
          <div className="samps-signin-portal">
            <span className="samps-signin-ring samps-signin-ring-outer" />
            <span className="samps-signin-ring samps-signin-ring-mid" />
            <span className="samps-signin-ring samps-signin-ring-inner" />
            <span className="samps-signin-core" />
          </div>
          <div className="samps-signin-visual-content">
            <h2>Bem-vindo à Samps</h2>
            <p>
              Sua central de operação criativa — demandas, setores, agenda e
              performance em um só lugar, com método e resultado.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
