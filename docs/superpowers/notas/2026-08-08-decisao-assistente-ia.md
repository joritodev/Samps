# Decisão 5.1 — Assistente de IA

**Data:** 2026-08-08  
**Pergunta da reunião (28/07):** dá para integrar uma IA que cria e atualiza demandas? Quanto custa? Qual o risco de consumo imprevisível?  
**Fontes de preço:** [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing) (consultado em 08/08/2026).

---

## 1. Casos de uso (ordem de valor)

| # | Caso | Valor | Risco | Complexidade |
|---|------|-------|-------|--------------|
| A | Preencher briefing a partir de texto solto | Alto — reduz ida e volta social↔designer | Médio (dado de cliente no prompt) | Baixa |
| B | Resumir comentários de uma demanda | Médio — acelera handoff | Médio | Baixa |
| C | Sugerir prioridade | Médio — só se a Samps fechar as regras (Fase 3.5) | Baixo | Média |
| D | Criar / atualizar demanda por comando | Alto na teoria, alto risco de lixo operacional | Alto | Alta |

Criar demanda automaticamente **não** é o primeiro passo: o sistema já tem regras de contrato, briefing obrigatório e status. Um agente que “inventa” cartão sem validação vira retrabalho.

---

## 2. Custo por operação (números)

Modelo de referência para o MVP: **`gpt-5.4-nano`** (barato) ou **`gpt-5.4-mini`** (melhor qualidade). Preços oficiais por 1M tokens (contexto curto, Standard):

| Modelo | Input | Output |
|--------|------:|-------:|
| gpt-5.4-nano | US$ 0,20 | US$ 1,25 |
| gpt-5.4-mini | US$ 0,75 | US$ 4,50 |
| gpt-5.6-luna | US$ 0,20 | US$ 1,20 |

**Estimativa por chamada “preencher briefing”:** ~4 000 tokens de entrada (instrução + texto do social + campos do tipo) + ~1 500 de saída.

| Modelo | Custo / chamada |
|--------|----------------:|
| gpt-5.4-nano | ≈ **US$ 0,0027** |
| gpt-5.4-mini | ≈ **US$ 0,0098** |

### Cenários mensais (só caso A, botão explícito)

| Volume | Chamadas/mês | nano | mini |
|--------|-------------:|-----:|-----:|
| Baixo (piloto, ~2 pessoas) | 50 | ~US$ 0,14 | ~US$ 0,49 |
| Médio (time operacional) | 500 | ~US$ 1,35 | ~US$ 4,90 |
| Alto (toda a agência + uso intenso) | 2 000 | ~US$ 5,40 | ~US$ 19,60 |

Incluir caso B (resumo) dobra o volume de forma aproximada. Caso D (criar demanda) aumenta tokens e risco; não entra no teto do piloto.

**Teto recomendado para decidir sim/não:** orçamento OpenAI **US$ 30/mês** (≈ R$ 165–180 em câmbio típico), com alerta em 80% e corte em 100%. Nesse teto cabe o cenário alto em `mini` com folga.

---

## 3. Como limitar gasto de verdade

1. **Orçamento na conta OpenAI** (hard limit mensal) — única trava que funciona sem depender do app.
2. **Cota por usuário** no Samps OS (ex.: 20 chamadas/dia) + contador em `AuditLog` / tabela de uso.
3. **Botão explícito** — nunca auto-disparar em create/update de demanda.
4. **Cache** de resultados idênticos (mesmo hash do texto + ContentType) por 24h.
5. **Fila / timeout** — 1 chamada por vez por usuário; falha rápida se a API estiver lenta.
6. Modelo barato por padrão (`nano`); upgrade para `mini` só se a qualidade do piloto falhar.

Sem o item 1, qualquer bug de loop pode estourar a fatura.

---

## 4. Risco de dado de cliente

| Pode enviar | Não pode enviar |
|-------------|-----------------|
| Texto de briefing que o time já digitou | CPF/CNPJ, endereço completo, contrato financeiro |
| Nome do tipo de conteúdo e campos do formulário | Anexos binários, prints de WhatsApp com terceiros |
| Comentários internos **só** se a Samps confirmar no contrato com o cliente final | Credenciais, tokens, conteúdo do portal do cliente sem revisão |

Hoje o Samps OS processa dado de cliente da Samps Digital. Mandar texto para a OpenAI é **subprocessamento**. Antes de ligar em produção:

- Confirmar se os contratos com os clientes da Samps permitem subprocessador de IA (ou cláusula genérica de ferramentas).
- Preferir endpoint com residência de dados se a Samps exigir (OpenAI cobra uplift de ~10% em regional processing para modelos elegíveis pós-05/03/2026).
- Logar só metadados (tokens, usuário, demandaId) — **não** logar o prompt completo em claro no `AuditLog`.

---

## 5. Recomendação

**Sim para o menor caso de uso: (A) preencher briefing a partir de texto, com botão explícito e teto US$ 30/mês.**

Não implementar (D) criar/atualizar demanda por comando em 2026. (B) e (C) só depois do piloto de (A) e das regras de prioridade da Fase 3.

**Decisão pedida à gestão:** aprovar ou não um piloto de 30 dias com teto US$ 30 e modelo `gpt-5.4-nano`, medindo % de briefings aceitos sem edição.
