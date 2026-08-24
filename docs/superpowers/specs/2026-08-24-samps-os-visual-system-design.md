# Samps OS — Sistema visual (redesign frontend)

**Data:** 2026-08-24  
**Status:** aprovado em brainstorming (abordagem 1 — Fundação → operação → vitrine)  
**Origem:** pedido de remodelar o frontend inteiro; marca real via Instagram/logo (`@sampsdigital`); site `sampsdigital.com.br` fora do ar no momento do design  
**Fora de escopo deste design:** debug do site institucional; mudança de schema/auth/RLS/regras de negócio; substituir a fatia roadmap 3.1 (relatórios performance)

---

## 1. Problema

O Samps OS opera com três identidades:

1. **Auth** — Vibe Design System (CSS puro), com anéis concêntricos inventados e paleta royal/coral
2. **Agency** — Tailwind + shadcn, tokens em `app/globals.css`, 7 accents escolhíveis (`data-color-theme`)
3. **Portal** — herda agency, sem linguagem própria de “vitrine”

A marca real da Samps (logo câmera em gradiente quente→frio, wordmark SAMPS / DIGITAL, tom B2B/B2G) aparece quase só no Instagram e no arquivo de logo — não no produto diário. O time passa o dia num admin template; o login é a única superfície com tentativa de marca, e ainda assim inventada.

## 2. Sujeito, audiência, job

| | |
|---|---|
| **Produto** | Samps OS — gestão operacional da agência |
| **Audiência** | Time interno (uso diário) e cliente externo (portal) |
| **Job da UI** | Parecer o instrumento de trabalho da Samps: preciso, metodológico (*Diagnóstico + Planejamento + Método = Resultado*), com a câmera-gradiente como âncora — não um template genérico |

Posicionamento de marca (Instagram/bio): CE \| SP · +7 anos · +80 empresas · Comunicação \| Mkt \| Growth \| Podcasts \| Compliance · eventos B2B/B2G (Licitaweek, compliance, clientes institucionais).

## 3. Princípios

1. **Uma identidade** — auth, agency e portal compartilham os mesmos tokens e tipografia.
2. **Marca real** — logo SVG da câmera; sem anéis inventados; sem 7 accents pastéis.
3. **Ferramenta densa** — hierarquia clara, cards só onde há unidade/interação; sem “card dentro de card” no wrapper do layout.
4. **Acessibilidade embutida** — cada etapa corrige HIGH no código que tocar (não “fase a11y depois”).
5. **1 fatia / 1 PR** — o alvo é o produto inteiro; a execução é em etapas 0–4.

## 4. Identidade visual

### 4.1 Cor

Tokens nomeados (valores aproximados amostrados da logo; implementação em HSL no `globals.css` / Tailwind):

| Token | Hex aprox. | Papel |
|-------|------------|--------|
| `ink` | `#0B1220` | texto, wordmark |
| `paper` | `#F7F8FA` | fundo app (claro por padrão) |
| `surface` | `#FFFFFF` | cards, sheets, sidebar clara |
| `cyan` | `#2EB5C9` | accent primário, CTAs, foco, item ativo |
| `ember` | `#E08A5C` | accent secundário / energia de marca (não danger) |
| `line` | `#D8DEE8` | bordas, divisores |

**Gradiente de marca** (logo + no máximo uma ação primária “hero” por view): Ember → Cyan (`#E08A5C` → `#2EB5C9`).

**Remover:** atributos e UI de `data-color-theme` (`royal`, `violet`, `pink`, `lavender`, `sky`, `coral`, `teal`) e qualquer seletor de accent na UI de Temas. Preferência de accent deixa de existir.

**Manter:** toggle claro/escuro (e a parte da UI de Temas que só controla light/dark, se houver). Dark mode recalibrado com os mesmos tokens (não o royal/coral atuais). Status (`success`, `warning`, `destructive`) em ramps próprias, separadas de `ember`/`cyan`.

**Evitar deliberadamente:** looks genéricos (creme+serif+terracotta; preto+verde ácido; broadsheet). Ouro/preto de backdrops de eventos de cliente **não** é a paleta do OS — é cenário de cliente.

### 4.2 Tipografia

| Papel | Família | Uso |
|-------|---------|-----|
| Display | Plus Jakarta Sans (já no app) | títulos, marca |
| Body | Inter (já no app) | UI, formulários |
| Data | Inter + `tabular-nums` | timers, KPIs, competências |

- O **A sem travessão** do wordmark existe **somente** no SVG do logo.
- Piso de UI: `12px` (`text-xs`). Eliminar `text-[10px]` / `text-[11px]` em cartões e chrome.
- Inputs: manter `text-base` no mobile (`md:text-sm`) para evitar zoom iOS.

