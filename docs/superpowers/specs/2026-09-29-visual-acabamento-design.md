# Samps OS — Acabamento visual ("tirar a cara de nativo")

**Data:** 2026-09-29
**Status:** fatia A implementada na branch `claude/serene-darwin-9gio0g`. As fatias B–D ficam como proposta.
**Referências:** `docs/superpowers/notas/2026-09-29-referencias-design.md`
**Relação:** complementa `2026-08-24-samps-os-visual-system-design.md` (identidade continua a mesma: Ink/Paper/Cyan/Ember, Plus Jakarta + Inter, câmera-gradiente).

---

## 1. Problema

A identidade de marca já estava no produto (etapas 0–4 da spec de 24/08), mas o **acabamento** continuava no default do shadcn: superfícies chapadas com borda cinza, KPIs em cores de alerta, CTA ciano sem contraste e enums do banco na tela. O feedback do time: "o sistema está muito nativo".

## 2. Princípios

1. **Profundidade por superfície, não por borda.** Shell → painel → card → popover, cada camada com sombra curta em camadas.
2. **Cor com significado.** Card neutro; o tom vira um ponto de cor. O número só fica vermelho ou âmbar quando é alerta.
3. **Contraste AA no CTA.** Preenchimento em teal profundo `#0B7E92` (4.75:1). O ciano vivo `#2EB5C9` fica para logo, foco, gráfico e indicador.
4. **Pílulas, não caixas.** Chips arredondados sem borda para os tons, e borda só no outline.
5. **Nenhum enum cru na UI.**
6. **Revisão consciente da spec de 24/08, §5.1.** O painel principal volta a ser **uma superfície inset** (cantos arredondados + sombra sobre o shell), como Linear, Attio e o sidebar inset do shadcn. A preocupação original era "card dentro de card". Ela continua valendo *dentro* das páginas, mas a moldura do shell não conta como card de conteúdo.

## 3. Fatia A — Fundação de acabamento (implementada)

| Área | Mudança | Arquivos |
|------|---------|----------|
| Tokens | `primary` → teal AA. Novos `--cyan` e `--shell`. `line`/`border` mais suaves. Dark recalibrado em 3 camadas (shell 5.5%, painel 8.5%, card 11%) | `app/globals.css`, `lib/theme/tokens.ts` (+ teste) |
| Elevação | `--shadow-xs/sm/md/lg` em camadas (Geist/Amie), com highlight interno no dark. Mapeadas em `shadow-*` do Tailwind, o que propaga para todos os usos existentes | `app/globals.css`, `tailwind.config.ts` |
| Tipografia | Inter com `cv02 cv03 cv04 cv11` (a de um andar, dígitos abertos). Títulos com −0.02em. Utilitários `.num` (display + tabular) e `.eyebrow` (12px) | `app/globals.css` |
| Primitivos | Button (highlight interno, `active:translate-y-px`, outline com hover de borda). Card (sombra sm). Badge (pílula h-5). Input/Select/Textarea (bg-card, shadow-xs, foco com borda teal + halo ciano). Tabs (segmentado). Table (header 12px caixa alta, célula `py-3`). Dialog/Sheet/Popover/Dropdown (raio maior, scrim com blur) | `components/ui/*` |
| Shell | Main como painel inset (`lg:m-2 rounded-xl shadow-sm`) sobre `bg-shell`. Sidebar tingida sem borda dura; item ativo = superfície branca elevada. Ícones de mural/som/sino ao lado do logo. Tagline sai da sidebar (fica no login) | `app/(agency)/layout.tsx`, `components/agency/agency-sidebar.tsx`, `components/layout/global-search.tsx` |
| KPIs | `MetricCard` neutro com ponto de tom e variante `plain`. O painel usa **uma faixa única** com hairlines (`gap-px`) | `components/agency/metric-card.tsx` (+ teste), `components/shared/metric-card.tsx` |
| Painel | Eyebrow + título 2xl. Atalhos agrupados num segmented. Alertas como lista com ícone tonal. Link "Ver quadro geral" | `app/(agency)/painel-gestao/page.tsx` |
| Cards de demanda | Prioridade com ponto de cor, cor do cliente, rótulos traduzidos, rodapé com prazo (ícone) + avatar com iniciais, hover-lift | `components/shared/demand-card.tsx`, `components/agency/demand-card.tsx` |
| Kanban | Coluna tingida com ponto de status e contador em pílula. Header sem faixa branca | `components/agency/demand-board.tsx` |
| Rótulos | `DEMAND_TYPE_LABEL`, `DEMAND_ORIGIN_LABEL` e helpers (+ teste) | `lib/agency/labels.ts` |
| Cabeçalhos | 26 telas: título `text-2xl`, sem linha divisória | `components/agency/*`, `app/(agency)/**` |
| Performance | Mini-stats sem caixa alta colando. Período selecionado com halo em vez de fundo tingido | `components/agency/performance-dashboard.tsx` |

Fora do escopo desta fatia: schema, auth, regra de negócio, portal, login.

## 4. Próximas fatias (proposta, 1 PR cada)

| Fatia | Escopo | Por quê |
|-------|--------|---------|
| **B: Boards de setor** | Aplicar o card/coluna novos a `design-board`, `social-board`, `sector-board-view`, `board-kanban`. Status com cor por coluna (ponto) em vez de ciano único | Hoje só o quadro geral recebeu a coluna nova |
| **C: Agenda e tabelas** | Cabeçalho da agenda sem divisória. Eventos do calendário em pílula com barra lateral de cor. Equipe: status como badge + ação em menu "⋯" (hoje fica empilhado). Clientes: pilha de avatares em vez de lista de nomes | Densidade e leitura rápida |
| **D: Login + portal** | Painel visual do login com composição da câmera (não só blur). Portal com a mesma elevação | Primeira impressão |
| **E: Micro-interações** | Skeletons com shimmer, transição de sheet, contagem animada no KPI (respeitando `prefers-reduced-motion`) | "Vida" sem ruído |

## 5. Critério de pronto (fatia A)

- `npx tsc --noEmit` limpo · `npm test` · `npm run lint` · `npm run build`
- Smoke visual: 8 telas × claro/escuro/mobile (390px) capturadas com Playwright contra build de produção + seed local
