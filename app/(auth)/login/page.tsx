"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Preencha e-mail e senha para continuar.");
      return;
    }

    setLoading(true);

    // Simulação temporária — NextAuth na próxima etapa
    const normalized = email.trim().toLowerCase();
    if (normalized === "cliente@teste.com") {
      router.push("/portal/123");
    } else {
      router.push("/demandas");
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