### 4.3 Signature

A **câmera-gradiente** (SVG) no sidebar e no login — substitui anéis concêntricos e o mark CSS inventado. Uma CTA primária por view pode usar o gradiente; o restante fica neutro (ink / paper / line / cyan sólido).

## 5. Shell e layout

### 5.1 Agency

- Sidebar: logo câmera + wordmark; item ativo = indicador cyan + texto ink.
- Main: remover o wrapper `rounded-xl border shadow` do layout como “caixa única”; fundo `paper`; cards só em unidades interativas.
- Mobile: Sheet existente; hit areas ≥ 40px em ícones do chrome.
- Banner de avisos: permanece; tipografia/contraste nos tokens novos.

### 5.2 Auth

- Unificar no sistema Tailwind + tokens Samps. O Vibe CSS deixa de ser o shell de produção do auth (preview em `/design-system` pode permanecer legado).
- Split: formulário em `surface`/`paper`; painel visual com câmera-gradiente.
- CTA: gradiente Ember→Cyan.
- Motion: sem animação infinita sem `prefers-reduced-motion`.

### 5.3 Portal

- Mesma família tipográfica e tokens; chrome mais leve.
- Logo do **cliente** em destaque; marca Samps discreta.
- Detalhamento visual na etapa 4.

### 5.4 Densidade e estados

- Espaçamento: ~8px intra-grupo, ~16px inter-grupo.
- Empty states com verbo e próximo passo.
- Shell mínimo: `app/error.tsx` e `app/not-found.tsx` com recuperação (“Tentar de novo” / “Voltar ao painel”).

### 5.5 Acessibilidade (obrigatório por etapa)

Ao tocar o arquivo, a etapa corrige:

- Controles só-ícone sem nome → `aria-label` / `sr-only`
- Cartão de demanda clicável → `<button>` (ou equivalente teclado), não `<div onClick>`
- Theme toggle / login motion → respeito a `prefers-reduced-motion`
- `outline-none` sem anel → restaurar foco visível

## 6. Etapas de execução (1 PR cada)

| Etapa | Branch sugerida | Escopo | Explicitamente fora |
|-------|-----------------|--------|---------------------|
| **0 Fundação** | `feat/visual-foundation` | Tokens, dark, remoção dos 7 accents + UI Temas, logo SVG, escala tipográfica, `error`/`not-found` | Remodelar páginas |
| **1 Shell** | `feat/visual-shell` | Sidebar, layout agency, auth unificado, theme toggle + reduced-motion, a11y do chrome | Kanban, settings pages |
| **2 Operação** | `feat/visual-boards` | Demand cards, Kanban, sector board, sheets, timer `tabular-nums`, empty states | Configurações, portal |
| **3 Gestão** | `feat/visual-management` | Painel gestão, performance, equipe, agenda, clientes, hub configurações (visual) | Portal |
| **4 Portal** | `feat/visual-portal` | Layout portal, home cliente, densidade menor | Mudança de API/produto |

### Critério de pronto por etapa

1. `npx tsc --noEmit` limpo  
2. `npm run lint` sem erro novo  
3. `npm run build` passa  
4. Smoke: tema claro + escuro + uma largura mobile  
5. PR com checklist do que revisar visualmente  

### Relação com o roadmap

- Fatia **3.1** (relatórios `/performance`) permanece na fila de produto; este sistema visual **não a substitui**.
- Etapas 0–4 enfileiram-se como trabalho de design system / frontend, em paralelo ou após 3.1 conforme prioridade da sessão — nunca fundir 3.1 e etapa visual no mesmo PR.

## 7. Não-objetivos

- Reescrever lógica de Server Actions, permissões ou Prisma
- Multi-idioma / RTL
- Substituir shadcn/Radix por outra lib
- Rebrand dos clientes (Confiança, etc.) — só a superfície Samps OS
- Restaurar o site `sampsdigital.com.br` (ticket separado)

## 8. Evidências de marca (sessão)

- Perfil Instagram `@sampsdigital` (prints no workspace)
- Logo: câmera em gradiente + wordmark SAMPS / DIGITAL
- Hex amostrados da logo (aprox.): `#F5C6BD`, `#C0A050`, `#4AB6CE`, `#30A0D0`, texto quase `#0B1220`

## 9. Próximo passo

Após aprovação desta spec no repositório: skill **`writing-plans`** para a **etapa 0** (`feat/visual-foundation`) — plano detalhado com tasks checkbox. Etapas 1–4 ganham plano just-in-time antes da execução de cada uma.
