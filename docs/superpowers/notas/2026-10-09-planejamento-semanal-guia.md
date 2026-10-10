# Planejamento semanal de produção — guia e roteiro de teste

**Data:** 2026-10-09 · **Spec:** `docs/superpowers/specs/2026-10-09-planejamento-semanal-design.md` · **Plano:** `docs/superpowers/plans/2026-10-09-planejamento-semanal-roadmap.md`

## O que é

O painel que a Samps usava fora do sistema (Lovable/Supabase), agora dentro do Samps OS: quadro semanal de segunda a sábado, uma coluna por profissional em cada dia, capacidade em horas, demandas não alocadas, demandas fixas, bloqueios, distribuição automática e histórico. Dois setores, um componente: **Vídeo** e **Design**.

- Menu **Planejamento** → `/planejamento-semanal` (abre o setor da pessoa; gestão abre Vídeo).
- Rotas: `/planejamento-semanal/video` e `/planejamento-semanal/design` (`?semana=AAAA-SS` guarda a semana aberta).

## Quem faz o quê

| Permissão | Quem tem (seed) | Pode |
|---|---|---|
| `planning.view` | todos os papéis internos | ver o quadro e o histórico |
| `planning.edit` | todos os papéis internos | criar, editar, mover (arrastar ou "Mover"), concluir, duplicar cards e **Sugerir distribuição** |
| `planning.manage` | Administrador e Gestão | tudo acima + excluir cards, equipe e capacidade, bloqueios (cadeados), tipos de produção, demandas fixas por cliente, duplicar semana anterior |

Cliente externo nunca acessa (rota, serviço e RLS).

## Como usar

1. **Novo card**: tipo, categoria, cliente (do cadastro do Samps ou texto livre), demanda do Samps (opcional), nome, duração, dia, responsável, status, prazo e observação. No Design a **Calculadora de tempo** converte quantidade em horas.
2. **Arrastar** um card para outra pessoa ou dia (ou de volta para "Demandas não alocadas"). Cards **fixos semanais** não arrastam: edite o card.
3. **Concluir**: o círculo no card. **Duplicar**: cria uma cópia em não alocadas. **Mover**: escolhe data (inclusive outra semana) e responsável.
4. **Capacidade**: cada coluna mostra Disponível, Ocupado e Livre, com sugestões de combinação para as horas livres. Passou da capacidade, aparece "Sobrecarga".
5. **Sugerir distribuição**: propõe vagas para o que está não alocado (a partir de hoje, respeitando prazo, bloqueios, ausências e a pessoa do card). "Outra sugestão" muda o desenho; "Aplicar" só vale se o quadro não mudou desde que a sugestão foi mostrada.
6. **Histórico**: tudo o que foi criado, editado, movido, concluído, excluído ou configurado na semana, com quem fez e quando (também aparece em Histórico, no menu).
7. **Gestão**: engrenagem (equipe e capacidade), **Clientes** (demandas fixas e tipos de produção), **Duplicar semana anterior**, cadeados (dia inteiro ou pessoa), **Acessos** (leva para Equipe).

## Regras que o quadro aplica

- Capacidade do dia = bloqueio (0) → ausência cadastrada em Ausências (0) → ajuste da semana → ajuste fixo do dia → capacidade padrão da pessoa. Sábado nasce com a capacidade padrão; zere nas configurações se a Samps não trabalha.
- Ao abrir uma semana **de hoje em diante**, a gestão gera os cards das demandas fixas e copia os fixos semanais da semana anterior (sem repetir). Semanas passadas não são preenchidas sozinhas.
- Card sem dia **ou** sem responsável fica em "não alocado". Concluído volta como "Programado" ao reabrir.
- A pessoa do quadro é o usuário do setor (o nome vem do cadastro). Para entrar no quadro: engrenagem → "Adicionar profissional".
- Vínculo com demanda é só de consulta: concluir o card **não** altera a demanda do Samps.

## Diferenças em relação ao painel original (propositais)

