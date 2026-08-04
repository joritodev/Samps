# Escopo de contrato quantificado (Novo Cliente + edição)

**Data:** 2026-07-28  
**Status:** Aprovada em chat  
**Abordagem:** A — linhas no sheet Novo Cliente + edição na ficha

## Problema

No cadastro de cliente, “Escopo do contrato” é texto livre. Quantidades (feeds, stories, reels…) e periodicidade não viram `ContractService`, então a aba Contrato fica vazia e o fluxo contratual não se alimenta.

## Decisões

1. Ao criar cliente, salvar `ContractService` reais (não só notas).
2. Linhas = `ContentType` ativos (catálogo Configurações → Tipos).
3. Periodicidade por linha, default `monthly`; opções: `monthly` | `weekly` | `competence` | `one_shot`.
4. Qtd vazia/0 = ignorar; cliente pode ser criado sem itens (1+3).
5. **Editar escopo na ficha do cliente** (aba Contrato): mesmas linhas, persistir sync dos serviços ativos do contrato.

## Fora de escopo

- Alinhar wizard “Criar quadro” / componente compartilhado (C).
- Gerar cartões contratuais automaticamente neste fluxo.
- Soft-delete histórico complexo; sync simples (desativar ausentes, upsert presentes).

## UI

### Novo Cliente (`ClientsView` sheet)

Substituir textarea de escopo por:

| Tipo (nome ContentType) | Quantidade | Periodicidade |
|---|---|---|
| … | number ≥ 0 | select (default Por mês) |

- Observações opcionais → `Contract.notes`.
- Remover copy “itens cadastrados na tela do cliente”.
- Catálogo vazio: aviso + link Configurações → Tipos; criar cliente ainda permitido.

### Ficha do cliente (aba Contrato)

- Modo edição com as mesmas linhas (pré-preenchidas pelos serviços ativos + tipos do catálogo).
- Salvar atualiza quantidades/periodicidade; qtd 0 remove/desativa o serviço; tipos novos com qtd ≥ 1 criam serviço.
- Labels de periodicidade: `/ mês`, `/ semana`, `/ competência`, `pacote`.

## Dados

`createClient` / `updateClientContractServices`:

- Garante `Contract` ACTIVE se houver plano, notas ou ≥1 serviço.
- Por linha qtd ≥ 1: `name`, `quantity`, `periodicity`, `contentTypeId`, `demandType` via mapa de slug:
  - `stories` → STORY  
  - `reels` → REEL  
  - `estatico` | `carrossel` → FEED  
  - `video` | `motion` → VIDEO  
  - senão → OTHER  
- Sync na edição: serviços ativos do contrato alinhados ao payload (desativar os que saíram; criar/atualizar os demais).

## Carregamento

- `/clientes` e `/clientes/[id]` carregam tipos ativos no server e passam aos componentes client.

## Aceite

1. Criar cliente com 8 feeds/mês + 12 stories/mês → serviços na aba Contrato.
2. Criar sem quantidades → ok; sem serviços.
3. Editar na ficha: alterar qtd/periodicidade e salvar → lista atualiza.
4. Qtd 0 na edição remove o item da lista ativa.
5. Labels de periodicidade corretas na UI.
6. `npx tsc --noEmit` limpo.
