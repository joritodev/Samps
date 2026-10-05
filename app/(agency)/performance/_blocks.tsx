import { Suspense, type ReactNode } from "react";
import { GoalsStrip } from "@/components/performance/goals-strip";
import { ObjectivesStrip } from "@/components/performance/objectives-strip";
import { QuarterHistory } from "@/components/performance/quarter-history";
import { getQuarterHistory, type SummaryScope } from "@/lib/services/performance-summary.service";
import type { SessionUser } from "@/types/auth";
import { agencyObjectives, goalsForScope } from "./_goals";

/**
 * Blocos da Visão geral que dependem das tabelas de metas e OKRs e do
 * histórico. Cada um carrega por conta própria, depois do resto da tela: se um
 * falhar (banco lento, tabela ausente), a tela principal continua de pé e o
 * erro vai para o log com o nome do bloco.
 */
async function Safe({ label, children }: { label: string; children: () => Promise<ReactNode> }): Promise<JSX.Element> {
  try {
    return <>{await children()}</>;
  } catch (error) {
    console.error(`[performance] bloco "${label}" falhou`, error);
    return (
      <p role="status" className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        Não foi possível carregar {label} agora. O resto da página segue funcionando.
      </p>
    );
  }
}

function Placeholder({ label }: { label: string }) {
  return (
    <div aria-busy="true" className="h-28 animate-pulse rounded-xl border border-border/60 bg-card/60" role="status">
      <span className="sr-only">Carregando {label}…</span>
    </div>
  );
}

function Block({ label, children }: { label: string; children: () => Promise<ReactNode> }) {
  return (
    <Suspense fallback={<Placeholder label={label} />}>
      <Safe label={label}>{children}</Safe>
    </Suspense>
  );
}

export function ObjectivesBlock({ user, scope }: { user: SessionUser; scope: SummaryScope }) {
  return (
    <Block label="os objetivos">
      {async () => <ObjectivesStrip objectives={await agencyObjectives(user, scope)} />}
    </Block>
  );
}

export function GoalsBlock({ user, scope }: { user: SessionUser; scope: SummaryScope }) {
  return (
    <Block label="as metas">{async () => <GoalsStrip goals={await goalsForScope(user, scope)} />}</Block>
  );
}

export function QuarterHistoryBlock({ scope }: { scope: SummaryScope }) {
  return (
    <Block label="o histórico por trimestre">
      {async () => <QuarterHistory rows={await getQuarterHistory(scope)} />}
    </Block>
  );
}
