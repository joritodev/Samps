import { DailySummaryModal } from "@/components/performance/daily-summary-modal";
import { getSessionUser } from "@/lib/permissions/check";
import { getDailySummaryForModal } from "@/lib/services/daily-summary.service";

/**
 * Entra no layout dentro de `Suspense`: só consulta quem está no público e
 * ainda não viu hoje; qualquer falha deixa a página seguir sem o modal.
 */
export async function DailySummaryGate() {
  try {
    const user = await getSessionUser();
    if (!user) return null;
    const content = await getDailySummaryForModal(user);
    return content ? <DailySummaryModal content={content} /> : null;
  } catch (error) {
    console.error("daily summary", error);
    return null;
  }
}
