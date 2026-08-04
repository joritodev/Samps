# Fase 5 — Pesquisa e decisões (escopo)

**Janela:** paralela às outras fases; os três 1-pagers ficam prontos até 18/08.
**Status deste documento:** escopo fechado.

> Esta fase **não produz código de produção**. Produz três documentos de decisão que a Samps precisa para responder o que perguntou na reunião. Cada um vira `docs/superpowers/notas/<data>-<assunto>.md`, com número em vez de opinião.
>
> Escrever no **Opus 5**. Coletar dado de preço e limite com busca na web no dia da escrita, porque preço de IA e de plataforma muda rápido.

---

## Decisão 5.1 — Assistente de IA

**Pergunta da reunião:** dá para integrar uma IA que cria e atualiza demandas? Quanto custa? Qual o risco de consumo imprevisível?

**O documento precisa responder:**
1. Casos de uso, em ordem de valor: (a) preencher briefing a partir de texto solto, (b) resumir comentários de uma demanda, (c) sugerir prioridade, (d) criar demanda por comando
2. Custo por operação, calculado com preço vigente e tamanho de prompt estimado, e o custo mensal em três cenários de volume (baixo/médio/alto)
3. Teto de gasto: como limitar de verdade (orçamento por mês, limite por usuário, fila, cache)
4. Risco: dado de cliente saindo para terceiro. O que pode e o que não pode ser enviado. Se o contrato com os clientes da Samps permite
5. Recomendação: o menor caso de uso que entrega valor e cabe num teto fixo (provavelmente "preencher briefing a partir de texto", com botão explícito e nunca automático)

**Aceite:** a gestão consegue decidir "sim/não" olhando um número de custo mensal máximo.

---

## Decisão 5.2 — Aplicativo mobile

**Pergunta da reunião:** dá para exportar o site como app, como o Lovable faz?

**O documento precisa responder:**

| Caminho | Esforço | O que entrega | O que não entrega |
|---------|---------|---------------|-------------------|
| Web responsiva (Fase 2, fatia 5) | já em andamento | uso pelo celular pelo navegador | ícone na tela inicial, push |
| PWA (manifest + service worker) | baixo | instalável, ícone, offline básico, push no Android | push confiável no iOS, presença em loja |
| Wrapper nativo (Capacitor) | médio | app em loja, push nas duas plataformas | ainda é a mesma web dentro de um container |
| App nativo/React Native | alto | experiência nativa de verdade | exige API separada e manutenção de dois clientes |

**Precisa conter:** o que muda para o usuário em cada caminho, custo de conta de loja e de manutenção, e por que o app nativo exige antes a discussão de API (Decisão 5.3).

**Recomendação esperada:** responsiva → PWA. Wrapper só se a Samps quiser presença em loja. Nativo não antes de 2027.

---

## Decisão 5.3 — Vender o sistema (multi-tenant) e backend separado

**Pergunta da reunião:** a Samps pode vender esse sistema para outros clientes? Já foi respondido na reunião que é complexo por causa das regras de negócio interligadas — este documento fecha a conta.

**O documento precisa responder:**
1. Diferença entre os três modelos:
   - **Instância por cliente** (deploy separado, banco separado): mais simples, escala por trabalho manual
   - **Multi-tenant com `tenantId`**: exige `tenantId` em toda tabela, todo query e toda policy de RLS; é uma refatoração transversal
   - **Licenciar o método, não o software** (foi o que a Samps já faz com o "Samps Educ"): risco zero de engenharia
2. O que hoje está amarrado à Samps: setores fixos, catálogo de tipos, regras de prioridade, fluxo de status, portal, papéis
3. Custo real da opção multi-tenant: contagem de tabelas afetadas, de queries e de policies, mais o custo permanente de suporte, onboarding, faturamento e SLA
4. Papel de um backend separado (NestJS + JWT Bearer): quando ele passa a ser necessário (app nativo, integração de terceiro, multi-tenant) e quando é só custo (hoje)
5. Recomendação em etapas: primeiro provar o valor operando na Samps; se houver demanda real de terceiros, começar por instância por cliente; multi-tenant só com contrato assinado na mão

**Aceite:** a Samps entende que "vender" tem três caminhos com preços muito diferentes, e qual deles cabe em 2026.

---

## Critério de saída da Fase 5

1. Três documentos escritos, com números datados e fonte
2. Cada um terminando em recomendação única e explícita
3. Nenhuma linha de código de produção adicionada por esta fase
4. Decisões levadas para a Samps na reunião de 18/08
