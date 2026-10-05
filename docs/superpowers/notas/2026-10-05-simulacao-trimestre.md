# Simulação de um trimestre de trabalho

Apaga os dados operacionais e grava uma história coerente: cinco clientes fictícios, um trimestre fechado e o começo do atual.

## Como rodar

- **Local:** `npx tsx prisma/simulate-quarter.ts --dry-run` (só planeja) ou `--yes` (apaga e grava).
- **Produção:** Actions → "Simular trimestre de trabalho". Começa em **ensaio** (não altera nada). Para aplicar, desmarque "ensaio" e digite `apagar e simular`. Antes, crie um branch/backup do banco no Neon. O secret `PRODUCTION_DATABASE_URL` precisa ser o endereço direto (sem `-pooler`) e as migrações já devem ter sido aplicadas.

## O que é apagado e o que fica

- **Apagado:** clientes, contratos e serviços, quadros, listas, competências, portais, demandas (com sessões de trabalho, pausas, atribuições, atrasos, comentários, anexos, checklists), projetos, captações, agenda, avisos, ausências, notificações, metas, OKRs e check-ins, "visto" e envios de relatórios, pontuação de prioridade.
- **Fica:** usuários, funções e permissões, setores, configurações da agência, tipos de conteúdo, níveis de prioridade, status de atividade, histórico de auditoria. Nenhuma conta é criada: a equipe da simulação é quem já está ativa (Social Media, Design, Vídeo, Tráfego).

## A história

- **Clientes:** Clínica Aurora (odontologia), Studio Vita (pilates), Doce Raiz (confeitaria), Mendes & Prado (advocacia, mais exigente) e Terra Viva (imobiliário, entra em agosto e traz o lançamento do Vista Verde, com mais ajustes no início).
- **Trabalho:** cada contrato gera a cota mensal de peças; extras urgentes ligados a datas reais; dois projetos; captações que antecedem os reels e vídeos.
- **Execução:** cada demanda segue o ciclo real (briefing → setor → produção → revisão → ajuste → aprovação → publicação). A fila de cada pessoa é respeitada: ninguém trabalha em duas coisas ao mesmo tempo nem passa de um expediente.
- **Resultado:** os indicadores saem da própria simulação, não são digitados. Metas e OKRs do trimestre anterior (parte batida, parte não) e do atual partem desses números.
- Os links de material e de publicação usam `example.com`; não apontam para lugar nenhum.

A mesma data de execução gera sempre a mesma história (semente fixa). Rodar de novo apaga e recria.
