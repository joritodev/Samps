import {
  ClientLinkRole,
  DemandPriority,
  DemandStatus,
  WorkSector,
  UserRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

async function main() {
  const password = await bcrypt.hash("Samps@2026", 10);

  const social = await db.user.upsert({
    where: { email: "social@samps.digital" },
    update: {},
    create: {
      name: "Maria Souza",
      email: "social@samps.digital",
      password,
      role: UserRole.SOCIAL_MEDIA,
    },
  });

  const designer = await db.user.upsert({
    where: { email: "designer@samps.digital" },
    update: {},
    create: {
      name: "João Lima",
      email: "designer@samps.digital",
      password,
      role: UserRole.DESIGNER,
    },
  });

  let client = await db.client.findFirst({ where: { name: "Clínica Sorriso" } });
  if (!client) {
    client = await db.client.create({
      data: {
        name: "Clínica Sorriso",
        active: true,
      },
    });
  }

  await db.clientUser.upsert({
    where: {
      userId_clientId_linkRole: {
        userId: social.id,
        clientId: client.id,
        linkRole: ClientLinkRole.SOCIAL_MEDIA,
      },
    },
    update: {},
    create: {
      userId: social.id,
      clientId: client.id,
      linkRole: ClientLinkRole.SOCIAL_MEDIA,
    },
  });

  const existing = await db.demand.count({ where: { clientId: client.id } });
  if (existing === 0) {
    await db.demand.createMany({
      data: [
        {
          title: "Carrossel — Bastidores",
          description:
            "Criar carrossel com 5 slides mostrando os bastidores da clínica...",
          status: DemandStatus.OPEN,
          priority: DemandPriority.HIGH,
          sector: null,
          clientId: client.id,
          deadline: new Date("2026-08-15"),
        },
        {
          title: "Estático — Promoção Julho",
          description: "Arte estática para promoção de julho.",
          status: DemandStatus.OPEN,
          priority: DemandPriority.MEDIUM,
          sector: WorkSector.DESIGN,
          clientId: client.id,
          assigneeId: designer.id,
          deadline: new Date("2026-07-28"),
        },
        {
          title: "Stories — Bastidores do dia",
          description: "Três stories sequenciais.",
          status: DemandStatus.OPEN,
          priority: DemandPriority.LOW,
          sector: WorkSector.SOCIAL,
          clientId: client.id,
          deadline: new Date("2026-08-01"),
        },
      ],
    });
  }

  console.log("Seed OK — Clínica Sorriso + demandas demo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
