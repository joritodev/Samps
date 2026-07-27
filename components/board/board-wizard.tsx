"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type { BoardListType, DemandType, PortalStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBoardAction } from "@/lib/actions/board.actions";
import { DEFAULT_BOARD_LISTS, type BoardWizardInput } from "@/types/board";
import { toast } from "sonner";

type UserOption = { id: string; name: string };

const STEPS = [
  "Cliente",
  "Responsáveis",
  "Contrato",
  "Listas",
  "Portal",
  "Revisão",
];

const DEFAULT_SERVICES: {
  name: string;
  quantity: number;
  demandType: DemandType;
}[] = [
  { name: "Estático", quantity: 8, demandType: "FEED" },
  { name: "Carrossel", quantity: 4, demandType: "FEED" },
  { name: "Reel", quantity: 4, demandType: "REEL" },
  { name: "Stories", quantity: 12, demandType: "STORY" },
];

export function BoardWizard({
  users,
  existingClientId,
  existingClientName,
}: {
  users: UserOption[];
  existingClientId?: string;
  existingClientName?: string;
}) {
  const searchParams = useSearchParams();
  const clientIdParam = searchParams.get("clientId") ?? existingClientId;
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const now = new Date();

  const [form, setForm] = useState<BoardWizardInput>({
    clientId: clientIdParam ?? undefined,
    client: {
      name: existingClientName ?? "",
      tradeName: existingClientName ?? "",
    },
    team: {
      socialMediaId: users.find((u) => u.name.includes("Social"))?.id ?? users[0]?.id ?? "",
      primaryResponsibleId: users.find((u) => u.name.includes("Gestor"))?.id ?? users[0]?.id ?? "",
    },
    contract: {
      planName: "Plano mensal",
      startDate: now,
      competenceMonth: now.getMonth() + 1,
      competenceYear: now.getFullYear(),
      services: DEFAULT_SERVICES,
    },
    lists: Object.fromEntries(
      DEFAULT_BOARD_LISTS.map((l) => [l.type, true])
    ) as Record<BoardListType, boolean>,
    portal: {
      displayName: existingClientName ?? "",
      calendarEnabled: true,
      completedVisible: true,
      upcomingVisible: true,
      status: "DRAFT" as PortalStatus,
    },
    createdById: "",
  });

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    startTransition(async () => {
      const result = await createBoardAction(form);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium ${
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-secondary text-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Nome fantasia</Label>
                <Input
                  value={form.client.tradeName ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      client: { ...form.client, tradeName: e.target.value, name: e.target.value },
                      portal: { ...form.portal, displayName: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Razão social</Label>
                <Input
                  value={form.client.legalName ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, client: { ...form.client, legalName: e.target.value } })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Segmento</Label>
                  <Input
                    value={form.client.segment ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, client: { ...form.client, segment: e.target.value } })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input
                    type="color"
                    value={form.client.brandColor ?? "#0ea5e9"}
                    onChange={(e) =>
                      setForm({ ...form, client: { ...form.client, brandColor: e.target.value } })
                    }
                  />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Social media principal</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.team.socialMediaId}
                  onChange={(e) =>
                    setForm({ ...form, team: { ...form.team, socialMediaId: e.target.value } })
                  }
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Gestor responsável</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.team.primaryResponsibleId}
                  onChange={(e) =>
                    setForm({ ...form, team: { ...form.team, primaryResponsibleId: e.target.value } })
                  }
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Nome do plano</Label>
                <Input
                  value={form.contract.planName}
                  onChange={(e) =>
                    setForm({ ...form, contract: { ...form.contract, planName: e.target.value } })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Competência (mês)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={form.contract.competenceMonth}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        contract: { ...form.contract, competenceMonth: Number(e.target.value) },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Input
                    type="number"
                    value={form.contract.competenceYear}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        contract: { ...form.contract, competenceYear: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quantidades mensais</Label>
                {form.contract.services.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="w-32 text-sm">{s.name}</span>
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      value={s.quantity}
                      onChange={(e) => {
                        const services = [...form.contract.services];
                        services[i] = { ...s, quantity: Number(e.target.value) };
                        setForm({ ...form, contract: { ...form.contract, services } });
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {DEFAULT_BOARD_LISTS.map((l) => (
                <div key={l.type} className="flex items-center justify-between">
                  <span className="text-sm">{l.name}</span>
                  <Switch
                    checked={form.lists[l.type] !== false}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, lists: { ...form.lists, [l.type]: checked } })
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <>
              <div className="space-y-2">
                <Label>Nome exibido no portal</Label>
                <Input
                  value={form.portal.displayName}
                  onChange={(e) =>
                    setForm({ ...form, portal: { ...form.portal, displayName: e.target.value } })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Calendário externo</span>
                <Switch
                  checked={form.portal.calendarEnabled}
                  onCheckedChange={(v) =>
                    setForm({ ...form, portal: { ...form.portal, calendarEnabled: v } })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Materiais concluídos visíveis</span>
                <Switch
                  checked={form.portal.completedVisible}
                  onCheckedChange={(v) =>
                    setForm({ ...form, portal: { ...form.portal, completedVisible: v } })
                  }
                />
              </div>
              <p className="text-xs text-slate-500">Portal será criado em modo Rascunho.</p>
            </>
          )}

          {step === 5 && (
            <div className="space-y-2 text-sm">
              <p><strong>Cliente:</strong> {form.client.tradeName}</p>
              <p><strong>Plano:</strong> {form.contract.planName}</p>
              <p><strong>Competência:</strong> {form.contract.competenceMonth}/{form.contract.competenceYear}</p>
              <p><strong>Cartões contratuais:</strong> {form.contract.services.reduce((a, s) => a + s.quantity, 0)}</p>
              <p><strong>Portal:</strong> {form.portal.displayName} (Rascunho)</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={back} disabled={step === 0 || pending}>
          Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>Próximo</Button>
        ) : (
          <Button onClick={submit} disabled={pending}>
            {pending ? "Criando..." : "Criar quadro e portal do cliente"}
          </Button>
        )}
      </div>
    </div>
  );
}
