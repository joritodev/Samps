"use client";

import { useState, useTransition } from "react";
import { PortalStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateBoardSettingsAction,
  updatePortalSettingsAction,
  archiveBoardAction,
} from "@/lib/actions/board.actions";
import { toast } from "sonner";

type BoardSettingsProps = {
  clientId: string;
  boardId: string;
  boardName: string;
  portalId: string;
  portal: {
    displayName: string;
    status: PortalStatus;
    calendarEnabled: boolean;
    completedVisible: boolean;
    upcomingVisible: boolean;
  };
  lists: { id: string; name: string; active: boolean }[];
  externalUsers: { id: string; name: string; email: string }[];
};

export function BoardSettingsForm({
  clientId,
  boardId,
  boardName,
  portalId,
  portal,
  lists,
  externalUsers,
}: BoardSettingsProps) {
  const [pending, startTransition] = useTransition();
  const [portalName, setPortalName] = useState(portal.displayName);
  const [portalStatus, setPortalStatus] = useState(portal.status);
  const [calendarEnabled, setCalendarEnabled] = useState(portal.calendarEnabled);

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">Geral</TabsTrigger>
        <TabsTrigger value="portal">Portal externo</TabsTrigger>
        <TabsTrigger value="lists">Listas</TabsTrigger>
        <TabsTrigger value="access">Acessos</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Geral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Nome do quadro</Label>
              <Input defaultValue={boardName} id="boardName" />
            </div>
            <Button
              disabled={pending}
              onClick={() => {
                const name = (document.getElementById("boardName") as HTMLInputElement).value;
                startTransition(async () => {
                  await updateBoardSettingsAction(boardId, clientId, { name });
                  toast.success("Quadro atualizado");
                });
              }}
            >
              Salvar
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="portal">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Portal externo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Nome exibido</Label>
              <Input value={portalName} onChange={(e) => setPortalName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={portalStatus}
                onChange={(e) => setPortalStatus(e.target.value as PortalStatus)}
              >
                <option value="DRAFT">Rascunho</option>
                <option value="ACTIVE">Ativo</option>
                <option value="SUSPENDED">Suspenso</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Calendário</span>
              <Switch checked={calendarEnabled} onCheckedChange={setCalendarEnabled} />
            </div>
            <Button
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await updatePortalSettingsAction(portalId, clientId, {
                    displayName: portalName,
                    status: portalStatus,
                    calendarEnabled,
                  });
                  toast.success("Portal atualizado");
                });
              }}
            >
              Salvar portal
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="lists">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Listas ativas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lists.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <span>{l.name}</span>
                <Switch defaultChecked={l.active} disabled />
              </div>
            ))}
            <p className="text-xs text-slate-500">Ativação/desativação via wizard na próxima versão.</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="access">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Acessos do cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {externalUsers.length ? (
              externalUsers.map((u) => (
                <div key={u.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                  <span>{u.name}</span>
                  <span className="text-slate-500">{u.email}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Nenhum usuário externo vinculado.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4">
        <h3 className="font-medium text-red-800">Zona de perigo</h3>
        <p className="text-sm text-red-700 mt-1">
          Arquivar o quadro suspende o portal e bloqueia novas demandas. O histórico é preservado.
        </p>
        <Button
          variant="destructive"
          className="mt-3"
          disabled={pending}
          onClick={() => {
            if (!confirm("Arquivar este quadro?")) return;
            startTransition(async () => {
              await archiveBoardAction(boardId, clientId);
              toast.success("Quadro arquivado");
            });
          }}
        >
          Arquivar quadro
        </Button>
      </div>
    </Tabs>
  );
}
