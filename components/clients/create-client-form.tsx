"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClientAction } from "@/lib/actions/clients.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateClientForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createClientAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle>Dados do cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradeName">Nome fantasia</Label>
              <Input id="tradeName" name="tradeName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName">Razão social</Label>
              <Input id="legalName" name="legalName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="segment">Segmento</Label>
              <Input id="segment" name="segment" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandColor">Cor da marca</Label>
              <Input id="brandColor" name="brandColor" type="color" defaultValue="#0f172a" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="internalNotes">Notas internas</Label>
              <Textarea id="internalNotes" name="internalNotes" rows={3} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar cliente
            </Button>
            <Button variant="outline" asChild>
              <Link href="/clientes">Cancelar</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
