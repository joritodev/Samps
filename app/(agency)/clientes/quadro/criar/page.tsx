import { Suspense } from "react";
import Link from "next/link";
import { UserStatus, UserType } from "@prisma/client";
import { BoardWizard } from "@/components/board/board-wizard";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/check";

export default async function CriarQuadroPage({
  searchParams,
}: {
  searchParams: { clientId?: string };
}) {
  await requirePermission("clients.create");

  const [users, existingClient] = await Promise.all([
    db.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        userType: { not: UserType.EXTERNAL_CLIENT },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    searchParams.clientId
      ? db.client.findUnique({
          where: { id: searchParams.clientId },
          select: {
            id: true,
            name: true,
            legalName: true,
            tradeName: true,
            segment: true,
            email: true,
            phone: true,
            logoUrl: true,
            brandColor: true,
            status: true,
            startedAt: true,
            internalNotes: true,
            socialMediaId: true,
            secondarySocialMediaId: true,
            primaryResponsibleId: true,
            accountLeaderId: true,
            board: { select: { id: true } },
          },
        })
      : Promise.resolve(null),
  ]);

  if (existingClient?.board) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-muted-foreground">
          {existingClient.name} já possui um quadro interno.
        </p>
        <Button asChild>
          <Link href={`/clientes/${existingClient.id}/quadro`}>
            Abrir quadro
          </Link>
        </Button>
      </div>
    );
  }

  const initialClient = existingClient
    ? {
        id: existingClient.id,
        name: existingClient.name,
        legalName: existingClient.legalName,
        tradeName: existingClient.tradeName,
        segment: existingClient.segment,
        email: existingClient.email,
        phone: existingClient.phone,
        logoUrl: existingClient.logoUrl,
        brandColor: existingClient.brandColor,
        status: existingClient.status,
        startedAt: existingClient.startedAt,
        internalNotes: existingClient.internalNotes,
        socialMediaId: existingClient.socialMediaId,
        secondarySocialMediaId: existingClient.secondarySocialMediaId,
        primaryResponsibleId: existingClient.primaryResponsibleId,
        accountLeaderId: existingClient.accountLeaderId,
      }
    : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-border bg-card px-6 py-5">
        <Link
          href={
            existingClient
              ? `/clientes/${existingClient.id}`
              : "/clientes"
          }
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Clientes
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
          Criar quadro de cliente
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Configura o quadro interno e o portal externo em uma única operação
        </p>
      </header>

      <div className="p-6">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">Carregando…</p>
          }
        >
          <BoardWizard users={users} initialClient={initialClient} />
        </Suspense>
      </div>
    </div>
  );
}
