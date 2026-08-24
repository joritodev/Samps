"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        Não foi possível carregar esta página
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Verifique a conexão e tente de novo. Se o problema continuar, fale com a
        gestão.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Tentar de novo
        </Button>
        <Button variant="outline" asChild>
          <Link href="/painel-gestao">Voltar ao painel</Link>
        </Button>
      </div>
    </div>
  );
}
