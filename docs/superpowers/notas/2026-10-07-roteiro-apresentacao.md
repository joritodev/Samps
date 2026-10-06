# Roteiro de apresentação — Samps OS

**Data:** 2026-10-07
**App:** https://samps-os.vercel.app (ou `http://localhost:3000` se apresentar no ambiente local, ver seção 1)
**Duração sugerida:** 35 min de apresentação + 10 min de perguntas
**Capturas de apoio (plano B):** `docs/superpowers/notas/assets/apresentacao/` (18 imagens, numeradas na ordem da apresentação)

---

## 0. A mensagem da apresentação

Em uma frase: **o Samps OS leva a agência do "quem está fazendo o quê no WhatsApp" para um lugar só, onde cada demanda tem dono, prazo e etapa, e a gestão enxerga o resultado em números.**

Três ideias para repetir ao longo da apresentação:

1. **Uma demanda, um caminho.** Do briefing à publicação, cada demanda passa pelas mesmas etapas e sempre há alguém responsável.
2. **Cada pessoa vê o que precisa.** O executor vê a própria fila, o social vê a aprovação, a gestão vê a operação inteira, o cliente vê só o dele.
3. **Resultado medido.** Indicadores, metas e OKRs saem dos dados do trabalho do dia a dia, sem planilha.

---

## 1. Antes de apresentar (faça na véspera e de manhã)

### 1.1 Escolha onde apresentar

| Opção | Quando usar | Cuidado |
|-------|-------------|---------|
| **A. Produção** (`samps-os.vercel.app`) | Para mostrar o fluxo operacional ao vivo (criar demanda, atribuir, produzir, aprovar, publicar) | Com só os dados de demonstração (2 clientes, poucas demandas), a **Performance fica vazia ou com números pequenos**. Para essa parte, use as capturas do plano B |
| **B. Local com a simulação** | Para mostrar a Performance cheia: um trimestre de dados, metas e OKRs | Exige preparar a máquina (abaixo). **Nunca rode a simulação apontando para produção** |

Se der tempo, o melhor é **A para o fluxo** e **B (ou capturas) para a Performance**.

### 1.2 Preparar o ambiente local com a simulação (opção B)

Faça isto na véspera, não na hora:

```
git checkout master && git pull
npm ci
# 1. Abra o arquivo .env e confira que DATABASE_URL aponta para o banco LOCAL (localhost).
#    Se apontar para o Neon de produção, NÃO continue.
npx prisma migrate deploy
npm run db:seed                                   # cria as contas de demonstração (apaga o que houver NO BANCO LOCAL)
npx tsx prisma/simulate-quarter.ts --dry-run      # mostra o host e o plano; confira que é localhost
npx tsx prisma/simulate-quarter.ts --yes          # grava o trimestre simulado
npm run build && npm start                        # abre em http://localhost:3000
```

O `next dev` não funciona (a política de segurança do navegador bloqueia); use sempre `build` + `start`.

A simulação cria 5 clientes fictícios (Clínica Aurora, Studio Vita Pilates, Doce Raiz, Mendes & Prado e Terra Viva), ~360 demandas de julho até hoje, sessões de trabalho, projetos, captações, agenda, metas e OKRs. A **Performance** tem dados do trimestre anterior (julho a setembro): escolha **"Trimestre anterior"** no período para ver tudo cheio.

### 1.3 Contas (senha de todas: `Samps@2026`)

| Conta | Para quê |
|-------|----------|
| `admin@samps.digital` | Conduzir quase toda a apresentação (vê tudo) |
| `gestao@samps.digital` | Mostrar a visão de gestão sem ser admin |
| `social@samps.digital` | Aprovar e publicar (Maria Souza, líder do Social Media) |
| `designer@samps.digital` | Fila do executor (João Lima, líder do Design) |
| `editor@samps.digital` | Ver o **resumo do dia** (Luiza Martins, não é líder) |
| `cliente@samps.digital` | Portal do cliente (só no ambiente de produção/seed; no local com a simulação ela não está ligada a nenhum cliente) |

Abra **duas janelas**: uma normal (admin) e uma anônima (para trocar de papel sem sair).

### 1.4 Checklist de 10 minutos antes

