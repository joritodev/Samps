"use client";

import { useMemo, useState, useTransition } from "react";
import type { PortalStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  archiveBoardAction,
  archiveBoardListAction,
  createBoardListAction,
  renameBoardListAction,
  reorderBoardListsAction,
  unarchiveBoardListAction,
  updateBoardSettingsAction,
  updatePortalSettingsAction,
} from "@/lib/actions/board.actions";
import { toast } from "sonner";

type ListRow = { id: string; name: string; active: boolean };

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
  lists: ListRow[];
  externalUsers: { id: string; name: string; email: string }[];
  canManageLists: boolean;
  canEditBoard: boolean;
};

export function BoardSettingsForm({
  clientId,
  boardId,
  boardName,
  portalId,
  portal,
  lists: initialLists,
  externalUsers,
  canManageLists,
  canEditBoard,
}: BoardSettingsProps) {
  const [pending, startTransition] = useTransition();
  const [portalName, setPortalName] = useState(portal.displayName);
  const [portalStatus, setPortalStatus] = useState(portal.status);
  const [calendarEnabled, setCalendarEnabled] = useState(portal.calendarEnabled);
  const [lists, setLists] = useState(initialLists);
  const [newListName, setNewListName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const orderedIds = useMemo(() => lists.map((l) => l.id), [lists]);

  function moveList(id: string, direction: -1 | 1) {
    const index = lists.findIndex((l) => l.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= lists.length) return;
    const previous = lists;
    const next = [...lists];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    setLists(next);
    startTransition(async () => {
      const result = await reorderBoardListsAction(
        boardId,
        clientId,
        next.map((l) => l.id)
      );
      if (result.error) {
        setLists(previous);
        toast.error(result.error);
        return;
      }
      toast.success("Ordem atualizada");
    });
  }

  return (
    <Tabs defaultValue={canManageLists ? "lists" : "general"}>
      <TabsList>
        {canEditBoard ? <TabsTrigger value="general">Geral</TabsTrigger> : null}
        {canEditBoard ? (
          <TabsTrigger value="portal">Portal externo</TabsTrigger>
        ) : null}
        {canManageLists ? <TabsTrigger value="lists">Listas</TabsTrigger> : null}
        {canEditBoard ? <TabsTrigger value="access">Acessos</TabsTrigger> : null}
      </TabsList>

      {canEditBoard ? (
        <TabsContent value="general">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Geral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do quadro</Label>
                <Input defaultValue={boardName} id="board-name" />
              </div>
              <Button
                disabled={pending}
                onClick={() => {
                  const name = (
                    document.getElementById("board-name") as HTMLInputElement
                  )?.value;
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
      ) : null}

      {canEditBoard ? (
        <TabsContent value="portal">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Portal externo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome exibido</Label>
                <Input
                  value={portalName}
                  onChange={(e) => setPortalName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={portalStatus}
                  onChange={(e) =>
                    setPortalStatus(e.target.value as PortalStatus)
                  }
                >
                  <option value="DRAFT">Rascunho</option>
                  <option value="ACTIVE">Ativo</option>
                  <option value="SUSPENDED">Suspenso</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Calendário</span>
                <Switch
                  checked={calendarEnabled}
                  onCheckedChange={setCalendarEnabled}
                />
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
      ) : null}

      {canManageLists ? (
        <TabsContent value="lists">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Colunas do quadro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Estas colunas organizam o quadro deste cliente. O ciclo da
                demanda (produção, revisão…) não muda ao mover o card.
              </p>

              <div className="flex gap-2">
                <Input
                  placeholder="Nova coluna (ex.: REELS CONGRESSO)"
                  value={newListName}
                  maxLength={60}
                  onChange={(e) => setNewListName(e.target.value)}
                />
                <Button
                  disabled={pending || !newListName.trim()}
                  onClick={() => {
                    const name = newListName;
                    startTransition(async () => {
                      const result = await createBoardListAction(
                        boardId,
                        clientId,
                        name
                      );
                      if (result.error) {
                        toast.error(result.error);
                        return;
                      }
                      if (result.list) {
                        setLists((prev) => [
                          ...prev,
                          {
                            id: result.list!.id,
                            name: result.list!.name,
                            active: true,
                          },
                        ]);
                      }
                      setNewListName("");
                      toast.success("Coluna criada");
                    });
                  }}
                >
                  Adicionar
                </Button>
              </div>

              <div className="space-y-2">
                {lists.map((l, index) => (
                  <div
                    key={l.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending || index === 0}
                        onClick={() => moveList(l.id, -1)}
                        aria-label="Subir"
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending || index === lists.length - 1}
                        onClick={() => moveList(l.id, 1)}
                        aria-label="Descer"
                      >
                        ↓
                      </Button>
                    </div>

                    {editingId === l.id ? (
                      <Input
                        className="max-w-xs flex-1"
                        value={editingName}
                        maxLength={60}
                        onChange={(e) => setEditingName(e.target.value)}
                      />
                    ) : (
                      <span
                        className={
                          l.active
                            ? "flex-1 font-medium"
                            : "flex-1 text-muted-foreground line-through"
                        }
                      >
                        {l.name}
                      </span>
                    )}

                    {editingId === l.id ? (
                      <>
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              const result = await renameBoardListAction(
                                l.id,
                                clientId,
                                editingName
                              );
                              if (result.error) {
                                toast.error(result.error);
                                return;
                              }
                              setLists((prev) =>
                                prev.map((row) =>
                                  row.id === l.id
                                    ? { ...row, name: editingName.trim() }
                                    : row
                                )
                              );
                              setEditingId(null);
                              toast.success("Coluna renomeada");
                            });
                          }}
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          setEditingId(l.id);
                          setEditingName(l.name);
                        }}
                      >
                        Renomear
                      </Button>
                    )}

                    {l.active ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          if (
                            !confirm(
                              `Arquivar a coluna "${l.name}"? Só funciona se não houver cartões nela.`
                            )
                          ) {
                            return;
                          }
                          startTransition(async () => {
                            const result = await archiveBoardListAction(
                              l.id,
                              clientId
                            );
                            if (result.error) {
                              toast.error(result.error);
                              return;
                            }
                            setLists((prev) =>
                              prev.map((row) =>
                                row.id === l.id
                                  ? { ...row, active: false }
                                  : row
                              )
                            );
                            toast.success("Coluna arquivada");
                          });
                        }}
                      >
                        Arquivar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            const result = await unarchiveBoardListAction(
                              l.id,
                              clientId
                            );
                            if (result.error) {
                              toast.error(result.error);
                              return;
                            }
                            setLists((prev) =>
                              prev.map((row) =>
                                row.id === l.id ? { ...row, active: true } : row
                              )
                            );
                            toast.success("Coluna restaurada");
                          });
                        }}
                      >
                        Restaurar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Ordem atual: {orderedIds.length} coluna(s).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      ) : null}

      {canEditBoard ? (
        <TabsContent value="access">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Acessos do cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {externalUsers.length ? (
                externalUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span>{u.name}</span>
                    <span className="text-muted-foreground">{u.email}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum usuário externo vinculado.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      ) : null}

      {canEditBoard ? (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="font-medium text-red-800">Zona de perigo</h3>
          <p className="mt-1 text-sm text-red-700">
            Arquivar o quadro suspende o portal e bloqueia novas demandas. O
            histórico é preservado.
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
      ) : null}
    </Tabs>
  );
}
