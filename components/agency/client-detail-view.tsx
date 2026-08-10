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
import {
  syncClientContractServices,
  updateClientProfile,
} from "@/app/actions/clients";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatAddress,
  formatBirthDate,
} from "@/lib/agency/client-fields";
import {
  periodicitySuffix,
  type ContentTypeOption,
} from "@/lib/agency/contract-services";
import { demandStatusLabel } from "@/lib/agency/labels";
import { cn } from "@/lib/utils";
import type { ClientDetail } from "@/types/clients-ui";

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

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
  const [editingProfile, setEditingProfile] = useState(false);
  const [scopeRows, setScopeRows] = useState<ScopeFieldRow[]>(() =>
    buildScopeRows(contentTypes, client.contractServices)
  );
  const [pending, startTransition] = useTransition();
  const [profilePending, startProfileTransition] = useTransition();
  const [birthDate, setBirthDate] = useState(toDateInputValue(client.birthDate));
  const [addressZip, setAddressZip] = useState(client.addressZip ?? "");
  const [addressStreet, setAddressStreet] = useState(client.addressStreet ?? "");
  const [addressNumber, setAddressNumber] = useState(client.addressNumber ?? "");
  const [addressComplement, setAddressComplement] = useState(
    client.addressComplement ?? ""
  );
  const [addressDistrict, setAddressDistrict] = useState(
    client.addressDistrict ?? ""
  );
  const [addressCity, setAddressCity] = useState(client.addressCity ?? "");
  const [addressState, setAddressState] = useState(client.addressState ?? "");
  const [contractDocUrl, setContractDocUrl] = useState(
    client.contractDocUrl ?? ""
  );
  const [studyDocUrl, setStudyDocUrl] = useState(client.studyDocUrl ?? "");

  const addressLabel = formatAddress(client) || "Não informado";
  const birthLabel = formatBirthDate(client.birthDate) || "Não informado";

  function startEdit() {
    setScopeRows(buildScopeRows(contentTypes, client.contractServices));
    setEditing(true);
  }

  function startProfileEdit() {
    setBirthDate(toDateInputValue(client.birthDate));
    setAddressZip(client.addressZip ?? "");
    setAddressStreet(client.addressStreet ?? "");
    setAddressNumber(client.addressNumber ?? "");
    setAddressComplement(client.addressComplement ?? "");
    setAddressDistrict(client.addressDistrict ?? "");
    setAddressCity(client.addressCity ?? "");
    setAddressState(client.addressState ?? "");
    setContractDocUrl(client.contractDocUrl ?? "");
    setStudyDocUrl(client.studyDocUrl ?? "");
    setEditingProfile(true);
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

  function saveProfile() {
    startProfileTransition(async () => {
      const result = await updateClientProfile(client.id, {
        birthDate,
        addressZip,
        addressStreet,
        addressNumber,
        addressComplement,
        addressDistrict,
        addressCity,
        addressState,
        contractDocUrl,
        studyDocUrl,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Dados cadastrais atualizados");
      setEditingProfile(false);
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
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
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
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">Dados cadastrais</CardTitle>
                  <CardDescription>
                    Endereço, aniversário e documentos do Drive
                  </CardDescription>
                </div>
                {canEditContract && !editingProfile ? (
                  <Button type="button" variant="outline" size="sm" onClick={startProfileEdit}>
                    Editar
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                {editingProfile ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="profile-birth">Aniversário</Label>
                      <Input
                        id="profile-birth"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="profile-zip">CEP</Label>
                        <Input
                          id="profile-zip"
                          value={addressZip}
                          onChange={(e) => setAddressZip(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-state">UF</Label>
                        <Input
                          id="profile-state"
                          maxLength={2}
                          value={addressState}
                          onChange={(e) => setAddressState(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-street">Rua</Label>
                      <Input
                        id="profile-street"
                        value={addressStreet}
                        onChange={(e) => setAddressStreet(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="profile-number">Número</Label>
                        <Input
                          id="profile-number"
                          value={addressNumber}
                          onChange={(e) => setAddressNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-complement">Complemento</Label>
                        <Input
                          id="profile-complement"
                          value={addressComplement}
                          onChange={(e) => setAddressComplement(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="profile-district">Bairro</Label>
                        <Input
                          id="profile-district"
                          value={addressDistrict}
                          onChange={(e) => setAddressDistrict(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-city">Cidade</Label>
                        <Input
                          id="profile-city"
                          value={addressCity}
                          onChange={(e) => setAddressCity(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-contract-doc">Link do contrato (Drive)</Label>
                      <Input
                        id="profile-contract-doc"
                        type="url"
                        placeholder="https://drive.google.com/..."
                        value={contractDocUrl}
                        onChange={(e) => setContractDocUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-study-doc">Link do estudo (Drive)</Label>
                      <Input
                        id="profile-study-doc"
                        type="url"
                        placeholder="https://docs.google.com/..."
                        value={studyDocUrl}
                        onChange={(e) => setStudyDocUrl(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        disabled={profilePending}
                        onClick={saveProfile}
                      >
                        {profilePending ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={profilePending}
                        onClick={() => setEditingProfile(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Aniversário</p>
                        <p className="text-sm text-foreground">{birthLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Endereço</p>
                        <p className="text-sm text-foreground">{addressLabel}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Documentos</p>
                      <div className="flex flex-wrap gap-2">
                        {client.contractDocUrl ? (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={client.contractDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Contrato
                              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ) : null}
                        {client.studyDocUrl ? (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={client.studyDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Estudo
                              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ) : null}
                        {!client.contractDocUrl && !client.studyDocUrl ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhum documento cadastrado.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

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
