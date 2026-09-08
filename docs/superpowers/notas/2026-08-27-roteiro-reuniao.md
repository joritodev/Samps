# Roteiro de execução — reunião Samps OS

**Data:** 2026-08-27  
**App:** https://samps-os.vercel.app (ou http://localhost:3000)  
**Duração sugerida:** 25–30 min (apresentação) + 10–15 min (pedidos / dúvidas)

---

## Antes de começar (5 min)

1. Abrir o app em janela limpa (sem DevTools).
2. Ter dois logins prontos:
   - Gestão: `gestao@samps.digital` / `Samps@2026`
   - Cliente: `cliente@samps.digital` / `Samps@2026`
3. Aba 1 = intranet (gestão). Aba 2 = portal (cliente) — ou janela anônima.
4. Confirmar que há um cliente com quadro e pelo menos 1 cartão.
5. Abrir este roteiro ao lado (ou impresso).

**Frase de abertura (30 s):**

> “Hoje mostro três coisas: a cara nova do Samps OS, o que o time já consegue operar no dia a dia, e o portal do cliente. No final peço três inputs para as próximas fatias.”

---

## Bloco 1 — Identidade (4 min)

| # | Ação | Falar |
|---|------|--------|
| 1.1 | Logout se estiver logado → `/login` | “Login unificado. Mesma marca da intranet. Sem o visual antigo inventado.” |
| 1.2 | Entrar com `gestao@…` | — |
| 1.3 | Apontar sidebar: logo câmera + tagline | “Cyan e Ember da marca. Tema só claro/escuro.” |
| 1.4 | Abrir `/painel-gestao` | “Painel sem a ‘caixa’ genérica. KPIs com a tipografia de dados.” |

**Não fazer aqui:** configs profundas, settings filhos.

---

## Bloco 2 — Quadro do cliente (6 min)

| # | Ação | Falar |
|---|------|--------|
| 2.1 | Ir em Clientes → abrir um cliente → Quadro | “Quadro do cliente: colunas que o time personaliza.” |
| 2.2 | Se puder: criar ou apontar uma coluna custom | “Coluna livre — não trava o ciclo de status.” |
| 2.3 | Arrastar um cartão entre colunas | “Organização visual. Status operacional continua sendo o do ciclo.” |
| 2.4 | Abrir um cartão (sheet) | “Briefing, produção, comentários — no mesmo lugar.” |
| 2.5 | No comentário: digitar `@` + nome de alguém do time → enviar | “Menção gera notificação. Menos WhatsApp para ‘olha esse cartão’.” |
| 2.6 | Apontar o sino (não lidas) | “Aparece aqui.” |

**Honestidade se perguntarem “criar task / Nova demanda”:**

> “Criar demanda pelo botão já funciona (cliente + título → A planejar). Mover para qualquer coluna também. Escolher a coluna no momento de criar ainda pode evoluir — o fluxo oficial de teste está em `2026-09-04-acessos-temporarios-teste.md`.”

---

## Bloco 3 — Performance (4 min)

| # | Ação | Falar |
|---|------|--------|
| 3.1 | Abrir `/performance` | “Relatório de produtividade.” |
| 3.2 | Aba Resumo → Por pessoa → Por tipo | “Pergunta da reunião: quanto a Maria entregou e tempo médio por tipo (carrossel, estático…).” |
| 3.3 | Mostrar filtro de período (mês / de–até) | “Gestão vê a org; colaborador só a própria linha.” |
| 3.4 | Clicar Exportar CSV (se couber) | “CSV da aba ativa.” |
| 3.5 | Se n < 3, apontar “Amostra pequena” | “Média com 1 item mente — por isso o aviso.” |

---

## Bloco 4 — Tipos / vídeo demo (2 min)

| # | Ação | Falar |
|---|------|--------|
| 4.1 | `/configuracoes/tipos` | “Categorias com sufixo (demo) — só para teste e apresentação.” |
| 4.2 | Listar 2–3 (Reels demo, Institucional, Bastidores) | “Precisamos da lista oficial de vocês para travar a fatia de briefing de vídeo.” |

---

## Bloco 5 — Portal do cliente (5 min)

