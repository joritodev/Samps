import { db } from "@/lib/db";

export async function getAgencySettings() {
  return db.agencySettings.findUnique({ where: { id: "default" } });
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

export async function listSectors() {
  return db.sector.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function listContentTypes() {
  return db.contentType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
}

export async function listPriorities() {
  return db.priorityLevel.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
}

export async function listActivityStatuses() {
  return db.activityStatusConfig.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
}
