import { AuditAction, DemandDelayResolution } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/types/auth";
import { hasPermission } from "@/lib/permissions/resolve";
import { logAudit } from "@/lib/services/audit.service";
import {
  resolveOpenDelay,
  syncDemandDelays,
  type DeadlineField,
} from "@/lib/services/delay.service";

export type { DeadlineField };

export async function changeDemandDeadline(
  demandId: string,
  user: SessionUser,
  input: {
    field: DeadlineField;
    newDate: Date;
    justification: string;
  }
) {
  if (!hasPermission(user.permissions, "demands.change_deadline")) {
    throw new Error("Sem permissão para alterar prazo");
  }

  const justification = input.justification.trim();
  if (justification.length < 10) {
    throw new Error("Justificativa deve ter pelo menos 10 caracteres");
  }

  const demand = await db.demand.findUnique({ where: { id: demandId } });
  if (!demand) throw new Error("Demanda não encontrada");

  const previous = demand[input.field];
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
      justification,
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
