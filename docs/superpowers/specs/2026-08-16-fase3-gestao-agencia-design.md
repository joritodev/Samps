# Spec — Samps OS como app de gestão da agência (Fase 3)

**Data:** 2026-08-16  
**Status:** decisões fechadas (não é SaaS, não é app genérico)  
**Contexto:** produto interno da Samps Digital. Time opera demanda, contrato, produção e portal do cliente. Setembro = o dia a dia cabe no sistema.

Este documento trava as escolhas. Fatias de código saem daqui, uma PR por vez.

---

## 1. O que este app é

Um **sistema operacional de uma agência**, com regras da Samps: contrato gera cartão, briefing trava, cronômetro mede produção, Drive registra entrega, portal mostra o que a equipe libera.

Não é CRM white-label, não é Trello, não é produto para vender em 2026.

## 2. Decisões travadas

| Tema | Escolha | Por quê neste app |
|------|---------|-------------------|
| Backend | Continuar Next.js + Server Actions | Um time, um deploy, setembro. NestJS é outro produto. |
| Multi-tenant | Não | Isolamento hoje é por cliente da Samps (RLS), não por agência compradora. |
| Shell canônico | `app/(agency)` | `(app)` é casca paralela. Feature nova só na agency. |
| Ciclo da demanda | Status Prisma é a lei; coluna é visual | Personalizar quadro (Fase 4) não pode inventar etapa. |
| UI e servidor | A mesma regra | `canDemandBriefing` / `canCompleteProduction` / `canRequestAdjustment` / `canRegisterPublication` valem nos services. |
| Tipo que o time vê | `ContentType` (catálogo) | “Carrossel vs estático vs Reels” é o vocabulário da reunião. `DemandType` fica interno (fila FEED/STORY/REEL). |
| O que é entrega | `productionCompletedAt` no período | Alinha com cronômetro e “concluir produção”. Publicação é outra métrica, não o KPI de produtividade. |
| Quem vê relatório | Gestão/admin: org. Colaborador: só o próprio | Painel de gestão personalizado, não ranking público forçado. |
| Período | Presets hoje/semana/mês + de–até | Gestão pergunta “agosto” e “esses 10 dias”. |
| Relatório | Expandir `/performance` (opção A) | Uma rota, permissão `productivity.view` já existe. |
| Atraso no relatório | Derivado (`productionCompletedAt` vs `dueDate`) | Não usar `DemandStatus.OVERDUE` como etapa. Não migrar enum agora. |
| Amostra | Sempre mostrar `n`. Aviso se `n < 3` | Média de 1 carrossel mente na reunião. |
| Sem tipo | Bucket “Sem tipo” | Honestidade. Some quando a geração copiar `contentTypeId`. |
| Gráfico | Tabela + barras simples na aba tipo; CSV da aba ativa | Aceite é a pergunta da Maria, não dashboard de BI. |
| Anexos (depois) | Link Drive como anexo de verdade + visibilidade portal | A agência já vive no Drive. Blob/S3 só se o dia a dia exigir arquivo binário. |
| Visibilidade aberta / pontuação / briefing de vídeo | Esperar a Samps | Chutar regra de permissão ou formulário de Reels quebra o personalizado. |
| WhatsApp | `@menção` + não lidas **depois** do relatório | Barato e cabe no Comment que já existe. Sem chat. |
| Next 16 | Depois de setembro operacional | Major no meio do uso quebra o time. |
| CSP enforce | Fatia própria no fim da Fase 3 | Não misturar com métrica. |

## 3. Ordem de execução (Fase 3)

1. **Fatia 3.0 — Higiene do ciclo** (esta vem primeiro): gates no servidor, `briefingLockedAt` no board, `contentTypeId` na geração contratual, `getIndicators` usa a mesma definição de entrega.  
2. **Fatia 3.1 — Relatórios em `/performance`**: abas Resumo / Por pessoa / Por tipo, filtros, CSV.  
3. **Fatia 3.6 — Menções** (comunicação mínima).  
4. **Fatia 3.2 — Anexos** (Drive-first), com Security Review.  
5. **3.7 CSP**; **3.3 / 3.4 / 3.5** só com input da Samps.

## 4. Fora desta spec

- Colunas personalizadas, capacidade 8h, agenda organizacional (Fase 4)  
- IA em produção, PWA/app nativo, SaaS (Fase 5 — docs já existem)  
- Unificar as três permissões `indicators` / `productivity` / `reports` (dívida; não nesta fatia)  
- Apagar o grupo de rotas `(app)` inteiro (redirects pontuais na 3.0 se cruzar; remoção total depois)

## 5. Aceite da 3.0

- Concluir produção / solicitar ajuste / registrar publicação recusados no servidor fora do status certo, com a mesma mensagem da UI.  
- Cartão gerado do contrato nasce com `contentTypeId` do `ContractService`.  
- Card de Resumo em `/performance` conta entregas por `productionCompletedAt`, não por `updatedAt` + DONE/PUBLISHED/IN_REVIEW.  
- Board da agency passa `briefingLockedAt` para `canDemandBriefing`.

## 6. Aceite da 3.1

Gestor responde, sem sair de `/performance`: “quantas entregas a Maria fez no período, tempo médio real por ContentType, % no prazo, retrabalho; e o mesmo recorte por tipo (volume, média, mediana, desvio, n)”. Colaborador sem gestão só vê a própria linha. CSV baixa a aba visível.