- [ ] Abrir o app, entrar como admin e ver o **Painel** carregar.
- [ ] Abrir `/performance` e conferir que **não aparece** "Não foi possível carregar" (o banco de produção precisa das migrações).
- [ ] Ter um cliente com quadro e pelo menos 1 cartão.
- [ ] Zoom do navegador em 100–110%, janela maximizada, sem DevTools, notificações do computador desligadas.
- [ ] Capturas do plano B abertas em uma pasta, caso o app falhe.
- [ ] Este roteiro aberto ao lado.

---

## 2. Roteiro (35 min)

### Abertura (1 min)

> "Hoje mostro o Samps OS do jeito que o time vai usar: primeiro a operação do dia a dia, depois a visão da gestão e, por fim, os números: indicadores, metas e OKRs. No fim eu conto o que ainda depende de vocês."

---

### Bloco 1 — Visão da gestão (4 min)

**Login:** `admin@samps.digital`

| # | Onde ir | O que fazer | O que falar |
|---|---------|-------------|-------------|
| 1.1 | `/login` | Entrar | "Mesma identidade visual da marca em todas as telas." |
| 1.2 | **Painel** | Apontar os números do topo: em aberto, atrasadas, sem responsável, concluídas hoje | "Em dez segundos a gestão sabe como está o dia." |
| 1.3 | Painel | Mostrar a faixa de etapas (Briefing, A fazer, Produção, Revisão, Publicação) | "É o caminho da demanda. Cada número é quantas estão em cada etapa agora." |
| 1.4 | Painel | Mostrar **Carga por pessoa** e **Carga por setor** | "Quem está sobrecarregado e quem está livre." |
| 1.5 | Painel | Mostrar o bloco **Precisa de você** | "As demandas atrasadas e sem responsável sobem para cá. Ninguém precisa procurar." |
| 1.6 | Topo | Mostrar o sino e o ícone de avisos | "Menções e avisos chegam aqui." |

*Captura de apoio:* `01-painel-gestao.png`

**Não fazer aqui:** abrir configurações.

---

### Bloco 2 — Clientes e o quadro do cliente (7 min)

| # | Onde ir | O que fazer | O que falar |
|---|---------|-------------|-------------|
| 2.1 | **Clientes** | Mostrar a lista | "Cada cliente tem ficha, contrato e quadro." |
| 2.2 | Abrir um cliente | Mostrar dados, responsáveis, links de contrato e estudo | "Tudo do cliente em um lugar: contrato, quem atende, aniversário na agenda." |
| 2.3 | Quadro do cliente | Mostrar as colunas, o seletor de mês e a alternância **Quadro / Calendário** | "O quadro é por mês (competência). O time pode criar colunas próprias." |
| 2.4 | Quadro | **Filtros** → escolher um responsável ou prazo | "Filtra por cliente, responsável, setor, prioridade e prazo. O filtro fica no endereço da página, dá para mandar o link." |
| 2.5 | Quadro | Abrir um cartão | "Briefing, produção, comentários e histórico no mesmo lugar." |
| 2.6 | Cartão | Nos comentários, digitar `@` e escolher uma pessoa, enviar | "A menção avisa a pessoa pelo sino. Menos mensagem solta no WhatsApp." |
| 2.7 | Quadro | Botão **Demanda avulsa** | "Pedido fora do contrato entra aqui e fica marcado como extra." |

*Capturas de apoio:* `02-clientes.png`, `03-ficha-cliente.png`, `04-quadro-cliente.png`

**Se perguntarem sobre anexos:** "Os materiais entram por link (Drive), então o banco não fica pesado com arquivos. Se mais para a frente quiserem anexar arquivo direto, dá para mudar."

---

### Bloco 3 — O caminho de uma demanda (8 min)

Este é o coração da apresentação. Mostre **uma demanda do começo ao fim**, trocando de conta.

