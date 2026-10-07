"use server";

import { z } from "zod";
import { INVALID_URL_MESSAGE, isHttpUrl } from "@/lib/agency/url";
import { requireAuth } from "@/lib/permissions/check";
import { guardDemand } from "@/lib/permissions/demand-guard";
import { hasPermission } from "@/lib/permissions/resolve";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import { addDriveAttachment } from "@/lib/services/attachments.service";

const schema = z.object({
  demandId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  url: z
    .string()
    .trim()
    .url("Informe um link válido (Drive, Figma, etc.).")
    .refine(isHttpUrl, INVALID_URL_MESSAGE)
    .max(2000),
  visibleToClient: z.boolean().optional(),
});

/**
 * Demo Drive-first (fatia 3.2 provisória): anexa link, sem upload binário.
 * Upload real fica bloqueado até decisão de storage + Security Review.
 */
export async function addDriveAttachmentAction(input: {
  demandId: string;
  clientId: string;
  name: string;
  url: string;
  visibleToClient?: boolean;
}) {
  const user = await requireAuth();
  if (
    !hasPermission(user.permissions, "demands.edit") &&
    !hasPermission(user.permissions, "demands.create")
  ) {
    return { error: "Sem permissão para anexar arquivos." };
  }

  const guard = await guardDemand(user, input.demandId);
  if (!guard.ok) return { error: guard.error };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const row = await addDriveAttachment({
      ...parsed.data,
      actorId: user.id,
    });
    revalidateOperationalViews(parsed.data.clientId);
    return { success: true as const, id: row.id };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Não foi possível anexar.",
    };
  }
}
