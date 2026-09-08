/**
 * Simula regras de acesso por cargo (sem HTTP) — smoke de papéis.
 * Uso: npx tsx scripts/smoke-roles.ts
 */
import { PrismaClient, UserType } from "@prisma/client";
import {
  canReviewDemand,
  canDemandBriefing,
  canCompleteProduction,
  canRegisterPublication,
} from "../lib/agency/labels";
import {
  getDashboardPath,
  getSectorSlugForUserType,
  isSectorCollaborator,
} from "../types/auth";
import { videoDemoMissingFields } from "../lib/agency/video-demo-briefing";

const prisma = new PrismaClient();

type Row = {
  role: string;
  email: string;
  ok: boolean;
  notes: string[];
};

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: "@samps.digital" } },
    select: {
      email: true,
      userType: true,
      name: true,
      sector: { select: { slug: true } },
    },
  });

  const rows: Row[] = [];
  const expected: Record<string, UserType> = {
    "admin@samps.digital": UserType.ADMIN,
    "gestao@samps.digital": UserType.MANAGEMENT,
    "social@samps.digital": UserType.SOCIAL_MEDIA,
    "designer@samps.digital": UserType.DESIGNER,
    "videomaker@samps.digital": UserType.VIDEOMAKER,
    "editor@samps.digital": UserType.VIDEO_EDITOR,
    "trafego@samps.digital": UserType.OTHER,
    "cliente@samps.digital": UserType.EXTERNAL_CLIENT,
  };

  for (const [email, type] of Object.entries(expected)) {
    const u = users.find((x) => x.email === email);
    const notes: string[] = [];
    let ok = true;

    if (!u) {
      rows.push({ role: type, email, ok: false, notes: ["usuário ausente no banco"] });
      continue;
    }
    if (u.userType !== type) {
      ok = false;
      notes.push(`userType=${u.userType} esperado=${type}`);
    }

    const dash = getDashboardPath(u.userType);
    notes.push(`dashboard=${dash}`);
    notes.push(`colaborador=${isSectorCollaborator(u.userType)}`);
    notes.push(`setorSlug=${getSectorSlugForUserType(u.userType) ?? "—"}`);
    notes.push(`canReview=${canReviewDemand(u.userType)}`);

    if (u.userType === UserType.EXTERNAL_CLIENT && dash !== "/portal") {
      ok = false;
      notes.push("cliente deveria ir ao portal");
    }
    if (
      isSectorCollaborator(u.userType) &&
      !dash.startsWith("/meu-painel")
    ) {
      ok = false;
      notes.push("colaborador deveria ir a meu-painel");
    }

    rows.push({ role: type, email, ok, notes });
  }

  // Ciclo de status labels
  const cycleNotes = [
    `briefing PENDING_PLANNING=${canDemandBriefing("PENDING_PLANNING")}`,
    `produce IN_PRODUCTION=${canCompleteProduction("IN_PRODUCTION")}`,
    `publish APPROVED=${canRegisterPublication("APPROVED")}`,
    `publish IN_REVIEW=${canRegisterPublication("IN_REVIEW")} (deve ser false)`,
  ];
  if (canRegisterPublication("IN_REVIEW")) {
    cycleNotes.push("ERRO: não pode publicar direto de Em revisão");
  }

  const videoCheck = videoDemoMissingFields({
    demandType: "REEL",
    durationSeconds: null,
    format: null,
  });
  const videoOk = videoDemoMissingFields({
    demandType: "REEL",
    durationSeconds: 30,
    format: "9:16",
  });

  const demands = await prisma.demand.groupBy({
    by: ["status"],
    _count: true,
  });
  const attachments = await prisma.attachment.count();
  const scores = await prisma.priorityScore.count();

  console.log(JSON.stringify({
    users: rows,
    cycle: cycleNotes,
    videoBriefingDemo: {
      missingWithoutFields: videoCheck,
      missingWithFields: videoOk,
    },
    demandStatusCounts: demands,
    attachments,
    priorityScores: scores,
    allUsersOk: rows.every((r) => r.ok),
  }, null, 2));

  if (!rows.every((r) => r.ok) || canRegisterPublication("IN_REVIEW") || videoOk.length) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
