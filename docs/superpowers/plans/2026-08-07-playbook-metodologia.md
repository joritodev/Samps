# Playbook de metodologia — Samps OS (ago → set 2026)

**Data:** 2026-08-07  
**Obrigatório para:** qualquer agent (local ou cloud) que for executar, planejar ou revisar trabalho deste roadmap  
**Índice do roadmap:** `docs/superpowers/plans/2026-08-04-roadmap-master.md`

Este arquivo é a **fonte da verdade** sobre *qual skill usar em qual momento*.  
Os planos de fase apontam para cá; se houver conflito entre um plano antigo e este playbook, **este playbook governa** até o plano ser atualizado.

---

## 0. Regra de ouro (ler antes de qualquer ação)

1. **Não implementar sem plano da fatia** (exceto hotfixes triviais de 1 arquivo, com commit próprio).
2. **Unidade de execução = fatia (1 PR)**, nunca a fase inteira.
3. **Uma branch por fatia:** `feat/<fatia>`, `fix/<fatia>`, `chore/<fatia>`, `sec/<fatia>`, `docs/<fatia>`.
4. Se a tarefa tocar **schema Prisma, permissão, RLS, auth, upload ou dado pessoal** e o plano não tiver o desenho fechado → **parar** e voltar para planejamento com modelo forte.
5. Progresso durável em `.superpowers/sdd/progress.md` (git-ignored). Após compaction/resume, confiar no ledger + `git log`, não na memória da conversa.
6. Antes de marcar fatia pronta: gates do roadmap (tsc, lint, build quando couber, smoke, Bugbot/Security conforme a matriz abaixo).

---

## 1. Fluxo canônico (do pedido à merge)

```text
pedido / reunião / bug
        │
        ▼
┌───────────────────┐
│ brainstorming     │  só se for trabalho criativo (feature nova)
│ → spec em         │  docs/superpowers/specs/YYYY-MM-DD-<tema>-design.md
└─────────┬─────────┘
          │ spec aprovada (ou escopo já fechado no plano de fase)
          ▼
┌───────────────────┐
│ writing-plans     │  plano da FATIA (não da fase inteira)
│ → docs/.../plans  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Escolher motor    │  ver seção 2
│ de execução       │
└─────────┬─────────┘
          │
          ├─ subagent-driven-development  (padrão, mesma sessão)
          ├─ executing-plans              (sessão paralela / cloud na fatia)
          └─ execução direta              (hotfix 1 arquivo / chore trivial)
          │
          ▼
┌───────────────────┐
│ Gates da fatia    │  seção 4
│ Bugbot / Security │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ finishing-a-      │  verificar, mergear, limpar branch
│ development-branch│
└───────────────────┘
```
**Nunca pule:** `writing-plans` (ou plano de fase já detalhado) → execução → gates → finishing.

---

## 2. Árvore de decisão — qual metodologia agora?

Responda na ordem. A primeira resposta “sim” define o caminho.

| # | Pergunta | Se sim → |
|---|----------|----------|
| 1 | É bug / regressão / comportamento inesperado sem causa óbvia? | `systematic-debugging` (não SDD) |
| 2 | É feature nova, mudança de comportamento ou decisão de produto ainda sem design? | `brainstorming` → spec → `writing-plans` |
| 3 | Já existe spec/escopo, mas **não** há plano detalhado da fatia? | `writing-plans` (Opus / modelo forte) |
| 4 | Há plano com tasks checkbox, tasks **pouco acopladas**, e a execução fica **nesta sessão**? | **`subagent-driven-development`** (padrão) |
| 5 | Há plano, mas a execução será em **outra sessão** (cloud agent dedicado à fatia)? | `executing-plans` |
| 6 | É correção trivial (1 arquivo, sem schema/auth, plano desnecessário)? | Execução direta + commit Conventional |
| 7 | Tasks do plano estão **fortemente acopladas** (cada uma quebra sem a anterior no mesmo PR)? | Execução sequencial **na mesma sessão** com `executing-plans` *ou* SDD com **uma task por vez e merge entre fatias** — nunca N implementers em paralelo |

