"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/permissions/check";
import { createClient } from "@/lib/services/clients.service";

export async function createClientAction(formData: FormData) {
  const user = await requireAuth();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Nome é obrigatório" };
  }

  let client;
  try {
    client = await createClient(user, {
      name,
      legalName: String(formData.get("legalName") ?? "").trim() || undefined,
      tradeName: String(formData.get("tradeName") ?? "").trim() || undefined,
      segment: String(formData.get("segment") ?? "").trim() || undefined,
      email: String(formData.get("email") ?? "").trim() || undefined,
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      brandColor: String(formData.get("brandColor") ?? "").trim() || undefined,
      internalNotes: String(formData.get("internalNotes") ?? "").trim() || undefined,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar cliente" };
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${client.id}`);
}
