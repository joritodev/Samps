# Wizard — criação completa de cliente e quadro

**Data:** 2026-07-28  
**Status:** Aprovada (fatia B após Meu Painel colaborador)  
**Escopo:** UI do assistente `/clientes/quadro/criar` alinhada ao Prompt 2

## Problema

O backend (`BoardWizardInput` + `createClientBoardTransaction`) já persiste email, telefone, logo, notas, responsáveis extras, datas de contrato e portal — mas o wizard só expõe nome, segmento, cor, 2 responsáveis e quantidades fixas.

## Decisão

Completar os 6 passos do wizard sem alterar a transação (só wiring UI → payload existente).

## Campos por etapa

| Etapa | Campos adicionados |
|-------|-------------------|
| Cliente | email, telefone, URL logo, status, data início, notas internas |
| Responsáveis | social secundária, líder de conta |
| Contrato | data início/fim, dia renovação, observações |
| Portal | próximas publicações, logo, cor, contato agência |

## Aceite

1. Gestão cria cliente novo com todos os campos visíveis no wizard.
2. Cliente existente (`?clientId=`) pré-preenche dados do banco.
3. Quadro + portal + cartões contratuais criados como hoje.
4. `npx tsc --noEmit` limpo.
