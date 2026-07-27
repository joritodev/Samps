"use server";

import { requireAuth, requireClientAccess } from "@/lib/permissions/check";

export async function startImpersonation(clientId: string) {
  await requireClientAccess(clientId);
  return { success: true as const, clientId };
}

export async function stopImpersonation() {
  await requireAuth();
  return { success: true as const, clientId: null };
}