| # | Quem | Onde ir | O que fazer | O que falar |
|---|------|---------|-------------|-------------|
| 3.1 | Gestão/Social | **Demandas** → **Nova Demanda** | Escolher cliente, digitar título, criar | "Nasce em *A planejar*, no quadro do cliente e no quadro geral." |
| 3.2 | Social | Abrir o cartão | Preencher o briefing e **Concluir briefing** | "Depois de concluído, o briefing trava e a demanda vai para o setor. Evita mudança de escopo no meio do caminho." |
| 3.3 | Designer (janela anônima, `designer@`) | **Meu Painel** | **Assumir** a demanda, **Iniciar produção** | "Cada executor vê só a fila dele. O cronômetro registra o tempo trabalhado." |
| 3.4 | Designer | Meu Painel | Pausar (escolher um motivo) e retomar; depois **entregar para revisão** com o link do material | "Pausa com motivo. A entrega exige o link do material." |
| 3.5 | Social (`social@`) | **Meu Painel** | Abrir a demanda em revisão e **Solicitar ajuste** (ou **Aprovar**) | "Quem revisa nunca é o executor. O ajuste volta para o designer com o comentário." |
| 3.6 | Social | Mesma demanda | Depois de aprovada, registrar a publicação com o link | "Só publica depois de aprovada. Cada passo fica no histórico." |
| 3.7 | Gestão | **Demandas** | Mostrar o quadro geral com a demanda na coluna certa | "A gestão não precisa perguntar onde está: o quadro mostra." |

*Capturas de apoio:* `05-demandas.png`, `17-meu-painel-designer.png`

**Dica de tempo:** se o tempo apertar, faça 3.1, 3.2, 3.3 e 3.5, e conte o resto.

---

### Bloco 4 — Setores, agenda, projetos e captações (4 min)

| # | Onde ir | O que fazer | O que falar |
|---|---------|-------------|-------------|
| 4.1 | **Setores** | Mostrar a fila de um setor | "Cada setor tem a sua fila e quem a lidera." |
| 4.2 | **Agenda** | Mostrar eventos, prazos e aniversários | "Reuniões, prazos de entrega e aniversários no mesmo calendário." |
| 4.3 | **Projetos** | Abrir um projeto | "Entregas maiores, como um lançamento: checklist, participantes e demandas ligadas." |
| 4.4 | **Captações** | Mostrar as gravações (feitas e planejadas) | "A captação aparece antes da edição. O editor sabe quando o material chega." |
| 4.5 | Home/topo | Apontar o **mural de avisos** | "Aviso urgente ou comemoração aparece para todo o time." |

*Capturas de apoio:* `06-setores.png`, `07-agenda.png`, `08-projetos.png`, `09-captacoes.png`

---

### Bloco 5 — Performance: indicadores, metas e OKRs (10 min)

O ponto alto. **Use o ambiente com a simulação ou as capturas** (veja 1.1). Vá em **Performance** e, no filtro de período, escolha **Trimestre anterior**.

| # | Onde ir | O que fazer | O que falar |
|---|---------|-------------|-------------|
| 5.1 | **Performance → Visão geral** | Ler a frase de destaque e os cinco cartões (concluídas, no prazo, retrabalho, tempo trabalhado, tempo até concluir) | "Cada número compara com o período anterior. Verde melhorou, vermelho piorou." |
| 5.2 | Visão geral | Mostrar o gráfico de entregas por dia e o bloco **Pede atenção** | "O gráfico mostra o ritmo. O bloco mostra o que exige ação agora." |
| 5.3 | Visão geral | Usar os filtros de **setor** e **cliente** | "Mesma leitura para a agência toda, um setor ou um cliente." |
| 5.4 | **Indicadores** | Abrir **Por pessoa** e **Por tipo** | "Quanto cada pessoa entregou, quanto no prazo e o tempo médio por tipo de conteúdo. Com poucas entregas aparece o aviso de amostra pequena." |
| 5.5 | Indicadores | **Exportar CSV** | "Sai em planilha para quem quiser analisar." |
| 5.6 | **Metas** | Mostrar metas da agência, por setor e por pessoa | "A meta dá régua ao indicador. Verde: atingida. Amarelo: perto. Vermelho: abaixo." |
| 5.7 | Metas | Explicar **"No ritmo"** | "Meta de quantidade, como entregar 320 no trimestre, compara com o ritmo do período. No quinto dia não faz sentido cobrar 100%." |
| 5.8 | Metas | **Ver encerradas** | "As metas do trimestre passado ficam guardadas: quais foram batidas e quais não." |
| 5.9 | **OKRs** | Abrir um objetivo da agência | "Objetivo é onde queremos chegar; resultado-chave é como medimos." |
| 5.10 | OKRs | Mostrar um resultado-chave **automático** (vem do indicador) e um **manual** (com check-in) | "O automático se atualiza sozinho. O manual alguém atualiza toda segunda, com uma nota." |
| 5.11 | OKRs | Mostrar um objetivo de setor ligado ao da agência | "Os objetivos se desdobram: agência, setor, pessoa." |
| 5.12 | OKRs | Trocar para **Trimestre anterior** | "Fica o histórico do que foi cumprido." |

