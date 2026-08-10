"use server";

import {
  AuditAction,
  ClientStatus,
  ContractStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  clientProfileSchema,
  type ClientProfileInput,
} from "@/lib/agency/client-fields";
import {
  demandTypeFromContentSlug,
  normalizeScopeLines,
  type ContractScopeLine,
} from "@/lib/agency/contract-services";
import {
  requireClientAccess,
  requirePermission,
} from "@/lib/permissions/check";
import { logAudit } from "@/lib/services/audit.service";

type ScopeInput = {
  contentTypeId: string;
  quantity: number;
  periodicity: string;
};

type ProfileFields = {
  birthDate?: string;
  addressZip?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
  contractDocUrl?: string;
  studyDocUrl?: string;
};

async function resolveServiceCreates(lines: ContractScopeLine[]) {
  if (lines.length === 0) return [];

  const types = await db.contentType.findMany({
    where: {
      id: { in: lines.map((l) => l.contentTypeId) },
      isActive: true,
    },
  });
  const byId = new Map(types.map((t) => [t.id, t]));

  return lines.flatMap((line) => {
    const ct = byId.get(line.contentTypeId);
    if (!ct) return [];
    return [
      {
        name: ct.name,
        quantity: line.quantity,
        periodicity: line.periodicity,
        contentTypeId: ct.id,
        demandType: demandTypeFromContentSlug(ct.slug),
        isActive: true,
      },
    ];
  });
}

