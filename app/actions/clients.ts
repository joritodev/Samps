"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function createClient(input: {
  name: string;
  active: boolean;
  contractScope: string;
}) {
  const name = input.name?.trim();
  if (!name) {
    return { error: "O nome do cliente é obrigatório" };
  }

  try {
    const client = await db.client.create({
      data: {
        name,
        active: input.active,
        contractScope: input.contractScope?.trim() || null,
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
