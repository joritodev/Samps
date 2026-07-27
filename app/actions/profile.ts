"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentAgencyUser } from "@/lib/agency/current-user";
import { db } from "@/lib/db";

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe pelo menos 2 caracteres."),
  email: z.string().trim().email("E-mail inválido."),
  avatar: z.string().trim(),
  password: z.string(),
}).superRefine((data, ctx) => {
  if (data.avatar && !/^https?:\/\//i.test(data.avatar)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "URL de avatar inválida.",
      path: ["avatar"],
    });
  }
  if (data.password && data.password.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A senha deve ter pelo menos 8 caracteres.",
      path: ["password"],
    });
  }
});

export type UpdateProfileState = {
  error?: string;
  success?: boolean;
};

export async function updateCurrentUser(
  _prev: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const current = await getCurrentAgencyUser();
  if (!current) {
    return { error: "Usuário da sessão não encontrado. Rode o seed." };
  }

  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    avatar: formData.get("avatar") ?? "",
    password: formData.get("password") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, avatar, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const emailTaken = await db.user.findFirst({
    where: {
      email: normalizedEmail,
      NOT: { id: current.id },
    },
    select: { id: true },
  });

  if (emailTaken) {
    return { error: "Este e-mail já está em uso." };
  }

  try {
    await db.user.update({
      where: { id: current.id },
      data: {
        name,
        email: normalizedEmail,
        avatar: avatar ? avatar : null,
        ...(password
          ? { password: await bcrypt.hash(password, 12) }
          : {}),
      },
    });

    revalidatePath("/perfil");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("updateCurrentUser", error);
    return { error: "Não foi possível salvar o perfil." };
  }
}