export async function createClient(input: {
  name: string;
  active: boolean;
  segment?: string;
  planName?: string;
  contractNotes?: string;
  services?: ScopeInput[];
} & ProfileFields) {
  const actor = await requirePermission("clients.create");

  const name = input.name?.trim();
  if (!name) {
    return { error: "O nome do cliente é obrigatório" };
  }

  const profile = clientProfileSchema.safeParse(input);
  if (!profile.success) {
    return { error: profile.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const planName = input.planName?.trim();
  const contractNotes = input.contractNotes?.trim();
  const lines = normalizeScopeLines(input.services ?? []);

  if ((input.services ?? []).some((s) => Number(s.quantity) < 0)) {
    return { error: "Quantidade não pode ser negativa" };
  }

  try {
    const serviceCreates = await resolveServiceCreates(lines);
    const needsContract =
      Boolean(planName) || Boolean(contractNotes) || serviceCreates.length > 0;
    const data = profile.data;

    const client = await db.client.create({
      data: {
        name,
        segment: input.segment?.trim() || null,
        status: input.active ? ClientStatus.ACTIVE : ClientStatus.PAUSED,
        primaryResponsibleId: actor.id,
        startedAt: new Date(),
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        addressZip: data.addressZip,
        addressStreet: data.addressStreet,
        addressNumber: data.addressNumber,
        addressComplement: data.addressComplement,
        addressDistrict: data.addressDistrict,
        addressCity: data.addressCity,
        addressState: data.addressState,
        contractDocUrl: data.contractDocUrl,
        studyDocUrl: data.studyDocUrl,
        contracts: needsContract
          ? {
              create: {
                planName: planName || "Contrato inicial",
                notes: contractNotes || null,
                startDate: new Date(),
                status: ContractStatus.ACTIVE,
                services:
                  serviceCreates.length > 0
                    ? { create: serviceCreates }
                    : undefined,
              },
            }
          : undefined,
      },
    });

    await logAudit({
      userId: actor.id,
      action: AuditAction.CLIENT_CREATED,
      entityType: "Client",
      entityId: client.id,
      newValue: {
        name: client.name,
        status: client.status,
        planName,
        services: serviceCreates.length,
      },
    });

    revalidatePath("/clientes");
    revalidatePath(`/clientes/${client.id}`);
    return { success: true, id: client.id };
  } catch (error) {
    console.error("createClient", error);
    return { error: "Não foi possível criar o cliente." };
  }
}

export async function syncClientContractServices(
  clientId: string,
  input: {
    planName?: string;
    contractNotes?: string;
    services: ScopeInput[];
  }
) {
  const actor = await requirePermission("clients.edit");
  await requireClientAccess(clientId);

  if (input.services.some((s) => Number(s.quantity) < 0)) {
    return { error: "Quantidade não pode ser negativa" };
  }

  const lines = normalizeScopeLines(input.services);

  try {
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) return { error: "Cliente não encontrado" };

    let contract = await db.contract.findFirst({
      where: { clientId, status: ContractStatus.ACTIVE },
      orderBy: { startDate: "desc" },
      include: { services: true },
    });

    const serviceCreates = await resolveServiceCreates(lines);
    const planName = input.planName?.trim();
    const contractNotes = input.contractNotes?.trim();

    if (!contract) {
      if (
        !planName &&
        !contractNotes &&
        serviceCreates.length === 0
      ) {
        revalidatePath(`/clientes/${clientId}`);
        return { success: true };
      }
      contract = await db.contract.create({
        data: {
          clientId,
          planName: planName || "Contrato inicial",
          notes: contractNotes || null,
          startDate: new Date(),
          status: ContractStatus.ACTIVE,
          services:
            serviceCreates.length > 0
              ? { create: serviceCreates }
              : undefined,
        },
        include: { services: true },
      });
    } else {
      const contractId = contract.id;
      const existingPlanName = contract.planName;
      const existingServices = contract.services;

      await db.$transaction(async (tx) => {
        await tx.contract.update({
          where: { id: contractId },
          data: {
            ...(planName !== undefined
              ? { planName: planName || existingPlanName }
              : {}),
            ...(input.contractNotes !== undefined
              ? { notes: contractNotes || null }
              : {}),
          },
        });

        const keepIds = new Set(lines.map((l) => l.contentTypeId));
        const byContentType = new Map(
          existingServices
            .filter((s) => s.contentTypeId)
            .map((s) => [s.contentTypeId!, s])
        );

        for (const existing of existingServices) {
          if (
            existing.contentTypeId &&
            !keepIds.has(existing.contentTypeId) &&
            existing.isActive
          ) {
            await tx.contractService.update({
              where: { id: existing.id },
              data: { isActive: false },
            });
          }
        }

        for (const line of lines) {
          const payload = serviceCreates.find(
            (s) => s.contentTypeId === line.contentTypeId
          );
          if (!payload) continue;

          const existing = byContentType.get(line.contentTypeId);
          if (existing) {
            await tx.contractService.update({
              where: { id: existing.id },
              data: {
                name: payload.name,
                quantity: payload.quantity,
                periodicity: payload.periodicity,
                demandType: payload.demandType,
                isActive: true,
              },
            });
          } else {
            await tx.contractService.create({
              data: {
                contractId,
                ...payload,
              },
            });
          }
        }
      });
    }

    await logAudit({
      userId: actor.id,
      action: AuditAction.OTHER,
      entityType: "Contract",
      entityId: contract.id,
      newValue: { services: lines.length, clientId },
    });

    revalidatePath("/clientes");
    revalidatePath(`/clientes/${clientId}`);
    return { success: true };
  } catch (error) {
    console.error("syncClientContractServices", error);
    return { error: "Não foi possível salvar o escopo do contrato." };
  }
}

export async function updateClientProfile(
  clientId: string,
  input: ClientProfileInput
) {
  const actor = await requirePermission("clients.edit");
  await requireClientAccess(clientId);

  const parsed = clientProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  try {
    await db.client.update({
      where: { id: clientId },
      data: {
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        addressZip: data.addressZip,
        addressStreet: data.addressStreet,
        addressNumber: data.addressNumber,
        addressComplement: data.addressComplement,
        addressDistrict: data.addressDistrict,
        addressCity: data.addressCity,
        addressState: data.addressState,
        contractDocUrl: data.contractDocUrl,
        studyDocUrl: data.studyDocUrl,
      },
    });

    await logAudit({
      userId: actor.id,
      action: AuditAction.CLIENT_UPDATED,
      entityType: "Client",
      entityId: clientId,
      newValue: { profileUpdated: true },
    });

    revalidatePath(`/clientes/${clientId}`);
    return { success: true };
  } catch (error) {
    console.error("updateClientProfile", error);
    return { error: "Não foi possível atualizar os dados do cliente." };
  }
}
