import { ClientPortalView } from "@/components/portal/client-portal-view";
import type { ClientPortalOverview } from "@/types/portal-ui";

/** Mock tipado — espelho seguro. Sem atrasos, responsáveis ou comentários internos. */
function getMockPortal(clientId: string): ClientPortalOverview {
  return {
    clientId,
    clientName: "Clínica Sorriso",
    competenceLabel: "Julho/2026",
    stats: {
      planned: 12,
      inProduction: 4,
      published: 8,
    },
    materials: [
      {
        id: "m1",
        title: "Carrossel — cuidados pós-clareamento",
        format: "Feed · Carrossel",
        scheduledDate: "2026-07-28T12:00:00.000Z",
        status: "AWAITING_APPROVAL",
        materialUrl: "https://example.com/materiais/clareamento",
      },
      {
        id: "m2",
        title: "Reels — rotina de higiene oral",
        format: "Reels",
        scheduledDate: "2026-07-30T12:00:00.000Z",
        status: "IN_PRODUCTION",
        materialUrl: null,
      },
      {
        id: "m3",
        title: "Stories — depoimento paciente",
        format: "Stories",
        scheduledDate: "2026-07-22T12:00:00.000Z",
        status: "PUBLISHED",
        materialUrl: "https://example.com/materiais/depoimento",
      },
    ],
  };
}

export default function PortalClientPage({
  params,
}: {
  params: { clientId: string };
}) {
  const data = getMockPortal(params.clientId);

  return <ClientPortalView data={data} />;
}
