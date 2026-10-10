"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addPlanMemberAction,
  deactivatePlanMemberAction,
  listEligibleMembersAction,
  saveMemberSettingsAction,
  setCapacityOverrideAction,
} from "@/lib/actions/planning.actions";
import type {
  IsoWeek,
  PlanCapacityOverrideData,
  PlanMemberData,
  PlanSectorSlug,
} from "@/lib/agency/planning/types";
import { WEEKDAYS } from "@/lib/agency/planning/week";

export function SettingsDialog({
  slug,
  members: initialMembers,
  overrides,
  week,
  onClose,
  onChanged,
}: {
  slug: PlanSectorSlug;
  members: PlanMemberData[];
  overrides: PlanCapacityOverrideData[];
  week: IsoWeek;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [saving, setSaving] = useState(false);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [newPerson, setNewPerson] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listEligibleMembersAction(slug).then((result) => {
      if (!cancelled && "people" in result) setPeople(result.people);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function save() {
    setSaving(true);
    const result = await saveMemberSettingsAction(
      slug,
      week,
      members.map((m) => ({ id: m.id, color: m.color, defaultCapacityHours: m.defaultCapacityHours })),
    );
    setSaving(false);
    if ("error" in result) return toast.error(result.error);
    toast.success("Configurações salvas");
    onChanged();
    onClose();
  }

  async function addMember() {
    if (!newPerson) return;
    const result = await addPlanMemberAction(slug, newPerson, week);
    if ("error" in result) return toast.error(result.error);
    onChanged();
    onClose();
  }

  async function removeMember(id: string) {
    const result = await deactivatePlanMemberAction(slug, id, week);
    if ("error" in result) return toast.error(result.error);
    setMembers((prev) => prev.filter((m) => m.id !== id));
    onChanged();
  }

  async function setOverride(memberId: string, weekday: number, hours: number, weekly: boolean) {
    const result = await setCapacityOverrideAction(slug, week, {
      memberId,
      weekday,
      hours,
      week: weekly ? week : null,
    });
    if ("error" in result) toast.error(result.error);
    else onChanged();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurações da equipe e capacidade</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum profissional no quadro deste setor ainda.</p>
          )}
          {members.map((member, index) => (
            <div key={member.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input value={member.name} readOnly className="bg-muted/50" title="O nome vem do cadastro do usuário" />
                </div>
                <div className="space-y-1">
                  <Label>Cor</Label>
                  <Input
                    type="color"
                    className="h-9 w-16 p-1"
                    value={member.color}
                    onChange={(e) =>
                      setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, color: e.target.value } : m)))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Capacidade padrão (h/dia)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    className="w-28"
                    value={member.defaultCapacityHours}
                    onChange={(e) =>
                      setMembers((prev) =>
                        prev.map((m, i) =>
                          i === index ? { ...m, defaultCapacityHours: Number(e.target.value) || 0 } : m,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-destructive"
                  onClick={() => void removeMember(member.id)}
                >
                  Remover
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-6 gap-2">
                {WEEKDAYS.map((d) => {
                  const value =
                    overrides.find(
                      (o) => o.memberId === member.id && o.weekday === d.value && o.isoYear === null,
                    )?.hours ?? member.defaultCapacityHours;
                  return (
                    <div key={d.value} className="space-y-1">
                      <Label className="text-[11px]">{d.short}</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        defaultValue={value}
                        onBlur={(e) => {
                          if (Number(e.target.value) === value) return;
                          void setOverride(member.id, d.value, Number(e.target.value) || 0, false);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-6 gap-2">
                <p className="col-span-6 text-xs font-medium text-muted-foreground">
                  Só nesta semana ({week.week}/{week.year})
                </p>
                {WEEKDAYS.map((d) => {
                  const value = overrides.find(
                    (o) =>
                      o.memberId === member.id &&
                      o.weekday === d.value &&
                      o.isoYear === week.year &&
                      o.isoWeek === week.week,
                  )?.hours;
                  return (
                    <Input
                      key={d.value}
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      placeholder={d.short}
                      defaultValue={value ?? ""}
                      onBlur={(e) => {
                        if (e.target.value === "" || Number(e.target.value) === value) return;
                        void setOverride(member.id, d.value, Number(e.target.value) || 0, true);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="plan-new-member">Adicionar profissional</Label>
              <select
                id="plan-new-member"
                className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
              >
                <option value="">
                  {people.length ? "Escolha uma pessoa do setor" : "Todos do setor já estão no quadro"}
                </option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="outline" onClick={() => void addMember()} disabled={!newPerson}>
              Adicionar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            As pessoas do quadro vêm do cadastro de usuários do setor. Para criar um acesso novo, use
            Equipe.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
