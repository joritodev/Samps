"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { submitFirstAccess } from "@/lib/actions/auth.actions";
import { getDashboardPath } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FirstAccessForm({
  userId,
  defaultName,
  email,
}: {
  userId: string;
  defaultName?: string;
  email?: string;
}) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [name, setName] = useState(defaultName ?? "");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAccepted) {
      setError("Você precisa aceitar os termos de uso.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await submitFirstAccess(userId, {
      name,
      password,
      phone: phone || undefined,
      termsAccepted,
    });

    if (result.error) {
      setLoading(false);
      setError(result.error);
      return;
    }

    // Sem atualizar o token o middleware continuaria devolvendo o usuário
    // para o primeiro acesso.
    const updated = await update({
      refreshed: { name, mustResetPassword: false },
    });
    const userType = updated?.user?.userType ?? session?.user?.userType;
    router.replace(userType ? getDashboardPath(userType) : "/login");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md rounded-2xl shadow-lg border-0">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Primeiro acesso</CardTitle>
        <CardDescription>
          {email
            ? `Confirme seus dados e crie uma senha para ${email}.`
            : "Complete seu cadastro para continuar"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(v) => setTermsAccepted(v === true)}
            />
            <Label htmlFor="terms" className="text-sm font-normal">
              Aceito os termos de uso e política de privacidade
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Concluir cadastro
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
