# Fase 3 — Operacional de setembro (escopo)

**Janela:** 19/08 → 05/09/2026
**Status deste documento:** escopo fechado. Decisões de produto em `docs/superpowers/specs/2026-08-16-fase3-gestao-agencia-design.md`. Primeira PR: `2026-08-16-fase3-0-higiene-ciclo.md`. Relatórios: `2026-08-16-fase3-1-relatorios-performance.md`.

> **Playbook (obrigatório):** `docs/superpowers/plans/2026-08-07-playbook-metodologia.md` — matriz seção 5 Fase 3.
>
> **Metodologia:** para cada fatia 3.x → confirmar pré-requisitos da Samps → `writing-plans` (Opus 5) → `subagent-driven-development` (1 PR). Fatias 3.2/3.4 exigem Security Review. Fatia 3.2 começa com brainstorming curto da opção de storage.
>
> Cada fatia abaixo recebe um plano detalhado tarefa a tarefa (no padrão da skill `writing-plans`, escrito no **Opus 5**) **imediatamente antes** de entrar em execução. Detalhar agora as sete fatias produziria código chutado, porque três delas dependem de definições que a Samps ainda vai enviar.
**Goal da fase:** o time consegue rodar o dia a dia inteiro dentro do sistema, sem WhatsApp para operação.

## Pré-requisitos

- Fases 0, 1 e 2 mergeadas
- Respostas da Samps: regras de pontuação/priorização, o que "remover a restrição" significa, categorias de vídeo usadas hoje
- Decisão sobre storage de anexos (fatia 3.2)

---

## Fatia 3.1 — Relatórios de performance por usuário e por tipo

**Pedido da reunião:** detalhamento de performance e gráficos por usuário e por tipo de demanda.

**Já existe:** `/performance`, `lib/services/indicators.service.ts`, `WorkSession` com tempo real, `DemandDelay`, `/meu-painel` por setor.

**Escopo:**
- Recorte por `ContentType` (não só por `DemandType`), porque foi isso que a reunião pediu ao falar de carrossel vs. estático vs. PDF
- Métricas por usuário: entregas no período, tempo médio real por tipo, taxa de entrega no prazo, retrabalho (contagem de `ADJUSTMENTS`)
- Métricas por tipo: volume, tempo médio, mediana, desvio — insumo para a capacidade da Fase 4
- Filtro por período, setor e cliente
- Exportação CSV

**Arquivos previstos:** `lib/services/performance.service.ts` (novo), `lib/agency/performance-math.ts` (novo, puro e testado), `app/(agency)/performance/page.tsx`, `components/agency/performance-*.tsx`

**Aceite:** um gestor consegue responder "quanto tempo em média a Maria leva num carrossel e quantos ela entregou no prazo em agosto" sem sair da tela.

**Risco:** média sobre amostra pequena engana. O plano precisa exibir o `n` junto de cada média.

---

## Fatia 3.2 — Anexos nas demandas

**Pedido da reunião:** habilitar anexo de arquivo direto na demanda, mesmo sabendo do impacto no banco.

**Já existe:** model `Attachment`, portal já lista arquivos.

**Decisão necessária antes de planejar:** onde o arquivo vive.

| Opção | Custo | Observação |
|-------|-------|------------|
| Vercel Blob | baixo, integrado | caminho mais rápido; limite de plano |
| Link do Drive apenas (sem upload) | zero | é o que já acontece hoje; não atende o pedido |
| S3/R2 | médio | mais controle, mais setup |

**Escopo (independente da opção):**
- Upload no sheet da demanda, com limite de tamanho e allowlist de extensão validados **no servidor**
- Nome de arquivo sanitizado; nunca servir arquivo por caminho controlado pelo usuário
- Visibilidade respeitando RLS: anexo interno não aparece no portal a menos que marcado como externo
- Remoção com auditoria

**Aceite:** designer anexa o PSD, social media baixa, cliente externo não vê o interno. `npm run check:rls` continua `OK`.

