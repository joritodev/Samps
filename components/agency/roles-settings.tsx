"use client";

import Link from "next/link";
import { ChevronLeft, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { updateRolePermissions } from "@/lib/actions/roles.actions";
import { PERMISSION_GROUPS } from "@/lib/agency/permission-groups";
import { PERMISSION_LABELS, type PermissionCode } from "@/lib/permissions/codes";
import { cn } from "@/lib/utils";

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
}

export function RolesSettings({
  roles,
  availableCodes,
  canManage,
}: {
  roles: RoleSummary[];
  availableCodes: string[];
  canManage: boolean;
}) {
  const byRole = () =>
    Object.fromEntries(roles.map((role) => [role.id, role.permissions]));

  const [selectedId, setSelectedId] = useState(roles[0]?.id ?? null);
  const [saved, setSaved] = useState<Record<string, string[]>>(byRole);
  const [draft, setDraft] = useState<Record<string, string[]>>(byRole);
  const [pending, startTransition] = useTransition();

  const selected = roles.find((role) => role.id === selectedId) ?? null;
  const current = selected ? draft[selected.id] ?? [] : [];
  const persisted = selected ? saved[selected.id] ?? [] : [];
  const dirty =
    current.length !== persisted.length ||
    current.some((code) => !persisted.includes(code));

  function toggle(code: string, checked: boolean) {
    if (!selected) return;
    setDraft((prev) => {
      const codes = prev[selected.id] ?? [];
      return {
        ...prev,
        [selected.id]: checked
          ? [...codes, code]
          : codes.filter((c) => c !== code),
      };
    });
  }

  function save() {
    if (!selected) return;
    const codes = draft[selected.id] ?? [];

    startTransition(async () => {
      const result = await updateRolePermissions({ roleId: selected.id, codes });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setSaved((prev) => ({ ...prev, [selected.id]: codes }));
      toast.success(`${selected.name}: ${result.granted} permissões salvas.`);
    });
  }

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
          Funções e permissões
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          As permissões são definidas por função, não pelo cargo do usuário.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="max-h-48 w-full shrink-0 overflow-y-auto border-b border-border p-3 md:max-h-none md:w-64 md:border-b-0 md:border-r">
          {roles.map((role) => {
            const active = role.id === selectedId;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedId(role.id)}
                className={cn(
                  "mb-1 w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {role.name}
                  {role.isSystem ? (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {(draft[role.id] ?? []).length} permissões ·{" "}
                  {role.userCount} usuário{role.userCount === 1 ? "" : "s"}
                </span>
              </button>
            );
          })}
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto p-6">
          {selected ? (
            <>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {selected.name}
                  </h2>
                  {selected.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.description}
                    </p>
                  ) : null}
                </div>
                <Button onClick={save} disabled={!canManage || !dirty || pending}>
                  {pending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Salvar alterações
                </Button>
              </div>

              {!canManage ? (
                <p className="mb-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  Você pode consultar as permissões, mas não alterá-las.
                </p>
              ) : null}

              <div className="space-y-6">
                {PERMISSION_GROUPS.map((group) => {
                  const codes = group.codes.filter((code) =>
                    availableCodes.includes(code)
                  );
                  if (!codes.length) return null;

                  return (
                    <div
                      key={group.label}
                      className="rounded-xl border border-border"
                    >
                      <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <h3 className="text-sm font-medium text-foreground">
                          {group.label}
                        </h3>
                        <Badge variant="outline">
                          {codes.filter((c) => current.includes(c)).length}/
                          {codes.length}
                        </Badge>
                      </div>
                      <div className="grid gap-1 p-2 sm:grid-cols-2">
                        {codes.map((code) => (
                          <label
                            key={code}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                          >
                            <Checkbox
                              checked={current.includes(code)}
                              disabled={!canManage || pending}
                              onCheckedChange={(checked) =>
                                toggle(code, checked === true)
                              }
                            />
                            <span className="text-foreground">
                              {PERMISSION_LABELS[code as PermissionCode] ?? code}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma função cadastrada.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
