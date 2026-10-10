"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** Lista de pessoas com caixa de seleção (participantes e equipe). */
export function PersonPicker({
  label,
  users,
  value,
  onChange,
  idPrefix,
}: {
  label: string;
  users: { id: string; name: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
  idPrefix: string;
}) {
  function toggle(id: string, checked: boolean) {
    onChange(checked ? Array.from(new Set([...value, id])) : value.filter((v) => v !== id));
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-border bg-card p-2 sm:grid-cols-2">
        {users.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">Nenhuma pessoa disponível.</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted">
              <Checkbox
                id={`${idPrefix}-${u.id}`}
                checked={value.includes(u.id)}
                onCheckedChange={(c) => toggle(u.id, c === true)}
              />
              <Label htmlFor={`${idPrefix}-${u.id}`} className="cursor-pointer text-sm font-normal">
                {u.name}
              </Label>
            </div>
          ))
        )}
      </div>
    </fieldset>
  );
}
