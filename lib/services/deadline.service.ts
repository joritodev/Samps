import { AuditAction, DemandDelayResolution, UserType } from "@prisma/client";
import { parseReason } from "@/lib/agency/demand-history";
import { db } from "@/lib/db";
import type { SessionUser } from "@/types/auth";
import { logAudit } from "@/lib/services/audit.service";
import {
  resolveOpenDelay,
  syncDemandDelays,
  type DeadlineField,
} from "@/lib/services/delay.service";

export type { DeadlineField };

/**
 * Qualquer pessoa com acesso à demanda muda o prazo (a guarda fica na action).
 * O motivo é opcional; cada mudança entra no histórico do próprio card.
 */
export async function changeDemandDeadline(
  demandId: string,
  user: SessionUser,
  input: {
    field: DeadlineField;
    newDate: Date;
    justification?: string | null;
  }
) {
  if (user.userType === UserType.EXTERNAL_CLIENT) {
    throw new Error("Sem permissão para alterar prazo");
  }
  const reason = parseReason(input.justification);

  const demand = await db.demand.findUnique({ where: { id: demandId } });
  if (!demand) throw new Error("Demanda não encontrada");

  const previous = demand[input.field];
  if (previous && previous.toISOString().slice(0, 10) === input.newDate.toISOString().slice(0, 10)) {
    throw new Error("A nova data é igual à atual");
  }

  await db.demand.update({
    where: { id: demandId },
    data: { [input.field]: input.newDate },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.DEADLINE_CHANGED,
    entityType: "Demand",
    entityId: demandId,
    previousValue: {
      field: input.field,
      value: previous?.toISOString() ?? null,
    },
    newValue: {
      field: input.field,
      previous: previous?.toISOString() ?? null,
      new: input.newDate.toISOString(),
      justification: reason ?? "",
    },
    origin: "deadline-change",
  });

  await resolveOpenDelay(demandId, DemandDelayResolution.DEADLINE_EXTENDED);
  await syncDemandDelays([demandId]);

  return demand;
}

export async function resolveDelayOnTerminalStatus(
  demandId: string,
  status: "PUBLISHED" | "DONE" | "CANCELLED"
) {
  const resolution =
    status === "CANCELLED"
      ? DemandDelayResolution.CANCELLED
      : DemandDelayResolution.COMPLETED;
  await resolveOpenDelay(demandId, resolution);
}
