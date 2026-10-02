import { addDays, dayKey, endOfDayMs, startOfDayMs } from "@/lib/agency/sp-calendar";

/** Quem executa demanda vê o modal; Admin, Gestão e líderes recebem e-mail. */
const MODAL_USER_TYPES = ["SOCIAL_MEDIA", "DESIGNER", "VIDEOMAKER", "VIDEO_EDITOR", "OTHER"];

export function isDailySummaryAudience(userType: string, ledSectorCount: number): boolean {
  return MODAL_USER_TYPES.includes(userType) && ledSectorCount === 0;
}

function weekday(key: string): number {
  return new Date(`${key}T12:00:00Z`).getUTCDay();
}

/**
 * "Ontem" do resumo: o dia útil anterior. Segunda, domingo e sábado mostram
 * a sexta; os demais dias, o dia anterior.
 */
export function previousWorkday(now: Date): { key: string; from: Date; to: Date } {
  const today = dayKey(now);
  const back = { 1: 3, 0: 2, 6: 1 }[weekday(today)] ?? 1;
  const key = addDays(today, -back);
  return { key, from: new Date(startOfDayMs(key)), to: new Date(endOfDayMs(key)) };
}

export type DailyFacts = {
  completed: number;
  previousCompleted: number;
  workedSeconds: number;
};

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Frase do modal, por regras. Compara a pessoa só com ela mesma. */
export function dailyMessage(
  facts: DailyFacts,
  when: "ontem" | "na sexta" = "ontem"
): { title: string; detail: string } {
  const { completed, previousCompleted, workedSeconds } = facts;
  if (completed === 0) {
    return workedSeconds > 0
      ? { title: `Você trabalhou ${when}.`, detail: "Nenhuma entrega foi concluída, mas o tempo registrado conta." }
      : { title: "Um novo dia começa.", detail: "Veja abaixo o que pede atenção hoje." };
  }
  const base = `Você concluiu ${plural(completed, "entrega", "entregas")} ${when}.`;
  if (completed > previousCompleted) {
    return { title: `${base} Bom ritmo!`, detail: `Mais que no dia útil anterior (${previousCompleted}).` };
  }
  if (completed === previousCompleted) {
    return { title: base, detail: `Mesmo ritmo do dia útil anterior (${previousCompleted}).` };
  }
  return { title: base, detail: `No dia útil anterior foram ${previousCompleted}. Cada dia é um dia.` };
}

export function greeting(name: string, now: Date): string {
  const hourSp = (now.getUTCHours() + 21) % 24;
  const part = hourSp < 12 ? "Bom dia" : hourSp < 18 ? "Boa tarde" : "Boa noite";
  return `${part}, ${name.trim().split(/\s+/)[0] || ""}!`.replace(", !", "!");
}
