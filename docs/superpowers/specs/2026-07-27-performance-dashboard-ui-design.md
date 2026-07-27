# Performance dashboard UI — redesign

**Data:** 2026-07-27  
**Status:** aprovada; implementada em `performance-dashboard.tsx`  
**Escopo:** polish de UI/UX de `/performance` (densidade, dark theme, comparação de períodos)  
**Fora:** novas métricas, gráficos Recharts, Agenda, polish dark global em outras páginas

## Contexto

A Fatia 3 já entrega `/performance` com `getIndicators` (hoje / semana / mês) e `PerformanceDashboard` por props. A UI atual empilha três `Card` idênticos com sete `StatCard` cada — hierarquia fraca, 2ª linha incompleta, pouca comparação entre períodos e contraste fraco no dark.

## Decisões

| Tema | Decisão |
|------|---------|
| Objetivos | Densidade/hierarquia + visual dark (estilo painel-gestão) + comparação de períodos |
| Layout | Strip de resumo clicável + painel de detalhe do período selecionado |
| Strip | Por período: concluídas, em produção, atrasadas, ajustes (4 métricas) |
| Detalhe | As 7 métricas de `IndicatorSnapshot` (demandas + sessões + tempos) |
| Default | Período **Semana** selecionado ao abrir |
| Interação | Client component leve (`useState`); page server inalterada na API de dados |
| Dados | Sem inventar SLA / % / deltas vs período anterior |
| Escopo de arquivos | Principalmente `components/agency/performance-dashboard.tsx`; page só se precisar de wrapper |

## Arquitetura

```
PerformancePage (server)
  └─ getIndicators × 3 → props today, week, month
       └─ PerformanceDashboard (client)
            ├─ PeriodStrip (3 cards clicáveis)
            └─ PeriodDetail (7 métricas do período ativo)
```

- **Entrada:** `{ today, week, month }: IndicatorSnapshot` (inalterado).
- **Estado local:** `selected: "today" | "week" | "month"` (default `"week"`).
- **Sem** mudança em `getIndicators`, escopo ADMIN/MANAGEMENT, ou permissões.

## UI

### Header

Mantém título “Performance” e subtítulo sobre indicadores por período.

### PeriodStrip

- Grid responsivo: 1 coluna mobile → 3 colunas desktop.
- Cada card: label do período (Hoje / Semana / Mês) + 4 números compactos (rótulos curtos).
- Estado selecionado: borda/`ring` primary + fundo `primary/5` (dark: `primary/10`).
- Cards não selecionados: `border-border`, `bg-card`.
- Clique troca o detalhe; teclado: botão ou `role="button"` com foco visível.

### PeriodDetail

- Título do período ativo + grid das 7 métricas.
- Visual alinhado ao `Metric` do painel-gestão: `rounded-lg border`, tons por semântica:
  - concluídas → primary
  - em produção → teal/emerald
  - atrasadas / ajustes → destructive
  - sessões / tempos → default/muted
- Sem aninhar `StatCard` dentro de `Card` grosso (evita “card dentro de card”).
- Grid detalhe: 2 cols mobile → 4 cols desktop (última linha com 3 itens ok; espaçamento uniforme).

### Tempos

Continua formatando segundos → `Xh` com 1 casa decimal (função `hours` existente). Sem texto de tendência.

## Dark theme

- Preferir tokens (`bg-card`, `border-border`, `text-muted-foreground`, `text-foreground`, `primary`, `destructive`).
- Tons de alerta/sucesso com variantes `dark:` como no painel-gestão (bordas semitransparentes + fundo tintado leve).
- Evitar magenta/rosa forte só no light; `primary` do tema cuida dos dois modos.

## Aceite

1. Abrir `/performance` → strip com 3 períodos; **Semana** selecionada.
2. Clicar Hoje / Mês → detalhe atualiza sem reload.
3. Strip mostra só 4 métricas de demanda; detalhe mostra 7.
4. Dark mode: números e bordas legíveis (sem card “lavado”).
5. Sem 87%, 3,4 dias, gráficos mock ou deltas inventados.
6. `npx tsc --noEmit` sem erros novos nestes arquivos.

## Relação com Fatia 3

Complementa a spec `2026-07-27-fatia3-trafego-performance-design.md` (dados reais). Não reabre tráfego/sidebar/seed.
