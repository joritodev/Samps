"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  ExternalLink,
  FileText,
  ListTodo,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import { syncClientContractServices } from "@/app/actions/clients";
import {
  buildScopeRows,
  ContractScopeFields,
  scopeRowsToPayload,
  type ScopeFieldRow,
} from "@/components/agency/contract-scope-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  periodicitySuffix,
  type ContentTypeOption,
} from "@/lib/agency/contract-services";
import { demandStatusLabel } from "@/lib/agency/labels";
import { cn } from "@/lib/utils";
import type { ClientDetail } from "@/types/clients-ui";

const tabTriggerClass =
  "rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

export function ClientDetailView({
  client,
  contentTypes,
  canViewAsClient,
  canCreateBoard,
  canEditContract,
}: {
  client: ClientDetail;
  contentTypes: ContentTypeOption[];
  canViewAsClient: boolean;
  canCreateBoard: boolean;
  canEditContract: boolean;
}) {
  const initials = client.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const [editing, setEditing] = useState(false);
  const [scopeRows, setScopeRows] = useState<ScopeFieldRow[]>(() =>
    buildScopeRows(contentTypes, client.contractServices)
  );
  const [pending, startTransition] = useTransition();

  function startEdit() {
    setScopeRows(buildScopeRows(contentTypes, client.contractServices));
    setEditing(true);
  }

  function saveScope() {
    const services = scopeRowsToPayload(scopeRows);
    if (services.some((s) => Number.isNaN(s.quantity) || s.quantity < 0)) {
      toast.error("Quantidade inválida");
      return;
    }
    startTransition(async () => {
      const result = await syncClientContractServices(client.id, {
        planName: client.planName ?? undefined,
        services,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Escopo do contrato atualizado");
      setEditing(false);
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-border bg-card px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-base font-semibold text-foreground/80 ring-1 ring-border">
              {client.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={client.logoUrl}
                  alt=""
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                  {client.name}
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-normal",
                    client.active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
                      : "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200"
                  )}
                >
                  {client.active ? "Ativo" : "Pausado"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {client.segment ? `${client.segment} · ` : ""}
                Cliente desde{" "}
                {new Date(client.createdAt).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {client.hasBoard ? (
              <Button size="sm" asChild>
                <Link href={`/clientes/${client.id}/quadro`}>
                  <LayoutDashboard className="h-4 w-4" />
                  Abrir quadro
                </Link>
              </Button>
            ) : canCreateBoard ? (
              <Button size="sm" asChild>
                <Link href={`/clientes/quadro/criar?clientId=${client.id}`}>
                  <LayoutDashboard className="h-4 w-4" />
                  Criar quadro
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href="/clientes">Voltar à lista</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger value="overview" className={tabTriggerClass}>
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="demands" className={tabTriggerClass}>
              Demandas do Cliente
            </TabsTrigger>
            <TabsTrigger value="contract" className={tabTriggerClass}>
              Contrato/Regras
            </TabsTrigger>
            <TabsTrigger value="portal" className={tabTriggerClass}>
              Portal Externo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Em aberto
                  </CardTitle>
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-foreground">
                    {client.openDemands}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de demandas
                  </CardTitle>
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-foreground">
                    {client.totalDemands}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Publicadas
                  </CardTitle>
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-foreground">
                    {client.publishedDemands}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Equipe alocada</CardTitle>
                <CardDescription>
                  Membros vinculados a esta conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                {client.team.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum membro alocado.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {client.team.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {member.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {member.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demands" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Demandas do Cliente</CardTitle>
                <CardDescription>
                  Espelho das demandas desta conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                {client.demands.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma demanda para este cliente.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {client.demands.map((demand) => (
                      <li
                        key={demand.id}
                        className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {demand.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {demand.sector ?? "Sem setor"}
                            {demand.dueDate
                              ? ` · Prev. ${new Date(demand.dueDate).toLocaleDateString("pt-BR")}`
                              : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 font-normal">
                          {demandStatusLabel(demand.status)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contract" className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Contrato / Regras</CardTitle>
                  </div>
                  <CardDescription className="mt-1.5">
                    {client.planName
                      ? `Plano ${client.planName}`
                      : "Escopo acordado para a operação desta conta"}
                  </CardDescription>
                </div>
                {canEditContract && !editing ? (
                  <Button variant="outline" size="sm" onClick={startEdit}>
                    Editar escopo
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-4">
                    <ContractScopeFields
                      contentTypes={contentTypes}
                      rows={scopeRows}
                      onChange={setScopeRows}
                      showNotes={false}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={pending} onClick={saveScope}>
                        {pending ? "Salvando..." : "Salvar escopo"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={pending}
                        onClick={() => setEditing(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : client.contractServices.length === 0 ? (
                  <div className="space-y-3">
                    <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhum item de contrato cadastrado ainda.
                    </p>
                    {canEditContract ? (
                      <Button variant="outline" size="sm" onClick={startEdit}>
                        Cadastrar escopo
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <ul className="divide-y divide-border rounded-xl border border-border bg-muted/80">
                    {client.contractServices.map((service) => (
                      <li
                        key={service.id}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {service.name}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {service.quantity ?? "—"}
                          {periodicitySuffix(service.periodicity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portal" className="mt-0">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Portal Externo</CardTitle>
                </div>
                <CardDescription>
                  Ambiente white-label entregue ao cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  O portal exibe apenas entregas e calendário — sem atrasos,
                  responsáveis internos ou comentários da operação.
                </p>
                {canViewAsClient && client.hasBoard ? (
                  <Button asChild>
                    <Link href={`/portal/${client.id}`} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                      Visualizar como cliente
                    </Link>
                  </Button>
                ) : !client.hasBoard ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      O portal é criado junto com o quadro interno.
                    </p>
                    {canCreateBoard ? (
                      <Button asChild>
                        <Link href={`/clientes/quadro/criar?clientId=${client.id}`}>
                          Criar quadro e portal
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Você não tem permissão para visualizar o portal como
                    cliente.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
