# Fatia 1: motor do resumo

**Spec:** seção 1 e catálogo da seção 2. **Sem schema, sem UI.** Branch: `feat/performance-resumo`.

## Contrato
`lib/agency/performance-summary.ts` (puro, sem Prisma):
- `KPI_CATALOG`: chave, rótulo, unidade (`count | percent | hours`), direção (`higher | lower`).
- `resolveComparisonRanges(range)`: devolve `{ current, previous }` com `previous` de mesma duração imediatamente antes (por dia de calendário em America/Sao_Paulo).
- `compareValue(current, previous, direction)`: `{ delta, deltaPct, trend: "better"|"worse"|"same" }`; `previous` zero ou nulo não gera percentual.
- `buildHeadline(summary)`: frase de leitura por regras.
- `buildDailySeries(rows, range)`: contagem de entregas por dia para atual e anterior.

`lib/services/performance-summary.service.ts`:
- `getPerformanceSummary({ scope: { sectorId?, userId? }, range })`: consultas agregadas (count/groupBy), sem carregar linhas de demanda; devolve indicadores com comparação, destaques (atrasadas por setor, sem responsável, ajustes, top entregadores, tipo mais lento) e série diária.
- Reaproveita `getPerformanceReport` e `performance-math`; não duplica regras de "no prazo".

## Tasks
- [ ] 1. Testes e implementação de `resolveComparisonRanges` e `compareValue` (casos: semana, mês, intervalo livre, virada de ano, fuso, `previous = 0`).
- [ ] 2. Testes e implementação do catálogo e de `buildHeadline` (melhor, pior, igual, sem dados, amostra pequena).
- [ ] 3. `buildDailySeries` com testes (dias sem entrega viram 0, fuso).
- [ ] 4. Serviço com testes do filtro de escopo e das consultas (mock de `db`, igual ao `performance.service.test.ts`).
- [ ] 5. Gates: `tsc`, `npm run lint`, `npm test`; Bugbot.

## Fora desta fatia
Tela nova (fatia 2), metas (fatia 3).
