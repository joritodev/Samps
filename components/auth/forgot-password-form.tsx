"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      setError("Não foi possível enviar o link. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md rounded-2xl shadow-lg border-0">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Recuperar senha</CardTitle>
        <CardDescription>Enviaremos um link para redefinir sua senha</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <Alert>
            <AlertDescription>
              Se o e-mail existir em nossa base, você receberá instruções em breve.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enviar link
            </Button>
          </form>
        )}
        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900">
            Voltar ao login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
