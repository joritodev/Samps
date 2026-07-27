"use server";

import { AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { PERMISSION_CODES } from "@/lib/permissions/codes";
import { requirePermission } from "@/lib/permissions/check";
import { logAudit } from "@/lib/services/audit.service";

const schema = z.object({
  roleId: z.string().min(1),
  codes: z.array(z.enum(PERMISSION_CODES)),
});

/**
 * Sobrescreve o conjunto de permissões de uma função.
 * As permissões são configuráveis por função — o cargo (`UserType`) define o
 * painel inicial, não o que o usuário pode fazer.
 */
export async function updateRolePermissions(input: {
  roleId: string;
  codes: string[];
}) {
  const actor = await requirePermission("roles.manage");
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "Dados inválidos." };
  }

  const { roleId, codes } = parsed.data;

  const role = await db.role.findUnique({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } } },
  });

  if (!role) {
    return { ok: false as const, error: "Função não encontrada." };
  }

  const permissions = await db.permission.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true },
  });

  const previous = role.permissions.map((p) => p.permission.code).sort();
  const next = permissions.map((p) => p.code).sort();

  await db.$transaction([
    db.rolePermission.deleteMany({ where: { roleId } }),
    db.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId,
        permissionId: permission.id,
      })),
    }),
  ]);

  await logAudit({
    userId: actor.id,
    action: AuditAction.USER_UPDATED,
    entityType: "Role",
    entityId: roleId,
    previousValue: { name: role.name, permissions: previous },
    newValue: { name: role.name, permissions: next },
    origin: "configuracoes/funcoes",
  });

  revalidatePath("/configuracoes/funcoes");

  return { ok: true as const, granted: next.length };
}
