import Link from "next/link";
import { UserType } from "@prisma/client";
import { BoardSettingsForm } from "@/components/board/board-settings-form";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getActiveBoardByClientId } from "@/lib/services/board.service";
import { requireClientAccess } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { redirect } from "next/navigation";

export default async function QuadroConfiguracoesPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireClientAccess(params.id);
  if (!hasPermission(user.permissions, "clients.edit")) {
    redirect(`/clientes/${params.id}/quadro`);
  }

  const board = await getActiveBoardByClientId(params.id);
  if (!board?.portal) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-muted-foreground">
          Este cliente ainda não possui quadro.
        </p>
        <Button asChild>
          <Link href={`/clientes/quadro/criar?clientId=${params.id}`}>
            Criar quadro
          </Link>
        </Button>
      </div>
    );
  }

  const config = (board.portal.config ?? {}) as {
    calendarEnabled?: boolean;
    completedVisible?: boolean;
    upcomingVisible?: boolean;
  };

  const externalUsers = await db.user.findMany({
    where: {
      userType: UserType.EXTERNAL_CLIENT,
      clientLinks: { some: { clientId: params.id, isActive: true } },
    },
    select: { id: true, name: true, email: true },
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-border bg-card px-6 py-5">
        <Link
          href={`/clientes/${params.id}/quadro`}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Quadro
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
          Configurações do quadro
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {board.client.name}
        </p>
      </header>
      <div className="p-6">
        <BoardSettingsForm
          clientId={params.id}
          boardId={board.id}
          boardName={board.name}
          portalId={board.portal.id}
          portal={{
            displayName: board.portal.displayName ?? board.client.name,
            status: board.portal.status,
            calendarEnabled: config.calendarEnabled ?? true,
            completedVisible: config.completedVisible ?? true,
            upcomingVisible: config.upcomingVisible ?? true,
          }}
          lists={board.lists.map((l) => ({
            id: l.id,
            name: l.name,
            active: l.active,
          }))}
          externalUsers={externalUsers}
        />
      </div>
    </div>
  );
}
