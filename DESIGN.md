---
name: Samps OS
description: Sistema operacional interno da Samps Digital, a mesa de operação da agência.
colors:
  teal-profundo: "#0C7E92"
  ciano-lente: "#2DB3C8"
  brasa: "#E08A5C"
  tinta: "#0B111E"
  papel: "#F9FAFB"
  superficie: "#FFFFFF"
  moldura: "#F0F1F5"
  linha: "#E1E4EA"
  linha-campo: "#D6DAE0"
  grafite-suave: "#606876"
  sucesso: "#16833E"
  atencao: "#A95C04"
  perigo: "#DC2828"
  noite-moldura: "#0A0C12"
  noite-painel: "#10141B"
  noite-superficie: "#161A22"
  noite-linha: "#252931"
  noite-ciano: "#3CC7DD"
typography:
  headline:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"cv02\", \"cv03\", \"cv04\", \"cv11\""
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  data:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
rounded:
  sm: "6px"
  md: "9px"
  lg: "12px"
  xl: "14px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.teal-profundo}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  button-outline:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  button-ghost:
    textColor: "{colors.grafite-suave}"
    rounded: "{rounded.md}"
    height: "36px"
  card:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.xl}"
  input:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "8px 12px"
  chip:
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    height: "20px"
    padding: "0 8px"
  nav-item-active:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    height: "36px"
---

# Design System: Samps OS

## Overview

**Creative North Star: "A Mesa de Operação"**

O Samps OS é uma bancada de trabalho organizada. A moldura (sidebar e fundo) fica um tom abaixo; o painel de conteúdo sobe uma camada; cards e controles sobem mais uma. A profundidade vem das superfícies em camadas e de sombras curtas, não de bordas pesadas. Tudo o que a gestão e a produção precisam está à mão, na mesma densidade de ferramenta de mesa.

A cor é instrumento, não enfeite: o Teal Profundo marca a ação principal, o Ciano Lente marca foco e seleção, e o vermelho/âmbar aparecem só quando há alerta. O resto é tinta, papel e linha. A marca (câmera em gradiente Brasa → Ciano) vive no logo e em detalhes de identidade, nunca como fundo de área.

Os componentes são táteis e confiantes: o botão afunda 1px ao clicar, o card sobe 1px no hover, o campo acende a borda em teal ao focar. Respondem ao gesto sem teatro.

**Key Characteristics:**
- Três camadas de superfície: moldura → painel → card.
- Sombras curtas empilhadas (anel + queda + ambiente), recalibradas no escuro.
- Uma cor de ação (Teal Profundo); cor semântica só com significado.
- Pílulas para rótulos; cantos de 9–14px em controles e cards.
- Inter com alternativas (a de um andar, dígitos abertos); números tabulares.

## Colors

Neutros frios calibrados com uma cor de ação e um acento quente de marca.

