# Auditoria completa do Samps OS

**Data:** 2026-10-07 · **Versão auditada:** `master` em `65748e8` (PRs #82 e #84) · **Ambiente:** build de produção local, banco local com a simulação de um trimestre.

> Limite da auditoria: não toquei na produção (Vercel, Neon, Resend, Blob). Tudo abaixo foi observado no código e no app rodando localmente, em Chromium. Onde um achado depende de configuração de produção, está dito.

---

## 0. Situação depois das correções

Corrigido em seguida (PR de segurança e acessibilidade), e conferido de novo no app compilado:

| Item | Resultado |
|------|-----------|
| B1 Tipos de conteúdo | Corrigido (PR anterior); abre para admin e gestão |
| S1 a S5 Controle de acesso | Corrigido: toda ação passa por uma guarda única (permissão, vínculo com o cliente, status, responsável ou setor). Repeti as mais de 80 chamadas do teste: todas as chamadas entre clientes e do cliente externo agora são negadas; os fluxos legítimos (assumir, produzir, aprovar, ajustar, publicar, comentar, atribuir) seguem funcionando |
| S4 Conta desativada | Corrigido: perde a sessão na hora e cai no login, sem laço |
| S6 Senha na URL | Corrigido: `method="post"` e botão só depois do carregamento |
| S7 Links | Corrigido: só `http`/`https` ao salvar; links antigos inseguros não clicam |
| S8 Senhas | Corrigido: mínimo de 8 no servidor (reset e primeiro acesso), limite de 3 pedidos de redefinição por 15 min, token guardado em hash |
| S10 CSV | Corrigido: células que começam com `=`, `+`, `-`, `@` são neutralizadas |
| S11 Perfil | Corrigido: trocar e-mail ou senha exige a senha atual |
| B3 "Sem responsável" | Corrigido: não conta cartões ainda em briefing |
| Acessibilidade | De 10 tipos de violação (2 críticas) para 0 nas 25 telas e 52 execuções do axe-core; sem rolagem horizontal no celular |
| Avisos (toast) | Passaram para o rodapé central; não cobrem mais a barra de ferramentas |
| Rotas | 280 verificações de rota por perfil: nenhuma quebrada, nenhum erro 5xx |

**Continua em aberto (de propósito):**

- **S9 Next 14:** o upgrade fica com você, na sua máquina.
- **S12 CSP com `unsafe-inline`:** depende do upgrade do Next.
- **S13 Agenda e Quadro Geral:** decisão de produto; hoje qualquer funcionário edita reuniões e vê títulos de todos os clientes no Quadro Geral.
- **S14 Bloqueio de login:** a mensagem continua genérica.
- **B2 Erro #310 em redirecionamentos:** é do próprio Next 14.2; sai com o upgrade.
- **B4 Upload de capa:** exige `BLOB_READ_WRITE_TOKEN` na Vercel.
- Sessões já abertas (JWT) não são derrubadas ao trocar a senha; só a desativação da conta corta o acesso.

---

## 1. Como foi feito

| Frente | O que rodei | Resultado |
|--------|-------------|-----------|
| Rotas e perfis | 56 rotas × 8 perfis (admin, gestão, social, designer, videomaker, editor, tráfego, cliente externo) + visitante | Roteamento por perfil correto; 1 página quebrada (item B1) |
| Controle de acesso | Mais de 80 chamadas diretas às server actions, como cliente externo, designer e editor, incluindo designer sem vínculo com o cliente | **Falhas graves** (itens S1 a S5) |
| Botões e telas | Robô clicou em 300 botões, abas e seletores em 31 telas (como admin) | 0 erros de console, 0 telas quebradas |
| Números | Conferi Visão geral e Painel da Gestão contra consultas SQL | **Batem exatamente** (307 entregas, 81% no prazo, 25% retrabalho, 622,9 h, 6,0 dias; 73 em aberto, 7 atrasadas, 29 sem responsável) |
| Fluxo da demanda | Criar, briefing, atribuição, assumir e iniciar produção, pela interface | Funciona. Pausar, entregar, revisar e publicar conferidos pelas ações e pelos 726 testes |
| Login e sessão | 8 tentativas de login, cookies, cabeçalhos HTTP, rotas de cron e upload sem credencial | Bom, com ressalvas (S6, S8) |
| Acessibilidade | axe-core em 25 telas, desktop e celular | 10 tipos de violação (seção 5) |
| Celular | 390 px nas telas principais | Sem rolagem horizontal |
| Dependências | `npm audit` de produção | 15 avisos (seção 3) |
| Velocidade | Carga de 12 telas, local | 200 a 850 ms; as mais pesadas são Setor (0,8 s) e Agenda (0,6 s) |

**Não testei:** envio real de e-mail, cron com segredo, upload de capa com Vercel Blob, Google Agenda (não existe), pausa/entrega/aprovação pela interface, tema escuro, impressão/PDF, outros navegadores além do Chromium, carga com muitos usuários.

---

## 2. Segurança: controle de acesso (o ponto mais importante)

**Causa raiz.** O banco só aplica isolamento por cliente no portal (`withUserScope`). Em todo o resto, a única defesa é a checagem dentro de cada ação, e várias ações checam só "está logado". Dezenas de ações são assim, e eu testei as de maior risco.

**Como a exploração funciona na prática.** Um funcionário logado (qualquer perfil interno) abre a tela que contém a ação e chama a ação com o identificador de uma demanda de **outro cliente**. O cliente externo fica contido porque o servidor só aceita a ação a partir das páginas que a incluem, e o middleware o prende no portal; por isso classifiquei como risco de **usuário interno**, não de cliente.

| # | Gravidade | Achado | Prova | Correção sugerida |
|---|-----------|--------|-------|-------------------|
| S1 | **Alta** | `assumirDemanda` (`app/actions/designer.ts`) só exige login: sem permissão, sem escopo de cliente, sem validar status. Qualquer pessoa vira responsável por qualquer demanda e força o status "Em produção" (pulando o ciclo) | Executou para cliente externo e designer | `requirePermission("demands.edit")`, `canAccessClient`, aceitar só status Demandada/Disponível |
| S2 | **Alta** | `concluirProducao` exige só `demands.edit`; ignora cliente, responsável e status. Designer sem vínculo com o cliente mandou a demanda alheia para revisão | Executou para designer sem vínculo | Escopo de cliente, ser o responsável, status "Em produção" |
| S3 | **Alta** | `updateVisibilityAction` (visível ao cliente) sem nenhuma checagem. Quem for funcionário pode **expor demandas internas no portal** de um cliente ou escondê-las | Executou | `demands.edit` + escopo de cliente |
| S4 | **Alta** | Usuário desativado **continua com acesso**. O login recusa, mas a sessão (7 dias) nunca consulta o status. Demissão não corta o acesso | `status=INACTIVE` e a sessão seguiu válida com permissões | Checar `status` ativo em `getSessionUser` (já relê o banco a cada requisição) |
| S5 | Média | Sem escopo de cliente nem permissão: `addCommentAction` (aceita `clientId` trocado), `moveCardAction`, `switchCompetenceAction`, `createNextCompetenceAction`, `addDriveAttachmentAction` (checa permissão mas não o vínculo com o cliente), `listDemandDelaysAction`, `concluirBriefing` | Executaram para designer sem vínculo (`concluirBriefing` só não passou porque a demanda do teste já estava demandada; o código não tem a checagem). Comentário e anexo passaram com `clientId` de outro cliente | Mesma checagem comum de escopo para todas |
| S6 | Média | Formulário de login sem `method="post"`: se o clique vier antes do JavaScript carregar, e-mail **e senha vão na URL** (`/login?email=...&password=...`), parando em histórico e logs | Reproduzido | `method="post"` e `action` no formulário |
| S7 | Média | Links sem validação de esquema: `materialUrl`, `publishedUrl`, anexos e avatar aceitam `javascript:` e `data:` (o validador de URL aceita qualquer esquema). Anexo marcado "visível ao cliente" chega ao portal como link | `javascript:` salvo e renderizado como `href` no portal. **Não executou** no Chromium, porque o link abre com `rel=noreferrer` em nova aba; é defesa em camada, não garantia | Aceitar só `http`/`https` (já existe `isHttpUrl` na agenda) |
| S8 | Média | Senha sem regra no servidor: o reset e o primeiro acesso aceitam qualquer senha (`"1"` passou); a regra de 8 caracteres é só do formulário. O reset não tem limite de pedidos (5 pedidos seguidos aceitos) e guarda o token em texto puro | Reproduzido | Validar ≥ 8 no servidor; limite por e-mail e IP; guardar o hash do token |
| S9 | Média | **Next 14.2.35**: 15 avisos (1 crítica, 11 altas). A maioria vale para hospedagem própria, Windows, rewrites e i18n; na Vercel parte é mitigada pela plataforma. Os relevantes aqui: negação de serviço em Server Actions e Server Components | `npm audit` | Subir para Next 15.5.x ou 16 (você já planejou) |
| S10 | Baixa | Exportação CSV sem proteção contra fórmula: um nome começando com `=`, `+`, `-` ou `@` vira fórmula no Excel. Qualquer funcionário edita o próprio nome | Leitura do código | Prefixar `'` nesses casos |
| S11 | Baixa | Perfil troca e-mail e senha sem pedir a senha atual e sem derrubar outras sessões | Leitura do código | Pedir senha atual |
| S12 | Baixa | CSP com `script-src 'unsafe-inline'` e `connect-src`/`img-src` com `https:` amplos | Cabeçalhos | Nonces (exige Next ≥ 15) |
| S13 | Baixa (decisão) | Agenda: qualquer funcionário altera ou apaga reuniões de outros. O Quadro Geral mostra títulos de todos os clientes a todos, mas o cartão não abre (inconsistente) | Testado | Decidir a regra e alinhar |
| S14 | Informativa | Bloqueio de login é por e-mail (5 erros em 15 min) e a tela mostra a mesma mensagem genérica, sem avisar do bloqueio; alguém pode travar a conta de outro | Testado | Mensagem "tente em 15 min" ou captcha |

**O que está bem feito:** cabeçalhos de segurança (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, CSP), cookies `HttpOnly` e `SameSite=Lax`, resposta única para e-mail inexistente no login e na recuperação, upload de capa (confere os bytes, reprocessa a imagem, remove EXIF, exige mesma origem), cron fechado sem segredo (503) e com comparação em tempo constante, nenhuma chave no repositório, nenhum `eval`/SQL cru com dados do usuário, portal com isolamento no banco, redirecionamento correto de cada perfil, cliente externo preso ao portal e sem acesso ao portal de outro cliente.

---

## 3. Bugs

| # | Gravidade | Bug | Situação |
|---|-----------|-----|----------|
| B1 | **Alta** | `/configuracoes/tipos` (Tipos de conteúdo) **quebrava para admin e gestão**: uma função era passada de um Server Component para um Client Component, o que o React proíbe em produção. Veio da fatia do briefing por categoria; nenhum teste cobria | **Corrigido** no commit `08d8a48` (branch `claude/serene-darwin-9gio0g`), verificado no app compilado. **Falta mesclar** |
| B2 | Baixa | Erro React #310 no console ao abrir direto uma URL que redireciona (por exemplo, o social abrindo `/painel-gestao`). Origem: o próprio `Router` do Next 14.2, não o código do app. A página termina certa | Some provavelmente com o upgrade do Next |
| B3 | Baixa | "Sem responsável" conta cartões ainda em planejamento (29 na simulação), o que deixa o número alarmante | Decisão de produto: contar só demandas já demandadas |
| B4 | Baixa | Upload de capa do quadro só funciona se `BLOB_READ_WRITE_TOKEN` estiver na Vercel; sem ele aparece "Armazenamento de imagens não configurado" | Conferir a variável |

Já corrigidos em #84: metas de contagem que apareciam vermelhas no começo do período, plural "1 clientes", período inicial da Performance.

---

## 4. Estatísticas

- **Visão geral (trimestre anterior):** 307 / 81% / 25% / 622,9 h / 6,0 dias, idênticos ao SQL.
- **Painel da Gestão:** 73 em aberto, 7 atrasadas, 29 sem responsável e a faixa de etapas (27 + 31 + 5 + 5 + 5 = 73), idênticos ao SQL.
- **Ressalva de leitura:** nos primeiros dias do período as taxas têm poucas amostras (ex.: "Vídeo no prazo 0%" com 1 entrega). A tela avisa "amostra pequena" só na aba Indicadores.

---

## 5. UI, UX e acessibilidade

**Erros automáticos (axe-core), do mais grave ao mais leve**

| Gravidade | Problema | Onde |
|-----------|----------|------|
| Crítica | Botões sem nome acessível (18) | Agenda (células de dia vazias desativadas), Histórico (3 filtros), Quadro do cliente (2) |
| Crítica | Seletor sem nome (2) | Quadro do cliente (seletor de competência) |
| Séria | Contraste insuficiente em 65 pontos | Selos pequenos: verde `#16833e` sobre `#e8f3ec` dá 4,24:1; vermelho `#dc2828` sobre `#fceaea` dá 4,13:1 (mínimo 4,5) |
| Séria | Controles interativos aninhados (52) | Cartões arrastáveis do quadro, com botões dentro (atrapalha teclado e leitor de tela) |
| Séria | Área rolável sem acesso por teclado (5) | Portal, Performance no celular |
| Moderada | `main` duplicado e dentro de outro marcador; sem `h1`; ordem de títulos | Quadro do cliente, Meu painel, OKRs |

**Observações de UX**

- A janela do cartão **fecha depois de cada ação** (assumir, iniciar produção). O resultado aparece só em um aviso rápido e o usuário precisa reabrir para ver o cronômetro.
- O aviso (toast) cobre a barra de ferramentas (Calendário, Lista, Indicadores) por alguns segundos.
- No celular, os filtros mostram "Todos os…" cortado, e a aba "Meu resumo" fica fora da tela.
- Quem erra a senha 5 vezes vê a mesma mensagem mesmo com a senha certa (S14).
- Estados vazios e mensagens de erro de formulário estão claros; o resto da navegação é consistente e rápida.

---

## 6. Prioridade sugerida

**Antes de usar com clientes reais (um PR de segurança):** S1, S2, S3, S4, S5, S6, S7, S8. A correção é uma checagem comum de "permissão + vínculo com o cliente + status" aplicada a cada ação, mais três ajustes pontuais (S4, S6, S8). Vale acompanhar de testes de acesso, que hoje não existem para essas ações.

**Antes da apresentação:** mesclar o conserto de B1 (a página Tipos). Sem ele, evite abrir Configurações → Tipos.

**Depois:** S9 (Next), S10 a S14, acessibilidade (botões sem nome e contraste são as correções mais baratas), B3.
