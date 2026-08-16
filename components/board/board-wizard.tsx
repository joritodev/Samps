"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type {
  ClientStatus,
  DemandType,
  PortalStatus,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBoardAction } from "@/lib/actions/board.actions";
import { DEFAULT_BOARD_LISTS, type BoardWizardInput, type CatalogBoardListType } from "@/types/board";
import { toast } from "sonner";

type UserOption = { id: string; name: string };

export type WizardInitialClient = {
  id?: string;
  name?: string;
  legalName?: string | null;
  tradeName?: string | null;
  segment?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
  status?: ClientStatus;
  startedAt?: Date | null;
  internalNotes?: string | null;
  socialMediaId?: string | null;
  secondarySocialMediaId?: string | null;
  primaryResponsibleId?: string | null;
  accountLeaderId?: string | null;
};

const STEPS = [
  "Cliente",
  "Responsáveis",
  "Contrato",
  "Listas",
  "Portal",
  "Revisão",
];

const CLIENT_STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "PAUSED", label: "Pausado" },
  { value: "INACTIVE", label: "Inativo" },
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

function toDateInputValue(d?: Date | null) {
  if (!d) return "";
  const x = new Date(d);
  return x.toISOString().slice(0, 10);
}

function buildInitialForm(
  users: UserOption[],
  initial?: WizardInitialClient
): BoardWizardInput {
  const now = new Date();
  const displayName = initial?.tradeName ?? initial?.name ?? "";
  const gestor =
    users.find((u) => u.id === initial?.primaryResponsibleId) ??
    users.find((u) => u.name.includes("Gestor"));
  const social =
    users.find((u) => u.id === initial?.socialMediaId) ??
    users.find((u) => u.name.includes("Social"));

  return {
    clientId: initial?.id,
    client: {
      name: displayName,
      tradeName: displayName,
      legalName: initial?.legalName ?? "",
      segment: initial?.segment ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      logoUrl: initial?.logoUrl ?? "",
      brandColor: initial?.brandColor ?? "#0ea5e9",
      status: initial?.status ?? "ACTIVE",
      startedAt: initial?.startedAt ?? now,
      internalNotes: initial?.internalNotes ?? "",
    },
    team: {
      socialMediaId: social?.id ?? users[0]?.id ?? "",
      secondarySocialMediaId: initial?.secondarySocialMediaId ?? undefined,
      primaryResponsibleId: gestor?.id ?? users[0]?.id ?? "",
      accountLeaderId: initial?.accountLeaderId ?? undefined,
    },
    contract: {
      planName: "Plano mensal",
      startDate: initial?.startedAt ?? now,
      competenceMonth: now.getMonth() + 1,
      competenceYear: now.getFullYear(),
      services: DEFAULT_SERVICES,
    },
    lists: Object.fromEntries(
      DEFAULT_BOARD_LISTS.map((l) => [l.type, true])
    ) as Record<CatalogBoardListType, boolean>,
    portal: {
      displayName,
      logoUrl: initial?.logoUrl ?? "",
      primaryColor: initial?.brandColor ?? "#0ea5e9",
      calendarEnabled: true,
      completedVisible: true,
      upcomingVisible: true,
      status: "DRAFT" as PortalStatus,
      agencyContactUserId: gestor?.id,
      agencyContactName: gestor?.name,
    },
    createdById: "",
  };
}

