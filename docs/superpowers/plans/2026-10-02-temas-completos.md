# Plano da fatia — temas completos (catálogo de 8)

**Data:** 2026-10-02 · **Spec:** `specs/2026-10-02-temas-completos-design.md` (aprovar antes de executar).
**Playbook:** 1 fatia = 1 PR. **Sem schema, sem auth, sem upload** (cookie por dispositivo), então não exige replanejamento forte; segue o motor subagent-driven ou execução direta em sessão.
**Branch:** `feat/temas-completos`.

## Arquivos
- Criar: `lib/theme/palette.ts` (+ `.test.ts`): função pura `buildPalette(hue, mode, options)`.
- Criar: `lib/theme/themes.ts` (+ `.test.ts`): catálogo (`id`, `label`, `hue`, `options`), `parseTheme`.
- Criar: `scripts/gen-themes.mjs`: gera `app/themes.css` a partir do catálogo; `npm run themes:gen`.
- Criar: `app/themes.css` (gerado e commitado) + import em `app/globals.css`, **antes** das regras `data-accent` e `data-board-accent` (a ordem garante a precedência).
- Alterar: `lib/theme/preferences.ts` (`THEME_COOKIE`, `parseTheme`, `applyPreferences`, `PREFERENCES_BOOT_SCRIPT`) e `preferences.test.ts`.
- Alterar: `components/agency/themes-settings.tsx` (seção Tema) e criar `components/agency/theme-picker.tsx`.
- Criar: `lib/theme/themes-contrast.test.ts` (contraste de todos os pares, ver spec).
- Revisar: usos fixos listados na spec.
- Atualizar: `DESIGN.md` (seção de temas) e `.impeccable/design.json`.

## Tarefas (ordem; commit por tarefa)
1. **Gerador de paleta (TDD).** Testes primeiro: para qualquer matiz, saída tem todas as chaves; destaque cumpre ≥ 4,6:1; saturação dos neutros dentro do teto; matizes 335°–20° recebem tintura reduzida. Depois implementar `buildPalette`.
2. **Catálogo.** 8 entradas com matiz e opções; `parseTheme` recusa qualquer id fora da lista; teste de unicidade e ordem estável.
3. **Gerar CSS.** `gen-themes.mjs` escreve `app/themes.css` com `html[data-theme="x"]` e `html.dark[data-theme="x"]`; teste verifica que o arquivo commitado é igual ao que o script gera (barra edição manual e esquecimento de regenerar). Importar em `globals.css`.
4. **Teste de contraste completo** (spec) lendo `app/themes.css`; ajustar parâmetros do gerador até todos os temas passarem, incluindo a distinção do alerta. Parar e rever o catálogo se algum matiz não fechar.
5. **Persistência.** Cookie `samps-theme`, `data-theme` no `<html>`, boot script estendido (somente ids do catálogo; teste de sintaxe do script e de recusa de valor estranho).
6. **Interface.** `ThemePicker` com miniaturas claro/escuro (usa as variáveis do próprio tema na miniatura), rádio acessível, foco visível; texto de precedência da cor de destaque. Teste de componente.
7. **Varredura de cores fixas.** Revisar os usos listados na spec; trocar por tokens quando for moldura; manter quando for dado do usuário ou marca. Anotar cada decisão no PR.
8. **Verificação visual real** (build de produção, Playwright): painel, quadro geral, quadro do cliente com capa, cartão aberto (morph), configurações e login, em **8 temas × 2 modos**; folha de contato por tema. Conferir em especial alerta de atraso no Rosa e no Coral escuros.
9. **Docs e gates:** `DESIGN.md`, `.impeccable/design.json`; `tsc`, `lint`, `vitest`, `build`; PR com folhas de contato; CI verde antes do merge.

## Critérios de pronto
- Os 8 temas existem nos dois modos e persistem ao recarregar, sem flash.
- Testes de contraste passam para todos os pares e temas; `app/themes.css` idêntico ao gerado.
- Alerta de atraso distinguível do fundo em todos os temas.
- Cor de destaque pessoal sobrepõe o tema; cor do quadro vence a pessoal.
- Nenhum valor de cookie fora do catálogo chega ao DOM.
- Nenhuma regressão visual no tema Samps (padrão): capturas antes/depois iguais.

## Riscos de execução
- Matiz que não fecha contraste: ajustar luminosidade do destaque ou retirar o tema do catálogo (não afrouxar o teste).
- Cores fixas esquecidas deixam "ilhas" fora do tema: a varredura da tarefa 7 e a folha de contato da 8 são o controle.
- `themes.css` grande demais: medir após a geração; se passar de 10 KB comprimido, gerar só os tokens que diferem do padrão.

## Fora do escopo
Matiz livre; sincronização entre dispositivos; tema por cliente; login e portal com marca; mudanças de layout ou tipografia.
