import {
  ClientLinkRole,
  DemandPriority,
  DemandStatus,
  PrismaClient,
  UserRole,
  WorkSector,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "Samps@2026";

function daysAgo(days: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function daysFromNow(days: number, hour = 18) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Limpando tabelas…");

  // Ordem de dependências (filhos → pais)
  await prisma.demand.deleteMany();
  await prisma.clientUser.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  console.log("Criando usuários…");
  const password = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const [gestor, social, designer] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Ana Carolina",
        email: "gestao@samps.digital",
        password,
        role: UserRole.MANAGER,
      },
    }),
    prisma.user.create({
      data: {
        name: "Maria Souza",
        email: "social@samps.digital",
        password,
        role: UserRole.SOCIAL_MEDIA,
      },
    }),
    prisma.user.create({
      data: {
        name: "João Lima",
        email: "designer@samps.digital",
        password,
        role: UserRole.DESIGNER,
      },
    }),
  ]);

  console.log("Criando clientes…");
  const [sorriso, bella] = await Promise.all([
    prisma.client.create({
      data: { name: "Clínica Sorriso", active: true },
    }),
    prisma.client.create({
      data: { name: "Bella Clinic", active: true },
    }),
  ]);

  console.log("Vinculando Social Media aos clientes…");
  await prisma.clientUser.createMany({
    data: [
      {
        userId: social.id,
        clientId: sorriso.id,
        linkRole: ClientLinkRole.SOCIAL_MEDIA,
      },
      {
        userId: social.id,
        clientId: bella.id,
        linkRole: ClientLinkRole.SOCIAL_MEDIA,
      },
    ],
  });

  console.log("Criando demandas…");

  type SeedDemand = {
    title: string;
    description?: string;
    status: DemandStatus;
    priority: DemandPriority;
    sector: WorkSector | null;
    clientId: string;
    assigneeId?: string | null;
    materialUrl?: string | null;
    publishedUrl?: string | null;
    visibleToClient?: boolean;
    createdAt: Date;
    deadline: Date | null;
    updatedAt?: Date;
  };

  const demands: SeedDemand[] = [
    // ── OPEN — briefing / quadro da Social ─────────────────────────────────
    {
      title: "Carrossel — cuidados pós-clareamento",
      description: undefined,
      status: DemandStatus.OPEN,
      priority: DemandPriority.HIGH,
      sector: null,
      clientId: sorriso.id,
      createdAt: daysAgo(1),
      deadline: daysFromNow(5),
    },
    {
      title: "Stories — agenda da semana",
      status: DemandStatus.OPEN,
      priority: DemandPriority.MEDIUM,
      sector: WorkSector.SOCIAL,
      clientId: sorriso.id,
      createdAt: daysAgo(2),
      deadline: daysFromNow(2),
    },
    {
      title: "Feed — promoção harmonização",
      status: DemandStatus.OPEN,
      priority: DemandPriority.MEDIUM,
      sector: null,
      clientId: bella.id,
      createdAt: daysAgo(0, 9),
      deadline: daysFromNow(7),
    },

    // ── AVAILABLE — Kanban Design ──────────────────────────────────────────
    {
      title: "Carrossel institucional Bella",
      description: "Tom clean, rosa suave, 5 slides. CTA: agendar avaliação.",
      status: DemandStatus.AVAILABLE,
      priority: DemandPriority.HIGH,
      sector: WorkSector.DESIGN,
      clientId: bella.id,
      createdAt: daysAgo(3),
      deadline: daysFromNow(1),
    },
    {
      title: "Estático — antes e depois ortodontia",
      description: "Layout vertical 1080x1350. Sem texto excessivo.",
      status: DemandStatus.AVAILABLE,
      priority: DemandPriority.MEDIUM,
      sector: WorkSector.DESIGN,
      clientId: sorriso.id,
      createdAt: daysAgo(4),
      deadline: daysFromNow(3),
    },
    {
      title: "Thumbnails YouTube — série Q3",
      description: "3 thumbs com tipografia forte.",
      status: DemandStatus.AVAILABLE,
      priority: DemandPriority.LOW,
      sector: WorkSector.DESIGN,
      clientId: bella.id,
      createdAt: daysAgo(5),
      deadline: daysFromNow(10),
    },

    // ── IN_PRODUCTION — designer atribuído ─────────────────────────────────
    {
      title: "Reels — rotina de higiene oral",
      description: "Hook nos 3s, CTA no final. Arte + legendas.",
      status: DemandStatus.IN_PRODUCTION,
      priority: DemandPriority.URGENT,
      sector: WorkSector.DESIGN,
      clientId: sorriso.id,
      assigneeId: designer.id,
      createdAt: daysAgo(6),
      deadline: daysAgo(1), // atrasada → Painel Gestão
    },
    {
      title: "Banner campanha Black Friday estética",
      description: "Formato feed + stories.",
      status: DemandStatus.IN_PRODUCTION,
      priority: DemandPriority.HIGH,
      sector: WorkSector.DESIGN,
      clientId: bella.id,
      assigneeId: designer.id,
      createdAt: daysAgo(4, 14),
      deadline: daysFromNow(0),
    },
    {
      title: "Edição — depoimento paciente",
      description: "Corte vertical 30–45s, legendas em PT.",
      status: DemandStatus.IN_PRODUCTION,
      priority: DemandPriority.MEDIUM,
      sector: WorkSector.VIDEO,
      clientId: sorriso.id,
      assigneeId: designer.id,
      createdAt: daysAgo(5, 11),
      deadline: daysFromNow(2),
    },

    // ── IN_REVIEW — material entregue ──────────────────────────────────────
    {
      title: "Carrossel — cultura organizacional",
      description: "6 slides aprovados no briefing. Material no Drive.",
      status: DemandStatus.IN_REVIEW,
      priority: DemandPriority.HIGH,
      sector: WorkSector.DESIGN,
      clientId: sorriso.id,
      assigneeId: designer.id,
      materialUrl: "https://drive.google.com/demo/sorriso-cultura",
      createdAt: daysAgo(7),
      deadline: daysAgo(2),
      updatedAt: daysAgo(0, 15),
    },
    {
      title: "Stories — bastidores da clínica",
      description: "Sequência de 4 frames.",
      status: DemandStatus.IN_REVIEW,
      priority: DemandPriority.MEDIUM,
      sector: WorkSector.SOCIAL,
      clientId: bella.id,
      assigneeId: designer.id,
      materialUrl: "https://drive.google.com/demo/bella-bastidores",
      visibleToClient: true,
      createdAt: daysAgo(3, 16),
      deadline: daysFromNow(1),
      updatedAt: daysAgo(0, 12),
    },

    // ── APPROVED — fila Social publicar ────────────────────────────────────
    {
      title: "Feed — lançamento linha premium",
      description: "Arte aprovada. Publicar terça 18h.",
      status: DemandStatus.APPROVED,
      priority: DemandPriority.HIGH,
      sector: WorkSector.SOCIAL,
      clientId: bella.id,
      assigneeId: designer.id,
      materialUrl: "https://drive.google.com/demo/bella-premium",
      visibleToClient: true,
      createdAt: daysAgo(6, 9),
      deadline: daysFromNow(1),
      updatedAt: daysAgo(1, 17),
    },
    {
      title: "Carrossel — mitos sobre clareamento",
      description: "Pronto para postagem.",
      status: DemandStatus.APPROVED,
      priority: DemandPriority.MEDIUM,
      sector: WorkSector.DESIGN,
      clientId: sorriso.id,
      assigneeId: designer.id,
      materialUrl: "https://drive.google.com/demo/sorriso-mitos",
      visibleToClient: true,
      createdAt: daysAgo(5, 8),
      deadline: daysFromNow(0),
      updatedAt: daysAgo(0, 18),
    },

    // ── DONE / PUBLISHED — volume no Painel Gestão ─────────────────────────
    {
      title: "Stories — tip da semana (arquivado)",
      status: DemandStatus.DONE,
      priority: DemandPriority.LOW,
      sector: WorkSector.SOCIAL,
      clientId: sorriso.id,
      assigneeId: designer.id,
      materialUrl: "https://drive.google.com/demo/sorriso-tip",
      visibleToClient: true,
      createdAt: daysAgo(8),
      deadline: daysAgo(4),
      updatedAt: daysAgo(3, 16),
    },
    {
      title: "Reels — bastidores Bella",
      status: DemandStatus.PUBLISHED,
      priority: DemandPriority.MEDIUM,
      sector: WorkSector.VIDEO,
      clientId: bella.id,
      assigneeId: designer.id,
      materialUrl: "https://drive.google.com/demo/bella-reels",
      publishedUrl: "https://instagram.com/p/demo-bella-reels",
      visibleToClient: true,
      createdAt: daysAgo(9),
      deadline: daysAgo(5),
      updatedAt: daysAgo(2, 19),
    },
    {
      title: "Feed — equipe Bella Clinic",
      status: DemandStatus.PUBLISHED,
      priority: DemandPriority.MEDIUM,
      sector: WorkSector.DESIGN,
      clientId: bella.id,
      assigneeId: designer.id,
      materialUrl: "https://drive.google.com/demo/bella-equipe",
      publishedUrl: "https://instagram.com/p/demo-bella-equipe",
      visibleToClient: true,
      createdAt: daysAgo(10),
      deadline: daysAgo(6),
      updatedAt: daysAgo(1, 11),
    },
    {
      title: "Carrossel — FAQ odontológico",
      status: DemandStatus.DONE,
      priority: DemandPriority.LOW,
      sector: WorkSector.DESIGN,
      clientId: sorriso.id,
      assigneeId: designer.id,
      materialUrl: "https://drive.google.com/demo/sorriso-faq",
      visibleToClient: true,
      createdAt: daysAgo(11),
      deadline: daysAgo(7),
      updatedAt: daysAgo(4, 10),
    },
    {
      title: "Stories — promoção avaliação",
      status: DemandStatus.PUBLISHED,
      priority: DemandPriority.HIGH,
      sector: WorkSector.SOCIAL,
      clientId: bella.id,
      assigneeId: social.id,
      materialUrl: "https://drive.google.com/demo/bella-promo",
      publishedUrl: "https://instagram.com/stories/demo-promo",
      visibleToClient: true,
      createdAt: daysAgo(4, 7),
      deadline: daysAgo(1),
      updatedAt: daysAgo(0, 20),
    },
  ];

  for (const demand of demands) {
    const { createdAt, updatedAt, ...rest } = demand;
    await prisma.demand.create({
      data: {
        ...rest,
        createdAt,
        updatedAt: updatedAt ?? createdAt,
      },
    });
  }

  console.log("Seed concluído.");
  console.log(`  Usuários: ${gestor.email}, ${social.email}, ${designer.email}`);
  console.log(`  Senha padrão: ${DEFAULT_PASSWORD}`);
  console.log(`  Clientes: ${sorriso.name}, ${bella.name}`);
  console.log(`  Demandas: ${demands.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/*
 * ── Como rodar o seed ──────────────────────────────────────────────────────
 *
 * 1) No package.json (já configurado neste projeto):
 *
 *    "prisma": {
 *      "seed": "tsx prisma/seed.ts"
 *    }
 *
 *    Alternativa com ts-node:
 *    "prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }
 *
 * 2) Script npm opcional:
 *    "db:seed": "tsx prisma/seed.ts"
 *
 * 3) Executar:
 *    npx prisma db seed
 *    # ou
 *    npm run db:seed
 *
 * O script faz deleteMany antes de popular — pode rodar quantas vezes quiser
 * sem duplicar dados.
 */