| Original | Samps OS |
|---|---|
| Login e acessos próprios | Usuários, papéis e permissões do Samps |
| Cadastro de clientes próprio | Clientes do Samps (somente escolha) |
| Semana 1 calculada pelo dia 1º de janeiro (errava em 2027) | Semana ISO correta (4 de janeiro) |
| Semanas passadas preenchidas ao navegar | Só de hoje em diante |
| Excluir card sem confirmação | Pede confirmação |
| Calendário próprio no "Mover" | Campo de data do navegador |
| Histórico em tabela própria | Histórico geral do Samps (`AuditLog`) |

## Implantação

1. `npx prisma migrate deploy` (migrations `20261009110000_planning_audit_actions` e `20261009120000_planning_foundation`; cria as tabelas, as permissões, o RLS e os tipos de produção iniciais de Vídeo e Design).
2. Entrar como gestão → **Planejamento** → engrenagem → **Adicionar profissional** (cada pessoa de Vídeo e de Design) e ajustar cor e capacidade.
3. **Clientes** → **Editar demandas** para cadastrar as demandas fixas de cada cliente.
4. Se o login de algum papel personalizado precisar do quadro, marcar `planning.view`/`planning.edit` em Configurações → Funções.

## Roteiro de teste (smoke)

- [ ] Gestão: criar card, arrastar, concluir, mover por data, excluir, bloquear um dia e uma pessoa, mudar capacidade de um dia, criar tipo de produção, cadastrar demanda fixa e abrir a semana seguinte (cards gerados), duplicar semana anterior.
- [ ] Designer/Videomaker: vê o quadro, cria e arrasta; **não** vê Excluir, engrenagem nem Clientes; banner "Acesso operacional".
- [ ] Ausência cadastrada para uma pessoa zera a capacidade do dia dela.
- [ ] Sugerir distribuição → Outra sugestão → Aplicar; abrir de novo e conferir que o backlog diminuiu.
- [ ] Design: calculadora (6 slides de carrossel = 1h30).
- [ ] Cliente externo: `/planejamento-semanal` redireciona para o portal.
- [ ] `npm run check:rls`: nenhuma linha das tabelas `Plan*` para o cliente externo.

## Pendências

1. **Áudio do vídeo da reunião** não foi transcrito (ambiente sem acesso ao modelo de fala). O que foi dito e não está no painel original precisa ser conferido com a Samps.
2. **Tela final do vídeo** (~220 s, layout estreito): não identificada; pode ser outro diálogo ou visão mobile.
3. **Migrations antigas faltando na master**: `DemandDelay`, `DemandDelayResolution` e `User.notificationPrefs` existem no schema sem migration. Num banco criado só com `migrate deploy` o seed e algumas telas falham. Fatia `fix/` própria (ou confirmar que a produção foi criada com `db push`).
4. **Visão mobile**: o quadro rola na horizontal e a largura das colunas se ajusta; um layout específico para celular não foi desenhado.
5. **Zerar os dados de teste** antes de a equipe usar (ver o roadmap master, "Decisões de 06/10": apagar contas e dados de teste no repasse). Exige a `DATABASE_URL` do banco de teste e decisão sobre o que preservar.

## Cores e dados de exemplo (10/10)

- O quadro usa só tokens do tema (`primary`, `success`, `warning`, `destructive`, `brand`, `card`, `border`), claro e escuro. Estilos de tipo e categoria ficam em `lib/agency/planning/config.ts`.
- Dados de exemplo: workflow manual `planejamento-exemplo.yml` (só na master, ambiente `production-db`). `acao=montar` cria os membros que faltam (usuários ativos de Design/Vídeo, com sábado zerado) e cards ligados às demandas da simulação nas semanas atuais; `acao=limpar` remove só os cards de exemplo (posição >= 1000). Rodar com `ensaio=true` primeiro; para aplicar, `ensaio=false` e `confirmar="montar exemplo"`. Idempotente.
- `slotSuggestions` agora sugere primeiro as peças maiores.
