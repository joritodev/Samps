import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        Página não encontrada
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        O endereço não existe ou você não tem acesso.
      </p>
      <Button asChild>
        <Link href="/painel-gestao">Voltar ao painel</Link>
      </Button>
    </div>
  );
}
