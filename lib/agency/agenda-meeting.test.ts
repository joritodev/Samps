import { describe, expect, it } from "vitest";
import {
  mapMeetingsToAgendaEvents,
  parseAgendaMeetingInput,
} from "./agenda-meeting";

describe("parseAgendaMeetingInput", () => {
  it("aceita nome, horário, link e descrição", () => {
    const parsed = parseAgendaMeetingInput({
      title: "  Alinhamento semanal  ",
      description: "Pauta do comercial",
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      location: "Sala 2",
      kind: "MEETING",
      startsAt: "2026-09-28T15:00:00.000Z",
      endsAt: "2026-09-28T16:00:00.000Z",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.title).toBe("Alinhamento semanal");
    expect(parsed.value.meetingUrl).toBe("https://meet.google.com/abc-defg-hij");
    expect(parsed.value.description).toBe("Pauta do comercial");
    expect(parsed.value.endsAt?.toISOString()).toBe("2026-09-28T16:00:00.000Z");
  });

  it("recusa fim antes do início e link que não é http", () => {
    expect(
      parseAgendaMeetingInput({
        title: "Reunião",
        startsAt: "2026-09-28T16:00:00.000Z",
        endsAt: "2026-09-28T15:00:00.000Z",
      }).ok
    ).toBe(false);
    const link = parseAgendaMeetingInput({
      title: "Reunião",
      startsAt: "2026-09-28T15:00:00.000Z",
      meetingUrl: "javascript:alert(1)",
    });
    expect(link.ok).toBe(false);
  });

  it("exige nome e horário", () => {
    expect(parseAgendaMeetingInput({ title: "  ", startsAt: "" }).ok).toBe(false);
  });
});

describe("mapMeetingsToAgendaEvents", () => {
  it("projeta a reunião no calendário com link e horário", () => {
    const [event] = mapMeetingsToAgendaEvents([
      {
        id: "m1",
        title: "Podcast",
        description: "Episódio 12",
        meetingUrl: "https://zoom.us/j/1",
        location: "Remoto",
        kind: "PODCAST",
        startsAt: new Date("2026-09-28T18:30:00.000Z"),
        endsAt: new Date("2026-09-28T19:00:00.000Z"),
        createdBy: { name: "Ana" },
      },
    ]);
    expect(event.kind).toBe("meeting");
    expect(event.title).toBe("Podcast");
    expect(event.meetingUrl).toBe("https://zoom.us/j/1");
    expect(event.meetingKindLabel).toBe("Podcast");
    expect(event.assigneeName).toBe("Ana");
    expect(event.date).toBe("2026-09-28T18:30:00.000Z");
  });
});