export function BoardWizard({
  users,
  initialClient,
}: {
  users: UserOption[];
  initialClient?: WizardInitialClient;
}) {
  const searchParams = useSearchParams();
  const clientIdParam = searchParams.get("clientId") ?? initialClient?.id;
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<BoardWizardInput>(() =>
    buildInitialForm(users, { ...initialClient, id: clientIdParam ?? initialClient?.id })
  );

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    startTransition(async () => {
      const payload: BoardWizardInput = {
        ...form,
        clientId: clientIdParam ?? form.clientId,
        client: {
          ...form.client,
          startedAt: form.client.startedAt
            ? new Date(form.client.startedAt)
            : undefined,
        },
        contract: {
          ...form.contract,
          startDate: new Date(form.contract.startDate),
          endDate: form.contract.endDate
            ? new Date(form.contract.endDate)
            : undefined,
        },
      };
      const result = await createBoardAction(payload);
      if (result?.error) toast.error(result.error);
    });
  }

  const optionalUserSelect = (
    label: string,
    value: string | undefined,
    onChange: (id: string | undefined) => void
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">— Nenhum —</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  );

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
                      client: {
                        ...form.client,
                        tradeName: e.target.value,
                        name: e.target.value,
                      },
                      portal: {
                        ...form.portal,
                        displayName: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Razão social</Label>
                <Input
                  value={form.client.legalName ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      client: { ...form.client, legalName: e.target.value },
                    })
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Segmento</Label>
                  <Input
                    value={form.client.segment ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        client: { ...form.client, segment: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.client.status ?? "ACTIVE"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        client: {
                          ...form.client,
                          status: e.target.value as ClientStatus,
                        },
                      })
                    }
                  >
                    {CLIENT_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.client.email ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        client: { ...form.client, email: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={form.client.phone ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        client: { ...form.client, phone: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>URL do logotipo</Label>
                  <Input
                    placeholder="https://..."
                    value={form.client.logoUrl ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        client: { ...form.client, logoUrl: e.target.value },
                        portal: { ...form.portal, logoUrl: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor de identificação</Label>
                  <Input
                    type="color"
                    value={form.client.brandColor ?? "#0ea5e9"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        client: { ...form.client, brandColor: e.target.value },
                        portal: {
                          ...form.portal,
                          primaryColor: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data de início</Label>
                <Input
                  type="date"
                  value={toDateInputValue(form.client.startedAt)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      client: {
                        ...form.client,
                        startedAt: e.target.value
                          ? new Date(e.target.value)
                          : undefined,
                      },
                      contract: {
                        ...form.contract,
                        startDate: e.target.value
                          ? new Date(e.target.value)
                          : form.contract.startDate,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Observações internas</Label>
                <Textarea
                  rows={3}
                  value={form.client.internalNotes ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      client: {
                        ...form.client,
                        internalNotes: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Social media principal</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.team.socialMediaId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      team: { ...form.team, socialMediaId: e.target.value },
                    })
                  }
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              {optionalUserSelect(
                "Social media secundária",
                form.team.secondarySocialMediaId,
                (id) =>
                  setForm({
                    ...form,
                    team: { ...form.team, secondarySocialMediaId: id },
                  })
              )}
              <div className="space-y-2">
                <Label>Gestor responsável</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.team.primaryResponsibleId}
                  onChange={(e) => {
                    const user = users.find((u) => u.id === e.target.value);
                    setForm({
                      ...form,
                      team: {
                        ...form.team,
                        primaryResponsibleId: e.target.value,
                      },
                      portal: {
                        ...form.portal,
                        agencyContactUserId: e.target.value,
                        agencyContactName: user?.name,
                      },
                    });
                  }}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              {optionalUserSelect(
                "Líder responsável pela conta",
                form.team.accountLeaderId,
                (id) =>
                  setForm({
                    ...form,
                    team: { ...form.team, accountLeaderId: id },
                  })
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Nome do plano</Label>
                <Input
                  value={form.contract.planName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contract: { ...form.contract, planName: e.target.value },
                    })
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Início do contrato</Label>
                  <Input
                    type="date"
                    value={toDateInputValue(form.contract.startDate)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        contract: {
                          ...form.contract,
                          startDate: e.target.value
                            ? new Date(e.target.value)
                            : form.contract.startDate,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Encerramento (opcional)</Label>
                  <Input
                    type="date"
                    value={toDateInputValue(form.contract.endDate)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        contract: {
                          ...form.contract,
                          endDate: e.target.value
                            ? new Date(e.target.value)
                            : undefined,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
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
                        contract: {
                          ...form.contract,
                          competenceMonth: Number(e.target.value),
                        },
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
                        contract: {
                          ...form.contract,
                          competenceYear: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dia de renovação</Label>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    placeholder="Ex: 1"
                    value={form.contract.renewalDay ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        contract: {
                          ...form.contract,
                          renewalDay: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações do contrato</Label>
                <Textarea
                  rows={2}
                  value={form.contract.notes ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contract: { ...form.contract, notes: e.target.value },
                    })
                  }
                />
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
                        services[i] = {
                          ...s,
                          quantity: Number(e.target.value),
                        };
                        setForm({
                          ...form,
                          contract: { ...form.contract, services },
                        });
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
                      setForm({
                        ...form,
                        lists: { ...form.lists, [l.type]: checked },
                      })
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
                    setForm({
                      ...form,
                      portal: { ...form.portal, displayName: e.target.value },
                    })
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Logo do portal (URL)</Label>
                  <Input
                    placeholder="https://..."
                    value={form.portal.logoUrl ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        portal: { ...form.portal, logoUrl: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor principal</Label>
                  <Input
                    type="color"
                    value={form.portal.primaryColor ?? "#0ea5e9"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        portal: {
                          ...form.portal,
                          primaryColor: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
              {optionalUserSelect(
                "Contato da agência no portal",
                form.portal.agencyContactUserId,
                (id) => {
                  const user = users.find((u) => u.id === id);
                  setForm({
                    ...form,
                    portal: {
                      ...form.portal,
                      agencyContactUserId: id,
                      agencyContactName: user?.name,
                    },
                  });
                }
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm">Calendário externo</span>
                <Switch
                  checked={form.portal.calendarEnabled}
                  onCheckedChange={(v) =>
                    setForm({
                      ...form,
                      portal: { ...form.portal, calendarEnabled: v },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Materiais concluídos visíveis</span>
                <Switch
                  checked={form.portal.completedVisible}
                  onCheckedChange={(v) =>
                    setForm({
                      ...form,
                      portal: { ...form.portal, completedVisible: v },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Próximas publicações visíveis</span>
                <Switch
                  checked={form.portal.upcomingVisible}
                  onCheckedChange={(v) =>
                    setForm({
                      ...form,
                      portal: { ...form.portal, upcomingVisible: v },
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Portal será criado em modo Rascunho.
              </p>
            </>
          )}

          {step === 5 && (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Cliente:</strong> {form.client.tradeName}
              </p>
              <p>
                <strong>Contato:</strong> {form.client.email || "—"} ·{" "}
                {form.client.phone || "—"}
              </p>
              <p>
                <strong>Plano:</strong> {form.contract.planName}
              </p>
              <p>
                <strong>Competência:</strong> {form.contract.competenceMonth}/
                {form.contract.competenceYear}
              </p>
              <p>
                <strong>Cartões contratuais:</strong>{" "}
                {form.contract.services.reduce((a, s) => a + s.quantity, 0)}
              </p>
              <p>
                <strong>Portal:</strong> {form.portal.displayName} (Rascunho)
              </p>
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
