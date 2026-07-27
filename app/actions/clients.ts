"use server";

import { AuditAction, ClientStatus, ContractStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/check";
import { logAudit } from "@/lib/services/audit.service";

export async function createClient(input: {
  name: string;
  active: boolean;
  segment?: string;
  planName?: string;
  contractNotes?: string;
}) {
  const actor = await requirePermission("clients.create");

  const name = input.name?.trim();
  if (!name) {
    return { error: "O nome do cliente é obrigatório" };
  }

  const planName = input.planName?.trim();
  const contractNotes = input.contractNotes?.trim();

  try {
    const client = await db.client.create({
      data: {
        name,
        segment: input.segment?.trim() || null,
        status: input.active ? ClientStatus.ACTIVE : ClientStatus.PAUSED,
        primaryResponsibleId: actor.id,
        startedAt: new Date(),
        // O escopo do contrato deixou de ser texto solto: vira um Contract,
        // que é o que alimenta a geração automática de cartões contratuais.
        contracts:
          planName || contractNotes
            ? {
                create: {
                  planName: planName || "Contrato inicial",
                  notes: contractNotes || null,
                  startDate: new Date(),
                  status: ContractStatus.ACTIVE,
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
      newValue: { name: client.name, status: client.status, planName },
    });

    revalidatePath("/clientes");
    revalidatePath(`/clientes/${client.id}`);
    return { success: true, id: client.id };
  } catch (error) {
    console.error("createClient", error);
    return { error: "Não foi possível criar o cliente." };
  }
}
