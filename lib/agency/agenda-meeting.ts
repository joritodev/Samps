import type { AgendaEvent } from "./agenda-events";

export const AGENDA_MEETING_KINDS = ["MEETING", "PODCAST", "OTHER"] as const;

export type AgendaMeetingKind = (typeof AGENDA_MEETING_KINDS)[number];

export const AGENDA_MEETING_KIND_LABEL: Record<AgendaMeetingKind, string> = {
  MEETING: "Reunião",
  PODCAST: "Podcast",
  OTHER: "Compromisso",
};

export type AgendaMeetingInput = {
  title: string;
  description?: string | null;
  meetingUrl?: string | null;
  location?: string | null;
  kind?: string | null;
  startsAt: string;
  endsAt?: string | null;
};

export type AgendaMeetingDraft = {
  title: string;
  description: string | null;
  meetingUrl: string | null;
  location: string | null;
  kind: AgendaMeetingKind;
  startsAt: Date;
  endsAt: Date | null;
};

function clean(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseAgendaMeetingInput(
  input: AgendaMeetingInput
): { ok: true; value: AgendaMeetingDraft } | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Informe o nome da reunião." };
  if (title.length > 140) {
    return { ok: false, error: "O nome pode ter no máximo 140 caracteres." };
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: "Informe o horário de início." };
  }

  const endsRaw = clean(input.endsAt);
  const endsAt = endsRaw ? new Date(endsRaw) : null;
  if (endsRaw && (!endsAt || Number.isNaN(endsAt.getTime()))) {
    return { ok: false, error: "O horário de fim é inválido." };
  }
  if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
    return { ok: false, error: "O fim precisa ser depois do início." };
  }

  const description = clean(input.description);
  if (description && description.length > 4000) {
    return { ok: false, error: "A descrição pode ter no máximo 4000 caracteres." };
  }

  const location = clean(input.location);
  if (location && location.length > 200) {
    return { ok: false, error: "O local pode ter no máximo 200 caracteres." };
  }

  const meetingUrl = clean(input.meetingUrl);
  if (meetingUrl && (meetingUrl.length > 500 || !isHttpUrl(meetingUrl))) {
    return {
      ok: false,
      error: "O link da reunião precisa começar com http:// ou https://.",
    };
  }

  const kindRaw = input.kind?.trim() || "MEETING";
  if (!AGENDA_MEETING_KINDS.includes(kindRaw as AgendaMeetingKind)) {
    return { ok: false, error: "Tipo de compromisso inválido." };
  }

  return {
    ok: true,
    value: {
      title,
      description,
      meetingUrl,
      location,
      kind: kindRaw as AgendaMeetingKind,
      startsAt,
      endsAt,
    },
  };
}

export type AgendaMeetingSource = {
  id: string;
  title: string;
  description: string | null;
  meetingUrl: string | null;
  location: string | null;
  kind: AgendaMeetingKind | string;
  startsAt: Date;
  endsAt: Date | null;
  createdBy: { name: string };
};

export function mapMeetingsToAgendaEvents(
  meetings: AgendaMeetingSource[]
): AgendaEvent[] {
  return meetings.map((meeting) => {
    const kind = AGENDA_MEETING_KINDS.includes(meeting.kind as AgendaMeetingKind)
      ? (meeting.kind as AgendaMeetingKind)
      : "OTHER";
    return {
      id: `meeting:${meeting.id}`,
      demandId: null,
      title: meeting.title,
      clientId: null,
      clientName: "Equipe",
      sectorId: null,
      sectorSlug: null,
      sectorName: null,
      kind: "meeting",
      date: meeting.startsAt.toISOString(),
      endsAt: meeting.endsAt?.toISOString() ?? null,
      status: kind,
      assigneeName: meeting.createdBy.name,
      description: meeting.description,
      meetingUrl: meeting.meetingUrl,
      location: meeting.location,
      meetingKindLabel: AGENDA_MEETING_KIND_LABEL[kind],
    };
  });
}