### Quando NÃO usar SDD

- Plano inexistente ou com TBD / “implementar o óbvio”
- Tasks que precisam mudar o design no meio do caminho
- Sessão cujo único objetivo é pesquisa/1-pager (Fase 5)
- Debug exploratório

### SDD — contrato mínimo do controller

1. Ler o plano da fatia **uma vez**; extrair Global Constraints.
2. Checar ledger: `.superpowers/sdd/progress.md` — não reexecutar task já `complete`.
3. Por task: brief → implementer (modelo adequado) → review-package → task reviewer → fix se Critical/Important → marcar ledger.
4. **Não** despachar vários implementers em paralelo.
5. No fim da fatia: whole-branch review (Bugbot; Security se seção 4 exigir) → `finishing-a-development-branch`.

---

## 3. Papéis e modelos

| Papel | Skill / ação | Modelo sugerido |
|-------|----------------|-----------------|
| Design, schema, auth, segurança, arquitetura | `brainstorming`, `writing-plans`, replanejamento | **Opus 5** (ou mais capaz disponível) |
| Controller SDD (orquestra, adjudica review) | `subagent-driven-development` | **Opus 5** / modelo forte |
| Implementer mecânico (plano com código/passos literais, 1–2 arquivos) | subagent implementer | **cursor-grok-4.5-high-fast** |
| Implementer de integração (vários arquivos, wiring) | subagent implementer | modelo padrão / mid-tier |
| Hotfix / chore trivial | execução direta | **Auto** |
| Review de bugs/regressão da fatia | Bugbot (`Diff: branch changes`) | subagente Bugbot |
| Review de segurança | Security Review (`Diff: branch changes`) | subagente Security Review |
| Whole-branch review final | `requesting-code-review` | modelo mais capaz |

**Regra de escalação:** se o implementer rápido precisar alterar schema, permissão, RLS, auth ou upload → status `BLOCKED` / devolve ao controller → replanejamento no Opus 5. Não “improvisar” a migration.

---

## 4. Gates obrigatórios por tipo de fatia

Sempre:

1. `npx tsc --noEmit` limpo  
2. `npm run lint` sem erro novo  
3. `npm run build` se mexeu em rota, layout ou schema  
4. Smoke manual do plano da fatia  
5. A partir da Fase 1 Task 6 mergeada: `npm test` limpo  

Além disso:

| Toque da fatia | Gate extra |
|----------------|------------|
| Lógica de negócio, status, prioridade, indicadores | **Bugbot** |
| Auth, login, permissão, RLS, upload, dado pessoal, query nova de cliente | **Security Review** + Bugbot |
| Só docs / nota / playbook | sem Bugbot/Security; review humano opcional |
| Headers, CI, dependências | Bugbot; Security se mudar superfície de auth |

Merge só com gates verdes da fatia. Fase seguinte **não começa** antes do PR da fatia anterior estar mergeado (salvo fatias explicitamente paralelas na Fase 5).

---

## 5. Matriz por fase e tarefa

Legenda: **SDD** = subagent-driven-development · **EP** = executing-plans · **WP** = writing-plans · **BR** = brainstorming · **DIR** = execução direta · **DOC** = escrita de documento (sem código de produção)

### Fase 0 — Recuperar pendências  
Plano: `2026-08-04-fase0-recuperar-pendencias.md`  
Estado em 2026-08-07: Tasks 1–4 mergeadas; Task 5 limpeza; smoke browser pendente.

