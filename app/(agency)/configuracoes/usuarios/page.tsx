import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";
import { Button } from "@/components/ui/button";

export default async function UsuariosSettingsPage() {
  await requireSettingsSection("/configuracoes/usuarios");

  return (
    <div className="flex h-full flex-col bg-card">
      <header className="shrink-0 border-b border-border px-6 py-5">
        <Link
          href="/configuracoes"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Configurações
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Usuários
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Contas internas e convites
        </p>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-border bg-muted/20 p-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-sm text-muted-foreground">
            A gestão de usuários, convites e funções da equipe fica em{" "}
            <strong className="text-foreground">Equipe</strong>.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/equipe">
              Abrir Equipe
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
