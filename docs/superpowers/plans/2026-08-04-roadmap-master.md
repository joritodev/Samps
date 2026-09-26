# Samps OS — Roadmap Master (ago → set 2026)

**Data:** 2026-08-04 (estado de execução atualizado em 2026-09-15)
**Origem:** reunião Samps Digital 28/07/2026 + backlog técnico pendente
**Meta do cliente:** time testando em agosto, sistema operacional em setembro
**Próxima reunião:** a combinar (demo 18/08 feita; roteiro em `docs/superpowers/notas/2026-08-27-roteiro-reuniao.md`)

Este documento é o índice do **o quê** e da **ordem**.  
**Como executar** (skills, SDD vs execução direta, modelos, gates, prompts) está em:

→ **`docs/superpowers/plans/2026-08-07-playbook-metodologia.md`** ← leia antes de qualquer sessão de implementação.

Cada fase tem um plano próprio em `docs/superpowers/plans/`.  
Nenhuma fase de código começa antes de a anterior ter PRs mergeados e gates aprovados (Fase 5 é exceção: pesquisa paralela, sem código de produção).

---

## 1. Estado real (2026-09-08)

| Fato | Detalhe |
|------|---------|
| Fase 0 | Feita (PRs #10–#15) |
| Fase 1 | Feita no código (rate limit, CI, Vitest, RLS, gate) — ops humanos: Deployment Protection / checks obrigatórios |
| Fase 2 | Feita (dados cliente, avisos, ausências, mobile) |
| Fase 3.0 | Mergeada (#28) — higiene do ciclo |
| Fase 3.1 | Mergeada (#31) — relatórios `/performance` |
| Fase 3.6 | Mergeada (#41) — menções `@` com notificação |
| Fase 4.1 | Mergeada (#29) — colunas livres no quadro do cliente |
| Visual Samps | Mergeada (#36–#40) — fundação, shell, boards, gestão, portal |
| Sunset `(app)` | Mergeada (#35) — rotas legacy removidas |
| Criar demanda | Mergeada (#42–#43) — ciclo pronto para teste da empresa |
| Fase 5 | Docs de decisão (IA / mobile / SaaS) |
| Playbook | `2026-08-07-playbook-metodologia.md` |
| Produção | https://samps-os.vercel.app |
| Acessos teste | `docs/superpowers/notas/2026-09-04-acessos-temporarios-teste.md` |
| Spec Fase 3 | `docs/superpowers/specs/2026-08-16-fase3-gestao-agencia-design.md` |

**Próxima fatia a executar:**  
**3.3 categorias de vídeo + briefing** — PR #60, ainda não mergeado. Aplicar as migrations antes do smoke.  
**3.7 CSP enforce** — mergeada (#59).  
**3.5 pontuação** — bloqueada em 26/09. Aguarda as regras da Samps. Sem código.  
**4.3 agenda organizacional** — spec proposta em `docs/superpowers/specs/2026-09-26-agenda-organizacional-design.md` (sem Google Calendar). Plano só depois do aceite.

**Fila:** merge da 3.3 → 3.5 quando as regras chegarem → 4.3 depois do aceite da spec.  
**Adiado (25/09, sem certeza de necessidade):** 3.2 anexos na demanda; 4.2 capacidade de 8h por pessoa.  
Nota: onda 15/09 permanece como contexto. A spec 21/09 (itens leves) foi **substituída** no ciclo de vida do item pela spec 24/09. N listas, barra, responsável e prazo ficam.  
Nota: a antiga “3.4 visibilidade aberta” foi **redefinida** pelos áudios de 10–15/09 (hierarquia Trello, não leitura cruzada).

---

## 2. Metodologia e modelos (resumo)

Fonte completa: **playbook**. Resumo operacional:

| Atividade | Skill / motor | Modelo |
|-----------|---------------|--------|
| Feature/comportamento novo sem design | `brainstorming` → spec | Opus 5 |
| Plano da fatia | `writing-plans` | Opus 5 |
| Execução com plano (mesma sessão) | **`subagent-driven-development`** | Controller Opus; implementer grok-fast se mecânico |
| Execução em sessão/cloud dedicada | `executing-plans` | conforme fatia |
| Bug / regressão | `systematic-debugging` | conforme severidade |
| Hotfix 1 arquivo | execução direta | Auto |
| Review bugs | Bugbot | — |
| Review auth/RLS/upload/PII | Security Review | — |

Regra: se o modelo rápido precisar **mudar schema, permissão, RLS, auth ou upload** fora do plano → para e devolve ao Opus 5.  
Unidade de execução = **fatia (1 PR)**, nunca a fase inteira.
---

## 3. Convenções de versionamento

- **Uma branch por fatia**, nunca por fase inteira: `feat/<fatia>`, `fix/<fatia>`, `chore/<fatia>`, `sec/<fatia>`.
- **Conventional Commits** em português: `feat(clientes): campos de aniversario e endereco`.
- **Commit por tarefa concluída**, não por fase. Cada commit precisa deixar `npx tsc --noEmit` limpo.
- **PR por fatia**, com descrição do que testar. Merge só depois dos dois gates (Bugbot + Security Review) quando a fatia tocar dados, auth ou upload.
- **Proibido commitar:** `.env`, `.env.*`, `.vercel/`, `.superpowers/`, `_e.txt`, dumps de banco, prints com dados de cliente real.
- Migrations Prisma sempre em commit próprio, junto do código que as usa.

---

## 4. Gates obrigatórios por fatia

1. `npx tsc --noEmit` limpo
2. `npm run lint` sem erro novo
3. `npm run build` passa (obrigatório em qualquer fatia que mexa em rota, layout ou schema)
4. Smoke manual descrito no plano da fase
5. **Bugbot** em fatias com lógica de negócio
6. **Security Review** em fatias com auth, permissão, upload, dado pessoal ou query nova

---

## 5. Fases

| Fase | Plano | Janela | Motor padrão | Objetivo |
|------|-------|--------|--------------|----------|
| **0** | `2026-08-04-fase0-recuperar-pendencias.md` | 04–06/ago | SDD/EP por fatia (quase fechada) | Trazer stashes, escopo de contrato, ações por status, fix de build |
| **1** | `2026-08-04-fase1-seguranca-hardening.md` | 06–11/ago | SDD; Security nas tasks 3/7/8 | CVE, headers, rate limit, proteção Vercel, CI, Vitest, RLS |
| **2** | `2026-08-04-fase2-features-reuniao.md` | 11–18/ago | SDD **por task** + merge entre elas | Entregáveis da reunião do dia 18 |
| **3** | `2026-08-04-fase3-operacional-setembro.md` | 19/ago–05/set | WP just-in-time → SDD | Operação diária: anexos, relatórios, vídeo, visibilidade |
| **4** | `2026-08-04-fase4-avancado.md` | 08–19/set | BR/WP → SDD | Colunas por cliente, capacidade 8h, agenda organizacional |
| **5** | `2026-08-04-fase5-pesquisa-decisoes.md` | paralelo, até 18/ago | DOC (sem SDD de código) | IA, mobile, SaaS — 1-pagers de decisão |

Matriz task-a-task: playbook seção 5.  
Fases 0–2 detalhadas. Fases 3–4: escopo agora, plano detalhado no Opus **imediatamente antes** de executar. Fase 5: só documentos.
---

## 6. Cobertura da reunião de 28/07

| Pedido da reunião | Fase |
|-------------------|------|
| Dados do cliente (endereço, aniversário) + aniversário na agenda | 2 |
| Mural/banner de avisos na home (aniversariantes, urgentes) | 2 |
| Registro de ausências (folga, férias, offline) | 2 |
| Links de contrato e estudo no painel do cliente | 2 |
| Remover restrição / abrir visualização de demandas ao time | 3 (confirmar semântica com a Samps antes) |
| Cronômetro por demanda | já existe — validar na Fase 0 |
| Relatórios de performance por usuário e por tipo | 3 |
| Ajuste da agenda (eventos e prazos) | 2 (parcial) + 4 (agenda organizacional) |
| Anexos nas demandas | 3 |
| Campos obrigatórios antes de criar demanda | já existe — reforço na Fase 3 (vídeo) |
| Link do Drive obrigatório ao concluir | já existe — validar na Fase 0 |
| Categorias padronizadas de vídeo | 3 |
| Colunas personalizadas por cliente | 4 |
| Cálculo de capacidade / 8h por pessoa | 4 |
| Regras de pontuação e priorização | 3 (depende das regras que a Samps vai enviar) |
| Comunicação centralizada (sem WhatsApp) | 3 (comentários) + backlog futuro (chat) |
| Liberar acesso ao time para teste | 1 (com Deployment Protection) |
| Avaliar assistente de IA | 5 |
| Avaliar exportação como app mobile | 5 |
| Vender o sistema / SaaS | 5 |

---

## 7. Fora de escopo até setembro

- Migração para NestJS + JWT Bearer (rewrite de API)
- Multi-tenant / white-label vendável
- Chat em tempo real
- App nativo em loja
- Assistente de IA em produção

Esses itens só saem de "pesquisa" depois que o operacional de setembro estiver em uso real.

---

## 8. Riscos

| Risco | Mitigação |
|-------|-----------|
| Escopo da reunião maior que a janela até setembro | Fases 4 e 5 explicitamente fora do "operacional" |
| Trabalho perdido em stash | Fase 0 antes de tudo |
| Vazamento de dado de cliente real no teste do time | Fase 1: Deployment Protection + seed de demonstração + RLS verificado |
| CVE do Next em produção | Fase 1, primeira tarefa |
| Neon suspendendo compute em teste | Fase 1: nota operacional + retry/timeout na connection string |
| Modelo rápido alterando schema sem revisão | Regra da seção 2 |