**Gate obrigatório:** Security Review — upload é a superfície mais perigosa de todo o projeto.

---

## Fatia 3.3 — Categorias padronizadas de vídeo e briefing obrigatório

**Pedido da reunião:** padronizar categorias de vídeo e exigir todos os campos antes de criar a demanda, para o designer não receber tarefa incompleta.

**Já existe:** `ContentType` configurável, validação de briefing obrigatório no `concluirBriefing`.

**Escopo:**
- Campos específicos por categoria de vídeo (duração, formato, legendas, referência, entrega bruta ou editada)
- Modelo de briefing por `ContentType`: quais campos são obrigatórios para cada tipo
- Bloqueio na criação e na demanda quando faltar campo obrigatório do tipo escolhido

**Depende de:** lista real de categorias que a Samps usa.

**Aceite:** ao demandar um Reels, o sistema recusa sem duração e formato; ao demandar um estático, não pede duração.

---

## Fatia 3.4 — Visibilidade das demandas para todo o time

**Pedido da reunião:** "remover a restrição" e abrir a visualização para todos, para o time enxergar o que está sendo produzido e encaixar urgências.

**Atenção:** hoje existe recorte por setor e por cliente, e existe RLS. Abrir visibilidade **não** pode virar "todo mundo vê tudo, inclusive cliente externo".

**Escopo:**
- Confirmar com a Samps o que exatamente é a restrição incômoda (provável: setor só vê a fila dele)
- Introduzir permissão explícita de leitura ampla interna (ex.: `demands.view_all_internal`), separada de escrita
- Cliente externo continua restrito pelo RLS, sem exceção
- Registrar a decisão em `docs/superpowers/notas/`

**Aceite:** designer vê a fila de vídeo em modo leitura; cliente externo continua vendo só o dele; `npm run check:rls` `OK`.

**Gate obrigatório:** Security Review.

---

## Fatia 3.5 — Regras de pontuação e priorização

**Pedido da reunião:** a Samps envia as regras; o sistema aplica.

**Já existe:** `lib/services/priority.service.ts` com `scoreDemand`, `recalculateSectorPriorities`, `getTop5ForSector`, e `/configuracoes/prioridades`.

**Escopo:**
- Traduzir as regras enviadas em pesos configuráveis (sem hardcode)
- Fórmula pura e testada em `lib/agency/priority-math.ts`
- Tela de configuração mostrando o efeito da mudança antes de salvar

**Depende de:** documento de regras da Samps. Sem ele, a fatia não entra.

---

## Fatia 3.6 — Comunicação dentro da plataforma

**Pedido da reunião:** eliminar a dependência do WhatsApp.

**Já existe:** `Comment` em demanda, `Notification` por usuário, preferências de notificação.

**Escopo desta fase (deliberadamente pequeno):**
- Menção `@usuario` no comentário gerando notificação
- Contador de não lidas visível na barra superior
- E-mail apenas para o que é urgente (evitar ruído)

**Fora de escopo:** chat em tempo real. Isso é produto novo, não ajuste.

---

## Fatia 3.7 — CSP em modo enforce

Fecha a pendência deixada na Fase 1: analisar as violações reportadas, ajustar as diretivas e trocar `Content-Security-Policy-Report-Only` por `Content-Security-Policy`, com nonce para os scripts do Next se necessário.

**Aceite:** navegação completa sem violação de CSP no console e sem tela quebrada.

---

## Critério de saída da Fase 3

1. Relatórios respondendo desempenho por usuário e por tipo, com `n` visível
2. Anexos funcionando com validação no servidor e sem vazar para o portal
3. Briefing obrigatório por categoria, incluindo vídeo
4. Visibilidade ampliada com permissão explícita e RLS intacto
5. CSP em enforce
6. `npm test`, `tsc`, `build` e `check:rls` limpos; CI verde
7. Time da Samps operando o dia a dia sem WhatsApp para demanda
