import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";
import { listActiveContracts } from "@/lib/services/settings.service";

export default async function ContratosSettingsPage() {
  await requireSettingsSection("/configuracoes/contratos");
  const contracts = await listActiveContracts();

  return (
    <div className="flex h-full flex-col bg-card">
      <header className="shrink-0 border-b border-border px-6 py-5">
        <Link
          href="/configuracoes"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Configurações
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Contratos
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Contratos ativos por cliente (somente leitura)
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <ul className="mx-auto max-w-3xl space-y-2">
          {contracts.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clientes/${c.clientId}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.client.name}
                    </p>
                    <Badge variant="secondary">{c.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.planName ?? "Sem plano"}
                    {" · "}
                    {format(c.startDate, "dd/MM/yyyy", { locale: ptBR })}
                    {c.endDate
                      ? ` → ${format(c.endDate, "dd/MM/yyyy", { locale: ptBR })}`
                      : ""}
                    {c.services.length
                      ? ` · ${c.services.length} serviço(s)`
                      : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
          {contracts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum contrato ativo. Crie pelo wizard de quadro do cliente.
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}