| Task | Metodologia | Modelo | Review |
|------|-------------|--------|--------|
| 1 Fix build | EP ou SDD (mecânico) | grok-fast | — |
| 2 Escopo contrato | SDD | grok-fast + Bugbot | Bugbot |
| 3 Ações por status | SDD | grok-fast + Bugbot | Bugbot |
| 4 Validação fluxos | DIR / checklist manual | Auto | nota em `docs/superpowers/notas/` |
| 5 Limpeza repo | DIR | Auto | — |
| Residual: smoke browser | DIR (computerUse se disponível) | Auto | atualizar nota Fase 0 |

### Fase 1 — Segurança (RETOMAR AQUI)  
Plano: `2026-08-04-fase1-seguranca-hardening.md`  
Estado: Tasks 1–2 mergeadas. **Próxima: Task 3.**

| Task | Metodologia | Modelo | Review |
|------|-------------|--------|--------|
| 1 CVE Next | EP/SDD | Opus no audit; grok no wiring | nota deps |
| 2 Headers CSP | SDD/EP (mecânico) | grok-fast | — |
| **3 Rate limit login** | **SDD** (plano já detalhado) | **Opus no controller**; implementer mid/forte | **Security Review** |
| 4 Acesso teste / Vercel | DIR + DOC (painel humano) | Auto + humano na Vercel | nota `acesso-teste` |
| 5 CI + security workflows | SDD/EP | grok-fast | Bugbot leve |
| 6 Vitest base | SDD (TDD) | grok-fast / mid | Bugbot |
| 7 Ampliar check-rls | **SDD** | **Opus** | **Security Review** |
| 8 Gate segurança da fase | Security Review + Bugbot + DOC | Opus | nota `seguranca` |

**Não iniciar Fase 2** sem critério de saída da Fase 1 (inclui Vitest + CI + rate limit + RLS).

### Fase 2 — Entregáveis reunião 18/08  
Plano: `2026-08-04-fase2-features-reuniao.md`  
Dependência: Fase 1 concluída. **Ordem sequencial entre tasks** (merge entre cada uma).

| Task | Metodologia | Modelo | Review |
|------|-------------|--------|--------|
| 1 Dados cliente (schema + UI) | Step 1 schema: **WP/Opus** se precisar ajustar; execução **SDD** | Opus desenho; grok UI | Bugbot + **Security** (dado pessoal) |
| 2 Aniversários agenda | SDD + TDD | grok-fast | Bugbot |
| 3 Mural avisos | SDD | Opus no schema; grok resto | Bugbot + Security |
| 4 Ausências | SDD + TDD | Opus schema; grok resto | Bugbot + Security |
| 5 Mobile mínimo | EP/SDD (após inventário) | grok-fast | Bugbot |
| 6 Demo 18/08 | DOC | Opus/Auto | — |

Cada Task 1–5 = **uma fatia / um PR**. Controller não empacota a fase inteira num único SDD sem merges intermediários.

### Fase 3 — Operacional setembro  
Plano: `2026-08-04-fase3-operacional-setembro.md` (escopo only)

| Antes de cada fatia 3.x | Metodologia |
|-------------------------|-------------|
| Definição da Samps ainda faltando (3.3, 3.4, 3.5) | **parar** — não inventar regras |
| Storage de anexos (3.2) | **BR** curto (opções Blob/Drive/S3) → decisão → **WP** → SDD |
| Demais fatias com escopo claro | **WP** (Opus, just-in-time) → SDD |
| 3.7 CSP enforce | SDD + Security Review |

### Fase 4 — Avançado  
Plano: `2026-08-04-fase4-avancado.md`

| Fatia | Metodologia |
|-------|-------------|
| 4.1 Colunas por cliente | **BR** (mapa coluna↔status) → **WP** → SDD; risco alto de quebrar ciclo de vida |
| 4.2 Capacidade 8h | WP → SDD; só com dados reais de WorkSession |
| 4.3 Agenda organizacional | BR (Google Calendar sim/não) → WP → SDD |
| 4.4 Dívida técnica | DIR/SDD por item; upgrade Next 16 = WP próprio |

### Fase 5 — Pesquisa (paralela, sem código de produção)  
Plano: `2026-08-04-fase5-pesquisa-decisoes.md`

