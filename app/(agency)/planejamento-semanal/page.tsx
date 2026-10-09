import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions/check";
import { getSectorSlugForUserType } from "@/types/auth";

/** Entrada do menu: leva ao quadro do setor da pessoa (gestão e demais caem em Vídeo). */
export default async function PlanningIndexPage() {
  const user = await requirePermission("planning.view");
  const own = getSectorSlugForUserType(user.userType);
  redirect(`/planejamento-semanal/${own === "design" ? "design" : "video"}`);
}
