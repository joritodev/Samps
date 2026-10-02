# Notificações e Avisos (megafone) — redesign

**Data:** 2026-10-02 · **Status:** direção visual aprovada pelo usuário (cartão limpo); escopo de implementação aguardando confirmação.

## Estado atual (verificado)
- **Sino** = notificações pessoais (`Notification`). Link para `/notificacoes`; sem prévia. Selo vermelho com contagem.
- **Megafone** = Mural: avisos gerais (`Announcement`: INFO/URGENT/CELEBRATION, janela `startsAt`/`endsAt`) e aniversários do dia. Dispensar grava só em `localStorage` (por navegador).
- **Alto-falante** = silencia som dos pop-ups da sessão (`sessionStorage`).
- Pop-ups por polling a cada 20 s (`LiveAlertsHost`), com sonner.
- **Problemas confirmados:** notificações nunca viram "lidas" (funções existem, ninguém chama); tipos `DEADLINE_NEAR`, `DEMAND_OVERDUE`, `RESPONSIBLE_CHANGED` etc. nunca são criados, então o grupo "Prazos" das preferências não dispara nada; cores fixas (amber/fuchsia) que ignoram os temas; pop-up usa fonte do sonner, não a do sistema; selo do megafone na cor do tema e do sino em vermelho.

## Decisões já tomadas
- **Pop-up = "cartão limpo"** (opção 1): cartão branco com borda fina, ícone em círculo, título 600, texto secundário, botões **Entendi** (contorno na cor do aviso) e **Ver aviso**, "X" para fechar. Sem fundo amarelo.
- **Cor do aviso urgente: terracota** (`#b8441f` claro / `#e8805a` escuro), longe do amarelo de "atenção". Celebração usa o laranja da marca em tom suave; informativo é neutro.
- Cores via tokens (acompanham os temas); fonte do sistema no pop-up.

## Direção proposta (a confirmar)
1. **Sino com prévia** (janelinha): abas Todas / Não lidas, ícone por tipo, tempo relativo, ponto de não lida, "Marcar todas como lidas", "Ver todas". Clicar numa notificação marca como lida e navega.
2. **Página `/notificacoes`:** lista agrupada (Hoje, Ontem, Esta semana), filtros por grupo, ações no hover, estado vazio "Tudo em dia".
3. **Megafone → "Avisos":** abas Novos / Vistos; grupos Urgente, Comunicados, Aniversários; autor, quando e até quando vale; "Dispensar" move para Vistos. Selo na cor do tema (terracota se houver urgente não visto).
4. **Cabeçalho:** reduzir a dois ícones (megafone e sino); som passa para dentro da janela.
5. **Gestão de avisos:** formulário compacto com botões de escolha, pré-visualização ao vivo e lista com status Ativo/Agendado/Expirado.

## Limites desta fatia
- "Vistos" continua por navegador (sem banco). Sincronizar na conta exige migração e fica para fatia própria.
- Gerar notificações de prazo/atraso (tarefa agendada) é outra fatia.