| Decisão | Metodologia |
|---------|-------------|
| 5.1 IA / 5.2 Mobile / 5.3 SaaS | **DOC** com modelo forte + busca web de preços no dia; **proibido** SDD de feature |
| Aceite | 1-pager em `docs/superpowers/notas/` com número, fonte e recomendação única |

---

## 6. Prompt de abertura de sessão (copiar)

Use no início de uma sessão de execução. Substitua os campos entre `<>`.

```text
Você está no repositório Samps OS.
Antes de qualquer código, leia e siga:
1. docs/superpowers/plans/2026-08-07-playbook-metodologia.md
2. docs/superpowers/plans/2026-08-04-roadmap-master.md
3. O plano da fatia: <caminho do plano>
4. Ledger: .superpowers/sdd/progress.md (criar se não existir)

Fatia desta sessão: <nome da task / branch>
Metodologia obrigatória: <SDD | EP | DIR | DOC> (conforme matriz do playbook)
Modelo controller: <Opus / …>
Modelo implementer: <grok-fast / mid / …>
Gates: <Bugbot | Security | ambos | nenhum>

Regras:
- Não começar outra fatia nesta sessão.
- Não alterar schema/auth/permissão fora do que o plano detalha; se precisar, BLOCKED.
- Commit Conventional em português; 1 commit por task concluída com tsc limpo.
- Ao terminar: finishing-a-development-branch + PR da fatia.
```

### Prompt mínimo para cloud agent (uma fatia)

```text
Execute SOMENTE a Task <N> de <arquivo do plano>, seguindo
docs/superpowers/plans/2026-08-07-playbook-metodologia.md.
Metodologia: <SDD ou EP>. Não execute tasks vizinhas.
Ao concluir: tsc/lint/build/test conforme gates, PR, e uma linha no ledger.
```

---

## 7. Ledger de progresso

Arquivo: `.superpowers/sdd/progress.md` (não versionar).

Formato sugerido:

```markdown
# SDD progress — Samps OS

## Fatia: sec/rate-limit-login (Fase 1 Task 3)
- started: 2026-08-07
- Task 3: complete (commits abc1234..def5678, review clean)
```

Se o ledger sumir (`git clean`), reconstruir a partir de `git log` / PRs mergeados.

---

## 8. Convenções que a metodologia assume

Já definidas no roadmap; repetidas aqui para o agent não precisar adivinhar:

- Conventional Commits em português  
- Proibido commitar: `.env`, `.env.*`, `.vercel/`, `.superpowers/`, `_e.txt`, dumps, prints com dado real  
- Migration Prisma no mesmo commit do código que a usa  
- Mensagem de erro de login sempre genérica  
- Cliente externo nunca vê dado interno (aniversário/endereço/avisos internos)

---

## 9. Checklist do controller (antes de dizer “fase/fatia pronta”)

- [ ] Metodologia da matriz (seção 5) foi a usada de fato  
- [ ] Ledger atualizado  
- [ ] Gates (seção 4) passaram  
- [ ] PR da fatia aberto/atualizado com o que testar  
- [ ] Nenhuma task da próxima fase iniciada cedo demais  
- [ ] Se Fase 1: Vitest+CI existem antes de prometer TDD na Fase 2  
- [ ] Se véspera da reunião 18/08: Fase 5 1-pagers prontos mesmo que Fase 2 ainda esteja andando (Fase 5 é paralela)

---

## 10. Onde está cada documento

| Documento | Papel |
|-----------|--------|
| `2026-08-07-playbook-metodologia.md` (este) | **Como** trabalhar |
| `2026-08-04-roadmap-master.md` | **O quê** e em que ordem (fases) |
| `2026-08-04-fase*.md` | Plano/escopo da fase |
| `docs/superpowers/specs/*` | Design aprovado |
| `docs/superpowers/notas/*` | Evidências, demos, decisões |