*Capturas de apoio:* `10-performance-visao-geral.png`, `11-performance-indicadores.png`, `12-performance-metas.png`, `13-performance-okrs.png`, `14-performance-okrs-anterior.png`

**Quem vê o quê**

- **Visão geral, Metas, Indicadores e OKRs completos:** administração e gestão.
- **Funcionários:** a aba **Meu resumo**, com os próprios números (`18-meu-resumo.png`).

---

### Bloco 6 — Resumo do dia e relatórios (3 min)

| # | Onde ir | O que fazer | O que falar |
|---|---------|-------------|-------------|
| 6.1 | Janela anônima → entrar como `editor@samps.digital` | Mostrar o **resumo do dia** que abre ao entrar | "O funcionário abre o sistema e já vê como foi o dia anterior, com as metas dele. Aparece uma vez por dia." |
| 6.2 | Menu **Meu resumo** | Mostrar a página, o botão de baixar e o período | "Ele pode rever e baixar quando quiser." |
| 6.3 | (só falar) | — | "Líderes recebem um resumo diário e gestores um semanal, por e-mail. O envio fica desligado até configurarmos o e-mail da empresa. A tela já existe." |

**Atenção:** o resumo do dia só aparece para quem **não é líder de setor**. As contas `designer@`, `social@` e `videomaker@` lideram setores e não o veem. Use `editor@`. Depois de fechar, ele não volta no mesmo dia.

---

### Bloco 7 — O cliente enxerga o que é dele (3 min)

**Conta:** `cliente@samps.digital` (janela anônima, ambiente de produção/seed)

| # | Onde ir | O que fazer | O que falar |
|---|---------|-------------|-------------|
| 7.1 | **Portal** (visão geral) | Mostrar a página inicial | "O cliente vê só a empresa dele, numa tela mais leve que a interna." |
| 7.2 | Calendário / Próximas entregas / Próximas publicações | Abrir uma delas | "Ele acompanha o que vem aí sem perguntar para a agência." |
| 7.3 | Materiais concluídos | Abrir | "O que foi aprovado e publicado fica disponível." |

**Importante:** o portal só mostra o que foi **aprovado ou publicado**. Rascunho e conversa interna nunca aparecem.

*Se estiver no ambiente local com a simulação:* pule este bloco, ou use "Visualizar como cliente" a partir de um cliente.

---

### Bloco 8 — Equipe e configurações (2 min, rápido)

| # | Onde ir | O que falar |
|---|---------|-------------|
| 8.1 | **Equipe** | "Cadastro de pessoas, convites e setores." |
| 8.2 | **Configurações** | "Funções e permissões, setores, tipos de conteúdo, prioridades, status, avisos. A gestão ajusta sem depender de desenvolvedor." |
| 8.3 | **Histórico** | "Quem fez o quê e quando, para auditoria." |
| 8.4 | Barra **Pesquisar** (topo) | "Busca global: cliente, demanda, pessoa." |

*Capturas de apoio:* `15-equipe.png`, `16-configuracoes.png`

---

### Fechamento (2 min)

> "Resumindo: a operação roda do briefing à publicação com dono e prazo em cada etapa; a gestão vê o dia em segundos; e, a cada trimestre, indicadores, metas e OKRs mostram se estamos melhorando. O que falta agora é do lado de vocês: a conta de e-mail e hospedagem para eu fazer o repasse, a validação do envio de relatórios e a agenda do Google."

**Próximos passos (diga em voz alta, nesta ordem):**

1. **Repasse:** migrar o banco e o site para a conta da Samps e apagar os dados e contas de teste.
2. **E-mails de relatório:** ligar quando o domínio de e-mail da empresa estiver verificado (cabe no plano gratuito, em volume baixo).
3. **Google Agenda:** definir com vocês o que sincroniza (só leitura ou ida e volta; agenda inteira ou só compromissos) quando a conta estiver disponível.
4. **Atualização técnica:** subir a versão do framework (Next 16) antes de usar com clientes reais.