| # | Ação | Falar |
|---|------|--------|
| 5.1 | (Opcional) Em um cliente: “Visualizar como cliente” **ou** logout → `cliente@…` | “Visão do cliente externo.” |
| 5.2 | Home `/portal` | “Mais leve que a intranet. Menos cara de dashboard interno.” |
| 5.3 | Uma subpágina (Entregas ou Arquivos) | “Mesmo scaffold, densidade menor.” |
| 5.4 | Se estiver em preview interno: “Sair da visualização” | “Time interno consegue entrar e sair do preview.” |

---

## Bloco 6 — O que mudou / saiu (2 min, verbal)

Não precisa de tela. Ler se perguntarem “o que mudou?”:

**Entrou**
- Identidade Samps (login, sidebar, boards, gestão, portal)
- Relatórios por pessoa/tipo + CSV
- Colunas livres no quadro
- Menções `@` com notificação
- Acessibilidade básica (card teclado, nomes no chrome)

**Saiu / desligou**
- Visual Vibe no login
- 7 cores de accent pastéis
- Rotas legacy `(app)` paralelas
- Empty states sem próximo passo

**Ainda não** (fila pós-set/08)
- Anexos Drive na demanda (próxima fatia **3.2**)
- CSP em enforce (**3.7**)
- Briefing obrigatório por categoria de vídeo (oficial) (**3.3**)
- Abrir visibilidade cross-setor (regra da Samps) (**3.4**)
- Pontuação com regras da Samps (**3.5**)

---

## Bloco 7 — Pedidos (10 min) — o mais importante

Abrir bloco de notas e **escrever as respostas na hora**.

### Pedido 1 — Vídeo (fatia 3.3)
> “Quais categorias oficiais de vídeo usam hoje e quais campos são obrigatórios em cada uma (duração, formato, legendas, referência…)?”

**Anotar:**

| Categoria | Campos obrigatórios |
|-----------|---------------------|
| | |
| | |

### Pedido 2 — Visibilidade (fatia 3.4)
> “Quando pediram ‘remover a restrição’, o que exatamente o time precisa ver? Só leitura de outras filas? Sem escrever no setor alheio?”

**Anotar:** sim / não / exemplos.

### Pedido 3 — Pontuação (fatia 3.5)
> “Vocês têm o documento de pesos/priorização? Sem isso não implementamos a fórmula.”

**Anotar:** tem / não tem / prazo de envio.

### Pedido 4 — Prioridade do próximo sprint
> “Criar demanda já está no ar. Entre anexos Drive e CSP — o que vem primeiro? Ou outro pedido?”

**Marcar:** [ ] Anexos (3.2)  [ ] CSP (3.7)  [ ] Outro: ___

---

## Fechamento (1 min)

> “Resumo: visual e portal apresentáveis; operação com relatório, colunas e menções. Próximo ciclo = o que vocês priorizarem + os três inputs. Mandamos a ata ainda hoje.”

---

## Checklist pós-reunião (você / time)

- [ ] Enviar ata com decisões e tabela de categorias (se veio)
- [ ] Atualizar `docs/superpowers/notas/` com a data da reunião
- [ ] Atualizar “Próxima fatia” no roadmap master
- [ ] Abrir fatia acordada (default: **3.2** anexos; senão 3.7 CSP)

---

## Plano B (se algo quebrar ao vivo)

| Problema | Ação |
|----------|------|
| Login falha | Usar Vercel produção; outro e-mail (`admin@…`) |
| Quadro vazio | Ir para `/performance` e `/portal` primeiro; quadro depois |
| Menção não notifica | Mostrar placeholder + explicar lógica; não insistir |
| Neon lento | Refresh uma vez; senão pular para screenshots/produção |

---

## Timing resumido

| Minuto | Bloco |
|--------|--------|
| 0–1 | Abertura |
| 1–5 | Identidade + painel |
| 5–11 | Quadro + menção |
| 11–15 | Performance |
| 15–17 | Tipos demo |
| 17–22 | Portal |
| 22–24 | Mudou / ainda não |
| 24–35 | Pedidos + prioridade |
| 35 | Fechamento |
