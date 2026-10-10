# Projetos e captações: guia do fluxo

**Data:** 2026-10-10 · **Spec:** `specs/2026-10-10-projetos-captacoes-historico-design.md` · **Roadmap:** `plans/2026-10-10-projetos-captacoes-roadmap.md`

## Conceito
- **Projeto** = conjunto de demandas que o cliente pediu para um fim específico (evento, campanha). Pedido além do contrato vira outro projeto, marcado **Fora do contrato**.
- **Captação** = gravação ou sessão de fotos. Dela saem as demandas de edição.

## Projeto: do pedido à entrega
1. `Projetos` → **Novo projeto** (quem tem `projects.create`: gestão e social media). Cliente, título, datas, responsável, participantes, "fora do contrato".
2. Na página do projeto: **Nova demanda** (já nasce ligada) ou **Ligar demanda existente** (demandas abertas do mesmo cliente, sem projeto). Também dá para escolher o projeto ao criar uma demanda em `Demandas`.
3. O projeto começa em **Planejamento** e passa sozinho a **Em andamento** quando recebe a primeira demanda (ou chega a data de início).
4. **Progresso** = demandas entregues (Concluída, Publicada, Entregue) ÷ total; canceladas não contam. Calculado na hora.
5. Quando tudo está entregue, a página sugere **Concluir projeto**. Só a gestão conclui ou cancela; Pausar e Retomar valem para quem tem `projects.create`. Concluir recusa se houver demanda aberta.
6. Projeto concluído ou cancelado não aceita demanda nova; reabrir volta para Em andamento (ou Planejamento, se cancelado).
7. Histórico no próprio projeto: criação, edição, ligação de demandas, mudanças de status.

## Captação: da gravação à edição
1. `Captações` → **Nova captação** (`shoots.create`: gestão, social media, videomaker). Pode pertencer a um projeto do mesmo cliente e já criar a **demanda de edição** (setor Vídeo, prazo 5 dias úteis depois da gravação).
2. Etapas: Planejada → Agendada (avisa a equipe) → Confirmada → Em execução → Concluída. Cancelar é possível até concluir; reabrir volta para Planejada.
3. **Concluir** exige o link do material (Drive, só http/https). O link vai para as demandas de edição ligadas, e editor e equipe recebem notificação.
4. Na página da captação: demandas de edição (dá para criar outra), histórico e link do material.
5. No quadro do Social Media, demanda ligada a uma captação aparece na coluna **Captações**.

## Regras de segurança
- Toda escrita passa por server action com `requirePermission`; o serviço revalida cliente (`canAccessClient`), vínculo (projeto e captação do mesmo cliente) e bloqueia cliente externo.
- Responsável e participantes precisam ser usuários internos ativos.
- RLS: nenhuma tabela nova; `Project`, `Shoot` e `Demand` mantêm a policy `client_scope`.
- Migrations: `20261010110000_projects_shoots_audit_actions` (enum) e `20261010120000_projects_shoots_flow` (colunas opcionais; nada é apagado). Em produção, só pelo workflow `migrate-production.yml`.

## Histórico do card (prazo e descrição)
- Qualquer pessoa interna com acesso à demanda muda o **prazo** e a **descrição**; a permissão `demands.change_deadline` deixou de ser exigida (o código continua existindo para papéis personalizados).
- O motivo é **opcional** (até 500 caracteres). Mudar para a mesma data é recusado.
- Cada mudança entra no **Histórico do card**, dentro do próprio card (aba "Atrasos e histórico" no quadro do cliente; rodapé do card nos setores e no quadro geral): quem, quando, de/para e motivo. Na descrição, "Ver antes e depois" mostra os dois textos.
- O registro de atrasos (`DemandDelay`) continua alimentando relatórios e alertas; mudar o prazo ainda encerra o atraso aberto como "prazo prorrogado".

## Ainda não feito (próximas fatias do roadmap)
Representantes do cliente com aniversário, convites `.ics`, card de captação no planejamento semanal, simulação com projetos e captações ligados.
