"use client";

import { useState, useTransition } from "react";
import { MailPlus, RotateCw, UserRoundX, Users } from "lucide-react";
import { toast } from "sonner";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  inviteUser,
  resendInvite,
  revokeInvite,
} from "@/lib/actions/invites.actions";
import { USER_TYPE_LABEL } from "@/lib/agency/labels";
import { cn } from "@/lib/utils";
import type { UserType } from "@prisma/client";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  userType: UserType;
  roleName: string;
  sectorName: string | null;
  status: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  state: "valid" | "accepted" | "expired" | "revoked" | "not_found";
}

export interface TeamOption {
  id: string;
  name: string;
}

const INVITE_STATE_LABEL: Record<TeamInvite["state"], string> = {
  valid: "Aguardando aceite",
  accepted: "Aceito",
  expired: "Expirado",
  revoked: "Revogado",
  not_found: "Desconhecido",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function InviteSheet({
  open,
  onOpenChange,
  roles,
  sectors,
  userTypes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: TeamOption[];
  sectors: TeamOption[];
  userTypes: UserType[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<UserType | "">("");
  const [roleId, setRoleId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setEmail("");
    setUserType("");
    setRoleId("");
    setSectorId("");
  }

  function submit() {
    if (!name.trim() || !email.trim() || !userType || !roleId) {
      toast.error("Preencha nome, e-mail, cargo e função.");
      return;
    }

    startTransition(async () => {
      const result = await inviteUser({
        name,
        email,
        userType: userType as UserType,
        roleId,
        sectorId: sectorId || undefined,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(`Convite enviado para ${email}.`);
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Convidar pessoa</SheetTitle>
          <SheetDescription>
            A conta fica pendente até o convidado definir a própria senha.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Nome completo</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Select
              value={userType}
              onValueChange={(v) => setUserType(v as UserType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                {userTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {USER_TYPE_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Função (permissões)</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Setor</Label>
            <Select value={sectorId} onValueChange={setSectorId}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((sector) => (
                  <SelectItem key={sector.id} value={sector.id}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter>
          <Button className="w-full" disabled={pending} onClick={submit}>
            {pending ? "Enviando..." : "Enviar convite"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function TeamView({
  members,
  invites,
  roles,
  sectors,
  userTypes,
  canInvite,
  canRevoke,
}: {
  members: TeamMember[];
  invites: TeamInvite[];
  roles: TeamOption[];
  sectors: TeamOption[];
  userTypes: UserType[];
  canInvite: boolean;
  canRevoke: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(
    id: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
    successMessage: string
  ) {
    setPendingId(id);
    startTransition(async () => {
      const result = await action();
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível concluir.");
        return;
      }
      toast.success(successMessage);
    });
  }

  const openInvites = invites.filter((i) => i.state !== "accepted");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Equipe
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Pessoas ativas e convites em aberto
          </p>
        </div>
        {canInvite ? (
          <Button onClick={() => setSheetOpen(true)}>
            <MailPlus className="h-4 w-4" />
            Convidar
          </Button>
        ) : null}
      </header>

      <div className="p-6">
        <Tabs defaultValue="membros">
          <TabsList className="mb-4">
            <TabsTrigger value="membros">
              Membros ({members.length})
            </TabsTrigger>
            <TabsTrigger value="convites">
              Convites ({openInvites.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="membros">
            {members.length === 0 ? (
              <EmptyState
                message="Nenhum membro ativo"
                hint="Convide alguém para começar."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Pessoa</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead className="pr-6">Setor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="pl-6">
                          <p className="font-medium text-foreground">
                            {member.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {USER_TYPE_LABEL[member.userType]}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.roleName}
                        </TableCell>
                        <TableCell className="pr-6 text-sm text-muted-foreground">
                          {member.sectorName ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="convites">
            {openInvites.length === 0 ? (
              <EmptyState
                message="Nenhum convite em aberto"
                hint="Todos os convites enviados já foram aceitos."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">E-mail</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Convidado por</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead className="pr-6 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openInvites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="pl-6 font-medium text-foreground">
                          {invite.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-normal",
                              invite.state === "valid" &&
                                "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200",
                              invite.state === "expired" &&
                                "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
                              invite.state === "revoked" &&
                                "border-border bg-muted text-muted-foreground"
                            )}
                          >
                            {INVITE_STATE_LABEL[invite.state]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {invite.invitedByName}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {formatDate(invite.expiresAt)}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-1">
                            {canInvite && invite.state !== "revoked" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={pendingId === invite.id}
                                onClick={() =>
                                  run(
                                    invite.id,
                                    () => resendInvite(invite.id),
                                    "Convite reenviado."
                                  )
                                }
                              >
                                <RotateCw className="h-3.5 w-3.5" />
                                Reenviar
                              </Button>
                            ) : null}
                            {canRevoke && invite.state !== "revoked" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={pendingId === invite.id}
                                onClick={() =>
                                  run(
                                    invite.id,
                                    () => revokeInvite(invite.id),
                                    "Convite revogado."
                                  )
                                }
                              >
                                <UserRoundX className="h-3.5 w-3.5" />
                                Revogar
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <InviteSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        roles={roles}
        sectors={sectors}
        userTypes={userTypes}
      />
    </div>
  );
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 px-6 py-16 text-center">
      <Users className="mb-3 h-8 w-8 text-muted-foreground/60" />
      <p className="text-sm font-medium text-foreground/80">{message}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