---

## 3. Perguntas que podem aparecer (e respostas honestas)

| Pergunta | Resposta |
|----------|----------|
| "Dá para anexar arquivo na demanda?" | "Hoje o material entra por link do Drive. Foi uma escolha para o banco não pesar. Se quiserem arquivo direto, é uma nova etapa." |
| "E a pontuação / bonificação da equipe?" | "Ficou fora desta entrega. Se vocês quiserem, entra depois, com as regras que vocês definirem." |
| "Dá para controlar a capacidade de 8h por pessoa?" | "Fora desta entrega. O sistema já mede o tempo trabalhado por pessoa (cronômetro), que é a base para isso." |
| "Os relatórios por e-mail já funcionam?" | "O sistema já gera. O envio está desligado até configurarmos o e-mail da empresa." |
| "Integra com o Google Agenda?" | "Vai ser feito quando a conta de vocês estiver pronta, depois de definirmos o que sincroniza." |
| "O que o cliente vê?" | "Só o que foi aprovado ou publicado, só da empresa dele." |
| "É seguro? Quem vê o quê?" | "Cada função tem permissões, ajustáveis pela gestão. Há registro de histórico e proteção contra tentativas de login em excesso." |
| "Esses dados são reais?" | "São de demonstração. Antes do uso real, apagamos as contas e dados de teste." |
| "Funciona no celular?" | "Sim, as telas se adaptam. Foi revisado em tela de celular." |
| "Quanto custa manter?" | "Hoje roda em planos gratuitos/iniciais de hospedagem e banco. O custo cresce com o uso. Posso detalhar depois." |
| "Quem faz a manutenção?" | "O projeto está documentado em `docs/superpowers/` (guias, planos e especificações), e há testes automáticos e verificações no GitHub a cada alteração." |

---

## 4. Plano B (se algo quebrar ao vivo)

| Problema | Ação |
|----------|------|
| Login falha | Tentar `admin@samps.digital`; se persistir, passar para as capturas |
| Performance mostra "Não foi possível carregar" | Atualizar uma vez. Se persistir, as migrações podem não ter sido aplicadas: use as capturas e diga "a base de produção está sendo preparada" |
| Performance vazia | É o esperado com poucos dados. Use o ambiente com simulação ou as capturas (10 a 14) |
| Banco lento (Neon acordando) | Atualizar a página uma vez e continuar falando; a primeira carga demora |
| Cronômetro ou ação não responde | Não insistir. Mostrar a tela e explicar o passo, seguir para o próximo |
| Menção não notifica | Mostrar o campo e explicar; não insistir |
| Resumo do dia não aparece | Normal se já foi fechado hoje ou se a conta é de líder; mostrar a página **Meu resumo** |

---

## 5. Tempo resumido

| Minuto | Bloco |
|--------|-------|
| 0–1 | Abertura |
| 1–5 | Visão da gestão (Painel) |
| 5–12 | Clientes e quadro do cliente |
| 12–20 | O caminho de uma demanda |
| 20–24 | Setores, agenda, projetos, captações |
| 24–34 | Performance: indicadores, metas, OKRs |
| 34–37 | Resumo do dia e relatórios |
| 37–40 | Portal do cliente |
| 40–42 | Equipe e configurações |
| 42–44 | Fechamento e próximos passos |

Se precisar encurtar para 25 minutos: faça Blocos 1, 3 (resumido), 5 e Fechamento, e só **cite** os demais.

---

## 6. Depois da apresentação

- [ ] Anotar decisões e pedidos (Google Agenda, e-mails, prazos do repasse).
- [ ] Combinar a data do repasse para a conta da Samps (banco, site, domínio de e-mail).
- [ ] Apagar contas e dados de teste no repasse (a senha padrão `Samps@2026` está nos documentos do repositório).
- [ ] Verificar de novo, na conta nova, a proteção da Vercel e os checks obrigatórios do GitHub.
- [ ] Atualizar `docs/superpowers/plans/2026-08-04-roadmap-master.md` com o que ficou combinado.