### Primary
- **Teal Profundo** (#0C7E92): preenchimento de botão primário, links, ícone do item ativo. Escolhido pelo contraste AA com texto branco (4,75:1); o ciano claro não passa.

### Secondary
- **Ciano Lente** (#2DB3C8): anel de foco, seleção de texto, primeira série de gráfico, indicadores de marca. Nunca como fundo de texto branco.

### Tertiary
- **Brasa** (#E08A5C): energia de marca, metade quente do gradiente do logo, segunda série de gráfico, prioridade alta. Não é cor de perigo.

### Neutral
- **Tinta** (#0B111E): texto principal e títulos.
- **Grafite Suave** (#606876): texto secundário, rótulos, ícones em repouso.
- **Papel** (#F9FAFB): fundo do painel de conteúdo.
- **Superfície** (#FFFFFF): cards, campos, popovers, item ativo da sidebar.
- **Moldura** (#F0F1F5): fundo da sidebar e do shell.
- **Linha** (#E1E4EA): bordas de card, divisórias.
- **Linha de Campo** (#D6DAE0): borda de input e botão outline.
- **Modo escuro:** Noite Moldura (#0A0C12) → Noite Painel (#10141B) → Noite Superfície (#161A22), com Noite Linha (#252931) e Noite Ciano (#3CC7DD) como cor de ação (texto escuro sobre ela).

### Semantic
- **Sucesso** (#16833E), **Atenção** (#A95C04), **Perigo** (#DC2828): só para estado real (entregue, ajuste pendente, atrasada). Em fundo, sempre em tinta de 10–15%.

### Named Rules
**The One Action Rule.** O Teal Profundo marca a ação principal da tela e o estado ativo. Se aparece em mais de um botão cheio por área, um deles está errado.

**The Meaningful Color Rule.** Número, ponto ou fundo colorido só quando a cor diz algo (atraso, atenção, prioridade, cliente). Contagem neutra fica em tinta.

## Typography

**Display Font:** Plus Jakarta Sans (com Inter e system-ui)
**Body Font:** Inter (com system-ui)

**Character:** Plus Jakarta dá voz aos títulos de página e de card; Inter carrega todo o resto: rótulos, dados, formulários: com alternativas que tiram a cara de fonte padrão.

### Hierarchy
- **Headline** (600, 1.5rem, 1.2, −0.02em): título de página. Um por tela, sem rótulo acima.
- **Title** (600, 0.9375rem, 1): título de card e de seção.
- **Body** (400, 0.875rem, 1.5): texto de UI e conteúdo.
- **Label** (500, 0.75rem): rótulos de KPI, chips, metadados. Piso de 12px para qualquer texto funcional.
- **Data** (600, 1.5rem, 1, tabular): números de KPI, sempre em Inter com dígitos tabulares.

### Named Rules
**The No Eyebrow Rule.** Título de página não leva rótulo em caixa alta acima. O título se sustenta sozinho.

**The Data Is Not Display Rule.** Números e dados usam Inter tabular, nunca a fonte de título.

## Layout

Shell de duas colunas: sidebar fixa de 256px na moldura e painel de conteúdo inset (margem de 8px, cantos de 14px, sombra leve) a partir de 1024px. Abaixo disso, a sidebar vira sheet lateral e o painel ocupa a tela toda. Ritmo de espaço em múltiplos de 4px: ~8px dentro de um grupo, ~12–16px entre grupos, 24px de respiro no topo da página. Densidade de ferramenta de mesa; no celular, blocos empilham e a página rola.

## Elevation & Depth

Sistema híbrido: camadas tonais (moldura → painel → card) mais sombras curtas empilhadas. Sombras vêm de tokens CSS (`--shadow-xs/sm/md/lg`) e no escuro ganham um brilho interno de 1px no topo.

### Shadow Vocabulary
- **Repouso** (`0 1px 2px 0 hsl(220 40% 12% / .05)`): botão outline, campo, card de demanda.
- **Card** (`0 1px 2px -1px hsl(220 40% 12% / .08), 0 1px 3px 0 hsl(220 40% 12% / .05)`): cards, painel inset, item ativo da sidebar.
- **Flutuante** (`0 1px 1px hsl(220 40% 12% / .03), 0 4px 8px -4px hsl(220 40% 12% / .08), 0 12px 20px -8px hsl(220 40% 12% / .08)`): hover de card, menus, popovers.
- **Modal** (`0 1px 1px hsl(220 40% 12% / .03), 0 8px 16px -4px hsl(220 40% 12% / .08), 0 24px 40px -12px hsl(220 40% 12% / .16)`): dialog, sheet.
- **Brilho de botão** (`inset 0 1px 0 hsl(0 0% 100% / .18)`): topo de botões cheios.

### Named Rules
**The Short Shadow Rule.** Sombra tem deslocamento e desfoque curtos e cor tingida da tinta. Nada de halo colorido sem deslocamento nem sombra preta difusa.

## Shapes

Cantos suaves e consistentes: 6px em itens de menu, 9px em botões, campos e itens de navegação, 12px em painéis, 14px em cards e no painel inset, pílula em chips, contadores e badges. Bordas de 1px em Linha (a 80%) para cards; sem borda lateral colorida.

## Components

### Buttons
- **Shape:** cantos de 9px, altura de 36px (32px no compacto).
- **Primary:** Teal Profundo com texto branco e brilho interno no topo; hover a 90%.
- **Outline:** Superfície com borda Linha de Campo e sombra de repouso; hover escurece a borda.
- **Ghost:** texto Grafite Suave; hover com fundo de tinta a 5%.
- **Tátil:** afunda 1px ao clicar; foco com anel Ciano Lente de 2px e respiro de 2px.

### Chips
- **Style:** pílula de 20px, fundo tingido do tom (10–15%), sem borda; variante outline com borda Linha.
- **Prioridade:** ponto de 6px na cor da prioridade antes do nome.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** Superfície.
- **Shadow Strategy:** Card em repouso; Flutuante no hover quando clicável (sobe 1px).
- **Border:** 1px Linha a 80%.
- **Internal Padding:** 14–16px.

### Inputs / Fields
- **Style:** Superfície, borda Linha de Campo, sombra de repouso, 40px de altura.
- **Focus:** borda Teal Profundo + halo Ciano Lente de 3px a 25%.
- **Disabled:** 50% de opacidade.

### Navigation
- Itens de 36px, texto Grafite Suave, ícone de 16px. Hover com fundo de tinta a 5%. Ativo: superfície branca elevada com anel de Linha, texto Tinta e ícone Teal Profundo (Noite Ciano no escuro). Rótulo de grupo em 12px caixa alta.

### KPI Strip (signature)
Faixa única de métricas num card, divididas por linhas finas (grade com 1px de espaço sobre fundo Linha). Rótulo em Label, número em Data; ponto e cor só para Atenção e Perigo. Cada número é um link para a lista que ele conta (`/demandas?filtro=`).

### Demand Card (signature)
Título, prioridade (ponto + nome), cliente com quadradinho da cor da marca, chips de tipo/formato/status, rodapé com prazo (ícone de calendário, vermelho se atrasada) e responsável com iniciais. Clicável abre o detalhe; no painel é um link para `/demandas?abrir=<id>`. Em "Precisa de você" o card abre com o motivo em Label semibold ("Atrasada há 2 dias" em Perigo; "Sem responsável" ou "Vence amanhã" em Atenção), e o chip de prioridade some quando todos os cards têm a mesma.

### Detail Window (signature)
O detalhe de uma demanda abre como uma janela centralizada (até 1040×660px; tela cheia abaixo de 768px) que **cresce a partir do card clicado**: a casca anima a geometria do card até a janela, um clone do card some nos primeiros 35%, o título viaja até a barra de título e o conteúdo (chips, lateral "Andamento", documento, rodapé) aparece escalonado. Fechar roda o caminho inverso até o card, no lugar onde ele está agora.
- **Tempos:** abrir 460ms e fechar 300ms, com `cubic-bezier(0.32, 0.72, 0, 1)` na geometria e no título; fades e revelação com `cubic-bezier(0.22, 1, 0.36, 1)` (out-soft). Fonte única: `lib/motion/morph-geometry.ts` (`MORPH_TIMING`).
- **Sem origem útil** (card fora da tela, deep link sem card, nenhum clique): fade de 180ms com escala de 0.98.
- **Movimento reduzido ou sem Web Animations:** fade de 100ms só de opacidade, sem geometria nem clone.
- **Estrutura:** barra de título (título, código e cliente, chips, fechar), lateral de 248px com o andamento (empilha no celular), documento rolável e rodapé.

**The Continuity Rule.** Movimento só onde mostra de onde algo veio (card → janela). É a exceção declarada aos 150ms de estado: um único gesto por clique, até 460ms, nunca em loop.

## Do's and Don'ts

### Do:
- **Do** usar Teal Profundo (#0C7E92) para o botão primário e Ciano Lente (#2DB3C8) só para foco, seleção e marca.
- **Do** manter texto funcional em 12px ou mais e contraste de 4,5:1.
- **Do** usar as sombras dos tokens (`shadow-xs/sm/md/lg`) em vez de valores soltos.
- **Do** traduzir todo código de enum antes de mostrar (`demandTypeLabel`, `demandOriginLabel`, `demandStatusLabel`).
- **Do** usar ícones do lucide-react no lugar de setas ou símbolos digitados.

### Don't:
- **Don't** pôr rótulo em caixa alta acima do título da página.
- **Don't** colocar card dentro de card; agrupe com divisórias ou espaço.
- **Don't** usar texto branco sobre Ciano Lente ou Brasa; avatares de iniciais são neutros (tinta sobre tinta a 8%).
- **Don't** colorir número, borda ou fundo de KPI neutro.
- **Don't** usar travessão (U+2014) em texto de interface; só como marcador de célula vazia.
- **Don't** usar desfoque ou vidro como decoração.
- **Don't** animar card → janela sem o card visível na tela; sem origem, use o fade curto.
