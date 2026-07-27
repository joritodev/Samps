"use server";

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/credentials";
import { completeFirstAccess } from "@/lib/services/users.service";

export async function requestPasswordReset(email: string) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user) return { success: true };

  const token = randomBytes(32).toString("hex");
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });

  // Resend integration when RESEND_API_KEY is configured
  console.log(`Reset link: /reset-password/${token}`);
  return { success: true };
}

export async function resetPassword(token: string, password: string) {
  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: "Link inválido ou expirado." };
  }

  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, mustResetPassword: false },
    }),
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true };
}

export async function submitFirstAccess(
  userId: string,
  data: { name: string; password: string; phone?: string; termsAccepted: boolean }
) {
  try {
    await completeFirstAccess(userId, data);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao completar cadastro" };
  }
}
