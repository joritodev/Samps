# Relatório — preparação para teste da empresa

**Data:** 2026-09-08  
**Modo:** AUTO  
**Objetivo:** deixar o Samps OS pronto para refinamento pela Samps (não go-live).

## Como foi feito

1. Mapeamento do roadmap vs código (criar demanda, menções, visual, performance já mergeados).
2. Suite local: `tsc`, `vitest`, `lint`, `build`.
3. Demos onde falta input oficial da Samps (3.2/3.3/3.4/3.5).
4. Script `scripts/prepare-test-demo-data.ts` (enriquece banco sem wipe).
5. Script `scripts/smoke-roles.ts` (8 cargos + regras de ciclo).
6. Seed atualizado para re-seed futuro consistente.

## Resultados da suíte

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | OK |
| `npm test` | 140/140 (42 arquivos) — flaky agenda timeout corrigido |
| `npm run lint` | OK |
| `npm run build` | OK |
| Smoke 8 cargos | OK |
| Prepare demo data | 6 anexos, 8 tipos vídeo demo, Top 5 em 4 setores |

## Simulação por cargo

| Usuário | Dashboard | Operação esperada | Smoke |
|---------|-----------|-------------------|-------|
| `gestao@` | `/painel-gestao` | criar/atribuir/aprovar/publicar | OK |
| `social@` | `/meu-painel/social` | criar + briefing + revisão | OK |
| `designer@` | `/meu-painel/design` | assumir → produzir → revisão | OK |
| `videomaker@` / `editor@` | `/meu-painel/video` | ciclo vídeo | OK |
| `trafego@` | `/meu-painel/trafego` | fila tráfego | OK |
| `admin@` | `/painel-gestao` | permissão total | OK |
| `cliente@` | `/portal` | só portal Bella | OK |

**Ciclo de status validado no smoke:** briefing em planejamento; produção em `IN_PRODUCTION`; publicar só em `APPROVED`/`SCHEDULED` (não em `IN_REVIEW`).

## Demos criados (aguardando resposta oficial)

| Fatia | Demo entregue | Ainda precisa da Samps |
|-------|---------------|-------------------------|
| **3.2 Anexos** | Link Drive/Figma no sheet + portal com URL; seed/prepare com 6 anexos | Decisão upload (Blob/S3) + Security Review |
| **3.3 Vídeo** | 8 categorias `(demo)` + briefing exige duração + orientação | Lista oficial + campos por categoria |
| **3.4 Visibilidade** | Colaborador vê `/setores/*` em **somente leitura** | Confirmar se leitura ampla é o pedido real |
| **3.5 Pontuação** | Fórmula provisória + Top 5 recalculado no prepare/seed | Documento de pesos da Samps |

## Telas / gaps restantes

| Item | Estado |
|------|--------|
| Filtros em `/demandas` | Stub “em breve” |
| Upload binário de arquivo | Não (só link) |
| CSP enforce | Não (3.7) |
| Sorriso sem portal | Intencional — portal demo = Bella |
| Dual `/calendario` vs `/agenda` | Legacy paralelo, não bloqueia teste |
| `mustResetPassword` | false nas seeds — login direto |

## Erros encontrados e correções

1. **Vitest:** `AgendaView` timeout 5s → timeout 15s (flaky em Windows).
2. **Portal `/arquivos`:** listava sem link → agora abre URL.
3. **Anexos = 0 no banco** → prepare criou 6 links demo.
4. **Colaborador bloqueado em `/setores`** → leitura demo 3.4.
5. **Briefing de vídeo** não persistia duração → wired + validação demo.

## Como a empresa testa agora

1. URL: https://samps-os.vercel.app (após deploy deste branch/commit).
2. Contas: ver `2026-09-04-acessos-temporarios-teste.md` (senha `Samps@2026`).
3. Ciclo mínimo: criar demanda → briefing → assumir → material (link) → revisão → publicar.
4. Extra: `/configuracoes/tipos` (categorias demo); portal `/portal/arquivos`; `/setores/video` como designer (leitura).

## Comandos locais úteis

```bash
npx tsx scripts/prepare-test-demo-data.ts
npx tsx scripts/smoke-roles.ts
npm test && npx tsc --noEmit && npm run build
```

**Atenção:** não rodar `db:seed` em produção sem acordo — wipe total. Preferir `prepare-test-demo-data.ts`.
