import { Prisma, UserType } from "@prisma/client";
import { db } from "@/lib/db";
import {
  SEARCH_TYPES,
  type SearchHit,
  type SearchType,
} from "@/lib/agency/search-types";
import { hasPermission } from "@/lib/permissions/resolve";
import type { SessionUser } from "@/types/auth";

const PER_TYPE_LIMIT = 6;

function contains(term: string): Prisma.StringFilter {
  return { contains: term, mode: "insensitive" };
}

/** `undefined` quando o usuário enxerga todos os clientes. */
function scope(user: SessionUser) {
  if (hasPermission(user.permissions, "clients.view_all")) return undefined;
  return { in: user.clientIds };
}

/** Tipos que o usuário pode pesquisar, dado o conjunto de permissões dele. */
export function allowedSearchTypes(user: { permissions: string[] }): SearchType[] {
  const canSeeClients =
    hasPermission(user.permissions, "clients.view_all") ||
    hasPermission(user.permissions, "clients.view_assigned");

  return SEARCH_TYPES.filter((type) => {
    if (type === "usuarios") return hasPermission(user.permissions, "users.edit");
    if (type === "clientes") return canSeeClients;
    return true;
  });
}

export async function globalSearch(
  user: SessionUser,
  input: { query: string; types?: SearchType[] }
): Promise<SearchHit[]> {
  const term = input.query.trim();
  if (term.length < 2) return [];

  const allowed = allowedSearchTypes(user);
  const types = (input.types?.length ? input.types : allowed).filter((type) =>
    allowed.includes(type)
  );

  const clientId = scope(user);
  const hits: SearchHit[] = [];

  const tasks: Promise<void>[] = [];

  if (types.includes("clientes")) {
    tasks.push(
      db.client
        .findMany({
          where: {
            id: clientId,
            OR: [
              { name: contains(term) },
              { tradeName: contains(term) },
              { segment: contains(term) },
            ],
          },
          select: { id: true, name: true, segment: true },
          take: PER_TYPE_LIMIT,
          orderBy: { name: "asc" },
        })
        .then((rows) => {
          for (const row of rows) {
            hits.push({
              id: row.id,
              type: "clientes",
              title: row.name,
              subtitle: row.segment,
              href: `/clientes/${row.id}`,
            });
          }
        })
    );
  }

  if (types.includes("demandas")) {
    tasks.push(
      db.demand
        .findMany({
          where: {
            clientId,
            OR: [{ title: contains(term) }, { description: contains(term) }],
          },
          select: {
            id: true,
            title: true,
            client: { select: { name: true } },
          },
          take: PER_TYPE_LIMIT,
          orderBy: { updatedAt: "desc" },
        })
        .then((rows) => {
          for (const row of rows) {
            hits.push({
              id: row.id,
              type: "demandas",
              title: row.title,
              subtitle: row.client.name,
              href: `/demandas?demanda=${row.id}`,
            });
          }
        })
    );
  }

  if (types.includes("projetos")) {
    tasks.push(
      db.project
        .findMany({
          where: {
            clientId,
            OR: [{ title: contains(term) }, { description: contains(term) }],
          },
          select: {
            id: true,
            title: true,
            client: { select: { name: true } },
          },
          take: PER_TYPE_LIMIT,
          orderBy: { updatedAt: "desc" },
        })
        .then((rows) => {
          for (const row of rows) {
            hits.push({
              id: row.id,
              type: "projetos",
              title: row.title,
              subtitle: row.client.name,
              href: `/projetos?projeto=${row.id}`,
            });
          }
        })
    );
  }

  if (types.includes("captacoes")) {
    tasks.push(
      db.shoot
        .findMany({
          where: {
            clientId,
            OR: [
              { title: contains(term) },
              { location: contains(term) },
              { notes: contains(term) },
            ],
          },
          select: {
            id: true,
            title: true,
            date: true,
            client: { select: { name: true } },
          },
          take: PER_TYPE_LIMIT,
          orderBy: { date: "desc" },
        })
        .then((rows) => {
          for (const row of rows) {
            hits.push({
              id: row.id,
              type: "captacoes",
              title: row.title,
              subtitle: `${row.client.name} · ${row.date.toLocaleDateString("pt-BR")}`,
              href: `/captacoes?captacao=${row.id}`,
            });
          }
        })
    );
  }

  if (types.includes("usuarios")) {
    tasks.push(
      db.user
        .findMany({
          where: {
            userType: { not: UserType.EXTERNAL_CLIENT },
            OR: [{ name: contains(term) }, { email: contains(term) }],
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { name: true } },
          },
          take: PER_TYPE_LIMIT,
          orderBy: { name: "asc" },
        })
        .then((rows) => {
          for (const row of rows) {
            hits.push({
              id: row.id,
              type: "usuarios",
              title: row.name,
              subtitle: `${row.role.name} · ${row.email}`,
              href: "/equipe",
            });
          }
        })
    );
  }

  if (types.includes("arquivos")) {
    tasks.push(
      db.attachment
        .findMany({
          where: {
            clientId,
            name: contains(term),
          },
          select: {
            id: true,
            name: true,
            url: true,
            fileType: true,
            client: { select: { name: true } },
          },
          take: PER_TYPE_LIMIT,
          orderBy: { createdAt: "desc" },
        })
        .then((rows) => {
          for (const row of rows) {
            hits.push({
              id: row.id,
              type: "arquivos",
              title: row.name,
              subtitle: row.client?.name ?? row.fileType,
              href: row.url,
            });
          }
        })
    );
  }

  await Promise.all(tasks);

  return hits;
}
