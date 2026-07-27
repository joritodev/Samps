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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "paused">("active");
  const [segment, setSegment] = useState("");
  const [planName, setPlanName] = useState("");
  const [scope, setScope] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setStatus("active");
    setSegment("");
    setPlanName("");
    setScope("");
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("O nome do cliente é obrigatório");
      return;
    }

    startTransition(async () => {
      const result = await createClient({
        name,
        active: status === "active",
        segment,
        planName,
        contractNotes: scope,
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
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
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

          <div className="space-y-2">
            <Label htmlFor="client-plan">Plano contratado</Label>
            <Input
              id="client-plan"
              placeholder="Ex: Plano Essencial"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-scope">Escopo do contrato</Label>
            <Textarea
              id="client-scope"
              placeholder="Ex: 8 feeds, 12 stories, 2 reels / mês…"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Os itens quantificados do contrato são cadastrados na tela do
              cliente.
            </p>
          </div>
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
}: {
  clients: ClientListItem[];
  canCreate: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6 py-5">
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
          <div className="overflow-hidden rounded-xl border border-border bg-card">
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
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-800"
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

      <NewClientSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
