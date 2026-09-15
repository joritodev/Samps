import { db } from "@/lib/db";

export async function listLedSectorIds(userId: string): Promise<string[]> {
  const rows = await db.sector.findMany({
    where: { leaderId: userId, isActive: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
