"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Building2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/app/actions/clients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildScopeRows,
  ContractScopeFields,
  scopeRowsToPayload,
  type ScopeFieldRow,
} from "@/components/agency/contract-scope-fields";
import { cn } from "@/lib/utils";
import type { ContentTypeOption } from "@/lib/agency/contract-services";
import type { ClientListItem } from "@/types/clients-ui";

function ClientAvatar({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className="h-10 w-10 rounded-xl object-cover ring-1 ring-border"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-xs font-semibold text-foreground/80 ring-1 ring-border">
      {initials}
    </div>
  );
}

function NewClientSheet({
  open,
  onOpenChange,
  contentTypes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentTypes: ContentTypeOption[];
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "paused">("active");
  const [segment, setSegment] = useState("");
  const [planName, setPlanName] = useState("");
  const [notes, setNotes] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [addressDistrict, setAddressDistrict] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [scopeRows, setScopeRows] = useState<ScopeFieldRow[]>(() =>
    buildScopeRows(contentTypes)
  );
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setStatus("active");
    setSegment("");
    setPlanName("");
    setNotes("");
    setBirthDate("");
    setAddressZip("");
    setAddressStreet("");
    setAddressNumber("");
    setAddressComplement("");
    setAddressDistrict("");
    setAddressCity("");
    setAddressState("");
    setScopeRows(buildScopeRows(contentTypes));
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("O nome do cliente é obrigatório");
      return;
    }

    const services = scopeRowsToPayload(scopeRows);
    if (services.some((s) => Number.isNaN(s.quantity) || s.quantity < 0)) {
      toast.error("Quantidade inválida");
      return;
    }

    startTransition(async () => {
      const result = await createClient({
        name,
        active: status === "active",
        segment,
        planName,
        contractNotes: notes,
        services,
        birthDate,
        addressZip,
        addressStreet,
        addressNumber,
        addressComplement,
        addressDistrict,
        addressCity,
        addressState,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Cliente criado com sucesso");
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <SheetContent className="flex w-full max-h-[90dvh] flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
          <SheetTitle>Novo Cliente</SheetTitle>
          <SheetDescription>
            Cadastre a conta e o escopo inicial do contrato.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="client-name">Nome</Label>
            <Input
              id="client-name"
              placeholder="Ex: Clínica Sorriso"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as "active" | "paused")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-segment">Segmento</Label>
            <Input
              id="client-segment"
              placeholder="Ex: Odontologia"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-sm font-medium text-foreground">
              Dados cadastrais
            </p>
            <div className="space-y-2">
              <Label htmlFor="client-birth">Aniversário</Label>
              <Input
                id="client-birth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-zip">CEP</Label>
                <Input
                  id="client-zip"
                  placeholder="00000-000"
                  value={addressZip}
                  onChange={(e) => setAddressZip(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-state">UF</Label>
                <Input
                  id="client-state"
                  placeholder="CE"
                  maxLength={2}
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-street">Rua</Label>
              <Input
                id="client-street"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-number">Número</Label>
                <Input
                  id="client-number"
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-complement">Complemento</Label>
                <Input
                  id="client-complement"
                  value={addressComplement}
                  onChange={(e) => setAddressComplement(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-district">Bairro</Label>
                <Input
                  id="client-district"
                  value={addressDistrict}
                  onChange={(e) => setAddressDistrict(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-city">Cidade</Label>
                <Input
                  id="client-city"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-plan">Plano contratado</Label>
            <Input
              id="client-plan"
              placeholder="Ex: Plano Essencial"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </div>

          <ContractScopeFields
            contentTypes={contentTypes}
            rows={scopeRows}
            onChange={setScopeRows}
            notes={notes}
            onNotesChange={setNotes}
          />
        </div>

        <SheetFooter className="border-t border-border bg-muted/80 px-6 py-4 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            className="w-full"
            disabled={pending}
            onClick={handleSubmit}
          >
            {pending ? "Salvando..." : "Criar cliente"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function ClientsView({
  clients,
  canCreate,
  contentTypes,
}: {
  clients: ClientListItem[];
  canCreate: boolean;
  contentTypes: ContentTypeOption[];
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Clientes
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Contas ativas e operação alocada
          </p>
        </div>
        {canCreate ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/clientes/quadro/criar">
                <Plus className="h-4 w-4" />
                Criar quadro
              </Link>
            </Button>
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        ) : null}
      </header>

      <div className="p-6">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 px-6 py-16 text-center">
            <Building2 className="mb-3 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground/80">
              Nenhum cliente cadastrado
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canCreate
                ? "Crie o primeiro cliente para começar a operação."
                : "Nenhuma conta atribuída a você até o momento."}
            </p>
            {canCreate ? (
              <Button className="mt-4" onClick={() => setSheetOpen(true)}>
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Demandas em aberto</TableHead>
                  <TableHead>Quadro</TableHead>
                  <TableHead className="pr-6">Equipe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} className="group">
                    <TableCell className="pl-6">
                      <Link
                        href={`/clientes/${client.id}`}
                        className="flex items-center gap-3"
                      >
                        <ClientAvatar
                          name={client.name}
                          logoUrl={client.logoUrl}
                        />
                        <span className="font-medium text-foreground group-hover:text-foreground/80">
                          {client.name}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <span className="tabular-nums text-foreground/80">
                        {client.openDemands}
                      </span>
                    </TableCell>
                    <TableCell>
                      {client.hasBoard ? (
                        <Link
                          href={`/clientes/${client.id}/quadro`}
                          className="text-sm font-medium text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Abrir
                        </Link>
                      ) : canCreate ? (
                        <Link
                          href={`/clientes/quadro/criar?clientId=${client.id}`}
                          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Criar
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-6">
                      {client.team.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Sem membros
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate text-sm text-muted-foreground">
                            {client.team.map((m) => m.name).join(", ")}
                          </span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <NewClientSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        contentTypes={contentTypes}
      />
    </div>
  );
}
