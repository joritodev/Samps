# Demo 18/08 — roteiro

## Entregue nesta rodada
1. Dados do cliente: endereço, aniversário e links de contrato/estudo — mostrar na ficha
2. Aniversariantes na agenda — mostrar o mês atual
3. Mural de avisos — criar um aviso urgente ao vivo e mostrar aparecendo
4. Ausências da equipe — registrar uma folga e mostrar em /equipe e na agenda
5. Uso pelo celular — abrir no telefone durante a reunião

## Já existia e vale reforçar
- Cronômetro por demanda, link do Drive obrigatório na entrega, geração automática de cartões por contrato, portal do cliente

## Em andamento para setembro
- Relatórios de performance por usuário e por tipo
- Anexos nas demandas
- Categorias padronizadas de vídeo com briefing obrigatório
- Visibilidade aberta das demandas (confirmar a regra com a Samps)

## Precisamos da Samps
- Regras de pontuação e priorização das demandas
- Definição do que "remover a restrição" significa na prática
- Categorias de vídeo que a equipe usa hoje
- Se o teste vai usar dado de cliente real (muda o isolamento do banco)

## Antes da demo (ops)
- [ ] Merge da stack Fase 2 (#21 → #22 → #23 → #24 → #25)
- [ ] `prisma migrate deploy` no Neon (profile/aniversário, announcements, absences)
- [ ] Smoke em produção + celular
