# Projetos, captações, histórico do card, representantes e convites

**Data:** 2026-10-10 · **Status:** spec (nenhum código ainda) · **Roadmap de fatias:** `docs/superpowers/plans/2026-10-10-projetos-captacoes-roadmap.md`
**Origem:** conversa de 10/10 com o responsável pelo projeto, depois de ver o quadro de planejamento semanal. Pedidos adicionais da reunião com a Samps (representantes do cliente, convites no Google Agenda, atraso simplificado, histórico de descrição).

## Problema
`/projetos` e `/captacoes` só listam. `Project` e `Shoot` existem no banco desde o início, mas só `prisma/seed.ts` e a simulação escrevem neles. As permissões `projects.create` e `shoots.create` hoje só liberam o item de menu. `Demand.projectId` existe, mas nenhum formulário o preenche. O quadro do Social agrupa "Captações" por heurística (formato contendo "capta"). O fluxo de atraso de prazo é pesado (permissão, justificativa longa, resolução de `DemandDelay`) e a descrição da demanda não tem histórico.

## Conceitos (definidos pelo responsável)
- **Projeto** = conjunto de demandas que o cliente pediu para um fim específico (um evento, uma campanha). Se o cliente pedir algo além do contrato, é **outro projeto** (marcado como fora do contrato).
- **Captação** = algo semelhante: uma gravação/sessão agendada que gera trabalho (as demandas de edição), podendo pertencer a um projeto.

## Decisões padrão (revisáveis; perguntas na seção 6)
| Tema | Decisão |
|---|---|
| Quem cria projeto | Quem tem `projects.create` (gestão e papéis marcados) |
| Quem cria captação | Quem tem `shoots.create` |
| Concluir projeto | Gestão confirma; progresso e sugestão vêm das demandas |
| Fora do contrato | Campo `outsideContract` e selo na lista; sem alerta |
| Prazo do card | Qualquer pessoa com acesso à demanda muda; motivo opcional; tudo no histórico do card |
| Atraso | Derivado (prazo vencido e demanda aberta); sem resolução manual |
| Google Agenda | Etapa 1: convite `.ics`; OAuth só quando a Samps entregar a conta Google |
| E-mail | Só envia quando o domínio no Resend estiver ativo; antes, o `.ics` é baixável |

## 1. Projeto
- Campos: cliente, título, descrição, responsável, início, prazo, participantes, **`outsideContract`** (novo).
- Criar e editar por formulário (gestão e `projects.create`), cliente validado com `canAccessClient`.
- Nova demanda ganha seletor opcional de projeto (projetos ativos do cliente); `Demand.projectId` já existe, origem `DemandOrigin.PROJECT`.
- **Progresso** = demandas concluídas ÷ total (função pura; o campo `progress` vira cache atualizado a cada mudança de status de demanda).
- **Status:** Planejamento → Ativo (primeira demanda criada ou data de início); Concluído quando todas as demandas fecham e a gestão confirma; Em pausa e Cancelado manuais.
- Página `/projetos/[id]`: demandas ligadas, participantes, histórico.
- Checklist próprio do projeto continua fora (decisão de 15/09).

## 2. Captação
- Campos atuais do `Shoot` + **`projectId`** opcional (novo).
- **`Demand.shootId`** (novo): demandas de edição nascem ligadas à captação, com prazo a partir da data.
- Status: Planejada → Agendada → Confirmada → Em andamento → Concluída/Cancelada. Concluir exige link do material (Drive) e notifica o editor.
- Aparece no planejamento semanal como card de captação fixo no dia (sem cadastrar duas vezes).
- O quadro do Social passa a usar `Shoot` no lugar da heurística.

## 3. Histórico do card (atraso e descrição)
- Qualquer pessoa com acesso à demanda altera prazo e descrição. `demands.change_deadline` deixa de ser exigida (o código permanece para papéis personalizados).
- Cada mudança grava um evento (`AuditLog`, `entityType=Demand`): quem, quando, valor anterior e novo, motivo (opcional para prazo).
- A linha do tempo aparece **dentro do card**, num componente único para prazo e descrição.
- Atraso passa a ser derivado; a resolução manual de `DemandDelay` sai do fluxo. A divergência de migration conhecida (`DemandDelay`, `DemandDelayResolution`, `User.notificationPrefs` sem migration) é tratada nesta fatia, com migration de correção.

## 4. Representantes do cliente
- Nova tabela `ClientContact` (cliente, nome, cargo, e-mail, telefone, aniversário, `receivesInvites`), 1..N por cliente, RLS `internal_only`.
- CRUD na ficha do cliente. Aniversários entram na agenda e no mural, junto do aniversário do cliente (`Client.birthDate` permanece).

## 5. Convites
- Etapa 1: arquivo `.ics` (REQUEST) gerado no servidor para reuniões da agenda e captações, com participantes internos e representantes marcados em `receivesInvites`. Baixável sempre; enviado por e-mail quando o Resend estiver ativo.
- Etapa 2 (futura): OAuth com a conta Google da Samps para criar o evento direto no Google Agenda.

## Segurança
Toda escrita por server action com `requirePermission`; serviço revalida e bloqueia `EXTERNAL_CLIENT`; vínculo de demanda/projeto/captação validado com `guardDemand`/`canAccessClient` (risco S5 da auditoria de 07/10); entradas por `parseXInput`; RLS `internal_only` com `FORCE` em tabelas novas; `.ics` e e-mails nunca expõem dados de clientes sem acesso. Mudança de permissão (prazo livre) passa por Security Review.

## 6. Perguntas abertas
1. Motivo do prazo: opcional (padrão) ou obrigatório?
2. Convite ao representante do cliente só quando a gestão marcar (padrão) ou sempre?
3. Remetente do e-mail dos convites (depende do domínio no Resend).
4. Quem além da gestão pode concluir um projeto?
