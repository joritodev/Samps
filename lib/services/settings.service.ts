import {
  AuditAction,
  DistributionMethod,
  type Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/services/audit.service";

export async function getAgencySettings() {
  return db.agencySettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

export async function updateAgencySettings(
  userId: string,
  data: {
    name?: string;
    logoUrl?: string | null;
    timezone?: string;
    language?: string;
    dateFormat?: string;
    workStartTime?: string;
    workEndTime?: string;
    workDays?: string;
    portalName?: string;
    portalLogoUrl?: string | null;
    portalColor?: string;
  }
) {
  const previous = await getAgencySettings();
  const updated = await db.agencySettings.update({
    where: { id: "default" },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.logoUrl !== undefined
        ? { logoUrl: data.logoUrl?.trim() || null }
        : {}),
      ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      ...(data.language !== undefined ? { language: data.language } : {}),
      ...(data.dateFormat !== undefined ? { dateFormat: data.dateFormat } : {}),
      ...(data.workStartTime !== undefined
        ? { workStartTime: data.workStartTime }
        : {}),
      ...(data.workEndTime !== undefined
        ? { workEndTime: data.workEndTime }
        : {}),
      ...(data.workDays !== undefined ? { workDays: data.workDays } : {}),
      ...(data.portalName !== undefined
        ? { portalName: data.portalName.trim() }
        : {}),
      ...(data.portalLogoUrl !== undefined
        ? { portalLogoUrl: data.portalLogoUrl?.trim() || null }
        : {}),
      ...(data.portalColor !== undefined
        ? { portalColor: data.portalColor }
        : {}),
    },
  });
  await logAudit({
    userId,
    action: AuditAction.OTHER,
    entityType: "AgencySettings",
    entityId: "default",
    previousValue: previous as unknown as Prisma.InputJsonValue,
    newValue: updated as unknown as Prisma.InputJsonValue,
    origin: "configuracoes",
  });
  return updated;
}

export async function listRoles() {
  return db.role.findMany({
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function listPermissions() {
  return db.permission.findMany({ orderBy: { name: "asc" } });
}

export async function listSectors(includeInactive = false) {
  return db.sector.findMany({
    where: includeInactive ? undefined : { isActive: true },
    include: {
      leader: { select: { id: true, name: true } },
      _count: { select: { users: true, demands: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function listContentTypes(includeInactive = false) {
  return db.contentType.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listPriorities(includeInactive = false) {
  return db.priorityLevel.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listActivityStatuses(includeInactive = false) {
  return db.activityStatusConfig.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function upsertSector(
  userId: string,
  input: {
    id?: string;
    name: string;
    slug?: string;
    color?: string | null;
    leaderId?: string | null;
    distributionMethod?: DistributionMethod;
    isActive?: boolean;
  }
) {
  const name = input.name.trim();
  const slug = (input.slug?.trim() || slugify(name)) || "setor";
  const data = {
    name,
    slug,
    color: input.color?.trim() || null,
    leaderId: input.leaderId || null,
    distributionMethod: input.distributionMethod ?? DistributionMethod.MIXED,
    isActive: input.isActive ?? true,
  };

  const row = input.id
    ? await db.sector.update({ where: { id: input.id }, data })
    : await db.sector.create({ data });

  await logAudit({
    userId,
    action: AuditAction.OTHER,
    entityType: "Sector",
    entityId: row.id,
    newValue: data,
    origin: "configuracoes/setores",
  });
  return row;
}

export async function upsertContentType(
  userId: string,
  input: {
    id?: string;
    name: string;
    slug?: string;
    sortOrder?: number;
    isActive?: boolean;
  }
) {
  const name = input.name.trim();
  const slug = (input.slug?.trim() || slugify(name)) || "tipo";
  const data = {
    name,
    slug,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
  };
  const row = input.id
    ? await db.contentType.update({ where: { id: input.id }, data })
    : await db.contentType.create({ data });
  await logAudit({
    userId,
    action: AuditAction.OTHER,
    entityType: "ContentType",
    entityId: row.id,
    newValue: data,
    origin: "configuracoes/tipos",
  });
  return row;
}

export async function upsertPriority(
  userId: string,
  input: {
    id?: string;
    name: string;
    color: string;
    weight?: number;
    sortOrder?: number;
    isActive?: boolean;
  }
) {
  const data = {
    name: input.name.trim(),
    color: input.color.trim() || "#64748b",
    weight: input.weight ?? 0,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
  };
  const row = input.id
    ? await db.priorityLevel.update({ where: { id: input.id }, data })
    : await db.priorityLevel.create({ data });
  await logAudit({
    userId,
    action: AuditAction.OTHER,
    entityType: "PriorityLevel",
    entityId: row.id,
    newValue: data,
    origin: "configuracoes/prioridades",
  });
  return row;
}

export async function upsertActivityStatus(
  userId: string,
  input: {
    id?: string;
    name: string;
    slug?: string;
    color?: string | null;
    sortOrder?: number;
    isFinal?: boolean;
    isActive?: boolean;
  }
) {
  const name = input.name.trim();
  const slug = (input.slug?.trim() || slugify(name)) || "status";
  const data = {
    name,
    slug,
    color: input.color?.trim() || null,
    sortOrder: input.sortOrder ?? 0,
    isFinal: input.isFinal ?? false,
    isActive: input.isActive ?? true,
  };
  const row = input.id
    ? await db.activityStatusConfig.update({ where: { id: input.id }, data })
    : await db.activityStatusConfig.create({ data });
  await logAudit({
    userId,
    action: AuditAction.OTHER,
    entityType: "ActivityStatusConfig",
    entityId: row.id,
    newValue: data,
    origin: "configuracoes/status",
  });
  return row;
}

export async function setCatalogActive(
  userId: string,
  kind: "sector" | "contentType" | "priority" | "status",
  id: string,
  isActive: boolean
) {
  const map = {
    sector: () => db.sector.update({ where: { id }, data: { isActive } }),
    contentType: () =>
      db.contentType.update({ where: { id }, data: { isActive } }),
    priority: () =>
      db.priorityLevel.update({ where: { id }, data: { isActive } }),
    status: () =>
      db.activityStatusConfig.update({ where: { id }, data: { isActive } }),
  } as const;

  const row = await map[kind]();
  await logAudit({
    userId,
    action: AuditAction.OTHER,
    entityType: kind,
    entityId: id,
    newValue: { isActive },
    origin: "configuracoes",
  });
  return row;
}

export async function listActiveContracts() {
  return db.contract.findMany({
    where: { status: "ACTIVE" },
    include: {
      client: { select: { id: true, name: true, status: true } },
      services: { select: { id: true, name: true, quantity: true } },
    },
    orderBy: { startDate: "desc" },
  });
}
