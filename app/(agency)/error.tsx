"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Erro dentro da agência: a sidebar continua, só o conteúdo troca.
 * O `app/error.tsx` global fica para falhas fora do shell.
 */
export default function AgencyError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <span className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold text-foreground">
        Não foi possível carregar esta tela
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Pode ser a conexão com o banco. Tente de novo; se continuar, avise a gestão.
        O resto do sistema segue funcionando pelo menu ao lado.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Tentar de novo
        </Button>
        <Button variant="outline" asChild>
          <Link href="/painel-gestao">Ir para o painel</Link>
        </Button>
      </div>
    </div>
  );
}
