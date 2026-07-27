# Análise Completa de Design Tokens CSS

> Análise extraída dos sites **Luminal Creative Studio** e **Instagram Slides 02** (ambos na plataforma aura.build).
> Ambos utilizam Tailwind CSS compilado com tema dark como base.

---

## 1. Cores (Colors)

### 1.1 Paleta Base (Neutrals) — Compartilhada

Ambos os sites usam a escala completa `neutral` do Tailwind como paleta primária:

| Token | Hex | Uso |
|-------|-----|-----|
| `neutral-950` | `#0a0a0a` | Background principal (body) — **altíssima frequência** |
| `neutral-900` | `#171717` | Cards, sidebars, painéis secundários |
| `neutral-800` | `#262626` | Toggles, elementos UI inativos |
| `neutral-700` | `#404040` | Numeração de processo, labels terciários |
| `neutral-600` | `#525252` | Labels mono (ex: `/// About`), textos auxiliares |
| `neutral-500` | `#737373` | Texto secundário, ícones, links footer |
| `neutral-400` | `#a3a3a3` | Texto de parágrafos, descrições — **alta frequência** |
| `neutral-300` | `#d4d4d4` | Texto de destaque secundário, code syntax |
| `neutral-200` | `#e5e5e5` | Texto body padrão (Luminal), base text color |
| `white` | `#ffffff` | Títulos, headings, elementos de destaque — **altíssima frequência** |

### 1.2 Cor de Destaque — Luminal

| Token | Hex | Uso |
|-------|-----|-----|
| `red-500` | `#ef4444` | Cor primária de acento — beams, numeração, selection, hover states, caret, toggle ativo |
| `red-600` | `#dc2626` | Bullets de lista, glow CTA |
| `red-400` | `#f87171` | Hover text nos botões CTA |
| `red-900/60` | `rgba(127,29,29,0.6)` | Barras de gráfico "Social" |
| `red-500/20` | `rgba(239,68,68,0.2)` | Borda de cards, toggle ativo bg |
| `red-500/50` | `rgba(239,68,68,0.5)` | Borda hover de toggle ativo |
| `red-500/30` | `rgba(239,68,68,0.3)` | Selection highlight |
| `red-500/10` | `rgba(239,68,68,0.1)` | Glow sutil em ilustrações |
| `red-500/5` | `rgba(239,68,68,0.05)` | Shadow dos botões CTA |
| `emerald-500` | `#10b981` | Status "Open" (único uso fora do vermelho) |

### 1.3 Cor de Destaque — Instagram Slides

| Token | Hex | Uso |
|-------|-----|-----|
| — | — | **Sem cor de acento** — paleta 100% monocromática (preto/branco/neutral) |

### 1.4 Cores com Opacidade (White Alpha) — Compartilhadas

| Token | Valor | Uso | Frequência |
|-------|-------|-----|------------|
| `white/10` | `rgba(255,255,255,0.1)` | Bordas de grid, divisores | **Altíssima** |
| `white/5` | `rgba(255,255,255,0.05)` | Bordas sutis, divisores secundários | Alta |
| `white/20` | `rgba(255,255,255,0.2)` | Input borders, nav dots inativos, selection (IG) | Média |
| `white/30` | `rgba(255,255,255,0.3)` | Decorações "+" nos cruzamentos do grid | Baixa |
| `white/[0.02]` | `rgba(255,255,255,0.02)` | Hover background em rows/cards | Alta |
| `white/[0.01]` | `rgba(255,255,255,0.01)` | Flashlight card base (IG) | Baixa |
| `white/[0.04]` | `rgba(255,255,255,0.04)` | Sidebar items bg | Baixa |
| `white/[0.05]` | `rgba(255,255,255,0.05)` | Wireframe borders | Média |
| `white/90` | `rgba(255,255,255,0.9)` | Texto em captions | Baixa |

### 1.5 Cores com Opacidade (Black Alpha)

| Token | Valor | Uso (Site) |
|-------|-------|------------|
| `black/10` | `rgba(0,0,0,0.1)` | Overlay em imagens (Luminal) |
| `black/40` | `rgba(0,0,0,0.4)` | Header backdrop (IG) |
| `black/80` | `rgba(0,0,0,0.8)` | Overlay em slides (IG) |

### 1.6 CSS Custom Property de Cor

| Variável | Valor | Site |
|----------|-------|------|
| `--bg-deep` | `#050505` | Instagram Slides |
| `--border-gradient` | `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0))` | Instagram Slides |

---

## 2. Tipografia (Typography)

### 2.1 Font Families

#### Luminal Creative Studio
| Família | Tipo | Uso | Arquivo CSS |
|---------|------|-----|-------------|
| **Inter** | Sans-serif | Body text principal (`font-family: 'Inter', sans-serif`) | css2-c2cfda740a, css2-88538a5774 |
| **Syne** | Display | Headings, títulos (`.font-syne`) | css2-dea06366cb |
| **Geist** | Sans-serif | Disponível (.font-geist) | css2-5ae4c14b96 |
| **DM Sans** | Sans-serif | Disponível | css2-6bf0ecc2ef |
| **IBM Plex Mono** | Monospace | Code, labels técnicos (`font-mono`) | css2-5b1558c749 |
| **Bricolage Grotesque** | Sans-serif | Disponível | css2-882a187642 |
| **Manrope** | Sans-serif | Disponível | css2-e119fe1738 |

#### Instagram Slides 02
| Família | Tipo | Uso | Arquivo CSS |
|---------|------|-----|-------------|
| **Inter** | Sans-serif | Body principal + headings mono | css2-7a03db5988 |
| **Geist** | Sans-serif | `.font-geist` | css2-5ae4c14b96 |
| **Geist Mono** | Monospace | `.font-geist-mono` | css2-1b1d7aaf2c |
| **Roboto** | Sans-serif | `.font-roboto` | css2-b4158b2613 |
| **Montserrat** | Sans-serif | `.font-montserrat` | css2-18f3fa6c86 |
| **Poppins** | Sans-serif | `.font-poppins` | css2-3f9ed12d0b |
| **Playfair Display** | Serif | `.font-playfair` | css2-8a8c629f77 |
| **Instrument Serif** | Serif | `.font-instrument-serif` | css2-80988e7c1d |
| **Merriweather** | Serif | `.font-merriweather` | css2-c7e6560ed4 |
| **Bricolage Grotesque** | Sans-serif | `.font-bricolage` | css2-6944048364 |
| **Plus Jakarta Sans** | Sans-serif | `.font-jakarta` | css2-03b853f355 |
| **Manrope** | Sans-serif | `.font-manrope` | css2-baf8517533 |
| **Space Grotesk** | Sans-serif | `.font-space-grotesk` | css2-100e1be8c3 |
| **Work Sans** | Sans-serif | `.font-work-sans` | css2-57f61c71ef |
| **PT Serif** | Serif | `.font-pt-serif` | css2-54ac49dd13 |
| **Space Mono** | Monospace | `.font-space-mono` | css2-cbbc3897cb |
| **Quicksand** | Sans-serif | `.font-quicksand` | css2-cfc649ec2f |
| **Nunito** | Sans-serif | `.font-nunito` | css2-1cfe8a28e4 |
| **DM Sans** | Sans-serif | `.font-dm-sans` | css2-6bf0ecc2ef |
| **IBM Plex Mono** | Monospace | `.font-ibm-plex-mono` | css2-5b1558c749 |

> **Nota:** Instagram Slides carrega ~20 fontes como opções intercambiáveis para cada slide; Luminal usa ~3 ativamente.

### 2.2 Font Sizes

| Classe Tailwind | Valor | Uso Luminal | Uso Instagram |
|-----------------|-------|-------------|---------------|
| `text-xs` | `0.75rem` (12px) | Labels, captions, mono tags | Metadados, numeração |
| `text-[9px]` | `9px` | Subtítulos de meta (font-mono) | — |
| `text-[10px]` | `10px` | Nav links, labels uppercase, toggles | Labels técnicos |
| `text-[11px]` | `11px` | Nome em testimonials | — |
| `text-sm` | `0.875rem` (14px) | Parágrafos card, descrições | Subtextos |
| `text-base` | `1rem` (16px) | Parágrafos principais | Texto base |
| `text-lg` | `1.125rem` (18px) | Marquee logos, parágrafos | — |
| `text-xl` | `1.25rem` (20px) | Subtítulos de seção | Subtítulos |
| `text-2xl` | `1.5rem` (24px) | Nomes equipe, testimonials | Subtítulos maiores |
| `text-3xl` | `1.875rem` (30px) | Números, seção headers | Headlines de slide |
| `text-4xl` | `2.25rem` (36px) | Seção títulos, preços | Headlines |
| `text-5xl` | `3rem` (48px) | Banners mobile, headlines | Headlines grandes |
| `text-6xl` | `3.75rem` (60px) | Team intro headline | Headlines |
| `text-7xl` | `4.5rem` (72px) | Stat numbers, headlines md | Headlines hero |
| `text-8xl` | `6rem` (96px) | Stat numbers md+ | Headlines display |
| `text-9xl` | `8rem` (128px) | Banner headlines lg | — |
| `.text-huge` | `clamp(3rem, 16vw, 24rem)` | "LUMINAL" hero title (custom) | — |

### 2.3 Font Weights

| Classe Tailwind | Valor | Uso |
|-----------------|-------|-----|
| `font-light` | `300` | Texto de corpo longo, blockquotes, stat numbers |
| `font-medium` | `500` | Headings (Syne), labels, nav — **mais usado** |
| `font-semibold` | `600` | Marquee logos, CTA hero |
| `font-bold` | `700` | Nav links uppercase, testimonial names |

> `font-normal` (400) é o padrão implícito do body text.

### 2.4 Line Heights

| Classe Tailwind | Valor | Uso |
|-----------------|-------|-----|
| `leading-none` | `1` | Headlines hero, banners — **alta frequência** |
| `leading-[0.9]` | `0.9` | Seção titles (Luminal) |
| `leading-[0.85]` | `0.85` | Pricing headline (Luminal) |
| `leading-tight` | `1.25` | Testimonial quotes, tracking-tight headings |
| `leading-relaxed` | `1.625` | Parágrafos, descrições — **alta frequência** |

### 2.5 Letter Spacing (Tracking)

| Classe Tailwind | Valor | Uso |
|-----------------|-------|-----|
| `tracking-tighter` | `-0.05em` | Headlines display (Syne) — **altíssima frequência** |
| `tracking-tight` | `-0.025em` | Subtítulos, marquee logos |
| `tracking-widest` | `0.1em` | Labels uppercase, service titles |
| `tracking-[0.2em]` | `0.2em` | Botões CTA, nav links (Luminal) |
| `tracking-[0.25em]` | `0.25em` | Labels de slide (IG) |
| `tracking-[0.28em]` | `0.28em` | Caption labels |
| `tracking-[0.3em]` | `0.3em` | Ref labels testimonial |
| `tracking-[0.32em]` | `0.32em` | Badge labels em cards |
| `tracking-wider` | `0.05em` | Month labels em gráficos |

---

## 3. Espaçamento (Spacing)

### 3.1 Padding

| Valor | Classes | Contexto |
|-------|---------|----------|
| `0.5` (2px) | `px-2, py-0.5` | Toggle labels, badges |
| `1` (4px) | `py-1` | Rows interativos |
| `1.5` (6px) | `p-1.5, gap-1.5` | Indicadores, space-y code |
| `2` (8px) | `px-2, py-2` | Inputs, grid items |
| `2.5` (10px) | `py-2.5` | Botões CTA — **padrão** |
| `3` (12px) | `mb-3, gap-3` | Gaps em cards |
| `4` (16px) | `p-4, mb-4, gap-4` | Padding em containers menores |
| `5` (20px) | `p-5, px-5, gap-5` | Botões CTA horizontal, painéis — **alta frequência** |
| `6` (24px) | `p-6, mb-6, gap-6` | Seções internas, espaço principal — **altíssima frequência** |
| `8` (32px) | `p-8, gap-8, mb-8` | Padding de seção padrão — **altíssima frequência** |
| `10` (40px) | `pt-10, pb-10, mb-10` | Marquee vertical, heading bottom |
| `12` (48px) | `p-12, gap-12, mt-12` | Padding de seção md (Luminal), gaps maiores |
| `16` (64px) | `p-16, pt-16, lg:p-16` | Padding de seção large — **alta frequência** |
| `20` (80px) | `py-20` | Banners vertical mobile |
| `32` (128px) | `py-32, md:py-32, pt-32, pb-32` | Banners vertical desktop |
| `48` (192px) | `md:py-48` | CTA section desktop |

### 3.2 Gaps Principais

| Valor | Uso |
|-------|-----|
| `gap-2` | Badges, dots, pequenos agrupamentos |
| `gap-3` | Items horizontais com ícone |
| `gap-4` | Grid items, dados |
| `gap-5` | Painéis internos |
| `gap-8` | Grid de seções — **padrão** |
| `gap-12` | Seções com divisão flex |
| `gap-20` | Marquee logos |

---

## 4. Border Radius

| Classe Tailwind | Valor | Uso |
|-----------------|-------|-----|
| `rounded-none` | `0` | Cards, imagens, painéis — **mais frequente** (estética angular) |
| `rounded-[1px]` | `1px` | Barras de gráfico |
| `rounded-sm` | `0.125rem` (2px) | CTA header button (Luminal) |
| `rounded` | `0.25rem` (4px) | Rows interativos |
| `rounded-md` | `0.375rem` (6px) | Botões CTA padrão — **alta frequência** |
| `rounded-full` | `9999px` | Toggles, badges de status, nav dots — **alta frequência** |
| `rounded-xl` | `0.75rem` (12px) | Editor window (Luminal code illustration) |

> **Padrão de design:** Ambos os sites preferem `rounded-none` para cards/containers com `rounded-md` para botões e `rounded-full` para elementos circulares.

---

## 5. Box Shadows

### Luminal
| Classe/Valor | Uso |
|-------------|-----|
| `shadow-lg shadow-red-500/5` | Botões CTA (glow sutil vermelho) — **alta frequência** |
| `shadow-2xl` | Code editor, painéis maiores |
| `shadow-sm` | Dots de window controls |
| `drop-shadow-[0_60px_120px_rgba(0,0,0,0.9)]` | SVG de cubos isométricos |
| `drop-shadow-2xl` | Cursor animado |
| `drop-shadow-md` | SVG do cursor colaborativo |

### Instagram Slides
| Classe/Valor | Uso |
|-------------|-----|
| `shadow-lg` | Badge do cursor | 
| Sem shadow visível | Estética completamente flat |

### Shadows no Tailwind Compilado (Disponíveis)
```css
box-shadow: 0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1);  /* shadow */
box-shadow: 0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1);  /* shadow-md */
box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1);  /* shadow-lg */
box-shadow: 0 25px 50px -12px rgb(0 0 0 / .25);  /* shadow-2xl */
box-shadow: inset -2px -2px 6px rgba(255,255,255,.1), inset 2px 2px 6px rgba(0,0,0,.8);  /* custom inset */
box-shadow: inset 0 -1px 0 rgba(0,0,0,.2);  /* custom inset subtle */
```

---

## 6. Transições e Animações

### 6.1 Transições (Transitions)

| Classe Tailwind | Duração | Uso | Frequência |
|-----------------|---------|-----|------------|
| `transition-colors` | 150ms | Hover em links, cards, toggles | **Altíssima** |
| `transition-opacity` | 150ms | Marquee logos hover, conic gradient reveal | Alta |
| `transition-all` | 150ms | Botões CTA (cor + borda + transform) | **Altíssima** |
| `transition-transform` | 150ms | Ícones arrow no hover | Média |
| `transition-all duration-300` | 300ms | Icons, brightness, multi-property | **Alta** |
| `transition-all duration-500` | 500ms | Card hover backgrounds, text colors | Alta |
| `transition-all duration-700` | 700ms | Team cards expand/collapse | Média |
| `transition-colors duration-500` | 500ms | Testimonial text hover | Média |
| `transition-[grid-template-rows] duration-700` | 700ms | Accordion expand team bios | Baixa |

### 6.2 Easing Functions (Curvas)

| Easing | Uso |
|--------|-----|
| `ease` (padrão Tailwind) | Maioria das transitions |
| `ease-[cubic-bezier(0.22,1,0.36,1)]` | Team card expand | 
| `cubic-bezier(0.22, 1, 0.36, 1)` | Animações de reveal/cube |
| `cubic-bezier(0.2, 0.8, 0.2, 1)` | fadeInUpBlur (Luminal) |
| `cubic-bezier(0.4, 0, 0.2, 1)` | Wireframe loop, cursor path |
| `cubic-bezier(0.16, 1, 0.3, 1)` | textSlide (IG) |
| `ease-out` | animationIn (IG) |
| `linear` | Marquee, border-spin |
| `step-end` | Row active highlight |
| `steps(30, end)` | Typing animation |

### 6.3 Keyframe Animations — Luminal

| Nome | Descrição | Duração | Iteração |
|------|-----------|---------|----------|
| `beam-drop` | Beam vertical descendo (translateY -100% → 500%) | 5s | infinite |
| `border-spin` | Rotação 360° (conic gradient nos CTAs) | 2s | infinite |
| `marquee` | translateX(0) → translateX(-50%) | 40s | infinite |
| `fadeInUpBlur` | opacity 0→1, translateY(20px→0), blur(10px→0) | 0.8s | once |
| `cube-reveal-left` | Cube aparece da esquerda com blur | 4s | infinite |
| `cube-reveal-right` | Cube aparece da direita com blur | 4s | infinite |
| `cube-reveal-bottom` | Cube aparece de baixo com blur | 4s | infinite |
| `wireframe-loop` | Fade in/out com translateY e scale | 6s | infinite |
| `blink-caret` | Border color pisca (transparent ↔ #ef4444) | — | infinite |
| `type-loop-1..5` | Simulação de typing com steps | 8s | infinite |
| `cursor-float-loop` | Cursor "Michael" flutuando pela tela | 8s | infinite |
| `barReveal` | Barras de gráfico scale Y 0→1→0 | 6s | infinite |
| `cursor-path` | Cursor navegando entre toggles | 16s | infinite |
| `cursor-click` | Efeito de clique (scale 0.85) | 16s | infinite |
| `row-active` | Background flash em row de toggle | 16s | infinite |
| `toggle-state` | Toggle ativa/desativa (bg-color change) | 16s | infinite |
| `knob-slide` | Knob de toggle desliza (left 2px → 16px) | 16s | infinite |
| `text-active` | Texto muda cor (neutral-400 → white) | 16s | infinite |

### 6.4 Keyframe Animations — Instagram Slides

| Nome | Descrição | Duração | Iteração |
|------|-----------|---------|----------|
| `animationIn` | opacity 0→1, translateY(30px→0), blur(10px→0px) | 0.8s | once (staggered) |
| `marquee` | translateX(0) → translateX(-50%) | 40s | infinite |
| `shimmer` | translateX(-100%) skewX(-15deg) → translateX(200%) | — | — |
| `textSlide` | translateY(110%) opacity 0 → translateY(0) opacity 1 | 0.9s | once |

### 6.5 CSS Animation Classes

| Classe | Comportamento |
|--------|--------------|
| `.animate-in` | Trigger de fadeInUpBlur (Luminal) / animationIn (IG) |
| `.reveal-hidden` | Estado inicial: opacity 0, translateY, blur — removido no scroll via IntersectionObserver |
| `.animate-marquee-infinite` | Loop infinito horizontal |
| `.animate-border-spin` | Rotação do conic-gradient |
| `.animate-cube-l/r/b` | Reveal dos cubos isométricos |
| `.animate-wireframe` | Loop fade de wireframe UI |

---

## 7. CSS Custom Properties

### Instagram Slides 02
```css
:root {
  --bg-deep: #050505;
}

/* Per-element (JavaScript controlled) */
--mouse-x: <px>;  /* Posição X do mouse para flashlight effect */
--mouse-y: <px>;  /* Posição Y do mouse para flashlight effect */

/* Inline style */
--border-gradient: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0));
--border-radius-before: 8px | 9999px;

/* Tailwind 3D plugin generated */
--tw-rotate-x: <deg>;
--tw-rotate-y: <deg>;
--tw-rotate-z: <deg>;
--tw-translate-x: <value>;
--tw-translate-y: <value>;
--tw-scale-x: <value>;
--tw-scale-y: <value>;
--tw-skew-x: <value>;
--tw-skew-y: <value>;
```

### Tailwind Theme (Compilado — ambos os sites)
```css
:root {
  --background: <hsl>;
  --foreground: <hsl>;
  --border: <hsl>;
  --accent: <hsl>;
  --muted: <hsl>;
  --muted-foreground: <hsl>;
  --primary: <hsl>;
  --radius: <value>;
  --sidebar-accent-foreground: <hsl>;
}
```

---

## 8. Gradientes

### Luminal Creative Studio

| Tipo | Valor | Uso |
|------|-------|-----|
| **Linear (fade)** | `bg-gradient-to-r from-neutral-950 to-transparent` | Fade horizontal para marquee |
| **Linear (fade)** | `bg-gradient-to-l from-neutral-950 to-transparent` | Fade horizontal inverso |
| **Linear (fade)** | `bg-gradient-to-br from-white/[0.03] to-transparent` | Background sutil em painéis |
| **Conic** | `conic-gradient(from_0deg_at_50%_50%, transparent_0deg, transparent_300deg, #ef4444_360deg)` | Borda animada de CTAs — **padrão** |
| **Radial** | `radial-gradient(ellipse_at_center, rgba(255,255,255,0.06)_0%, rgba(0,0,0,0)_55%)` | Vignette em cards |
| **Radial (dot)** | `radial-gradient(#ffffff_1px, transparent_1px)` com `[background-size:28px_28px]` | Grid decorativo de pontos |
| **Linear (SVG)** | Gradients em cubos isométricos (branco→cinza escuro) | Ilustração 3D |

### Instagram Slides 02

| Tipo | Valor | Uso |
|------|-------|-----|
| **Radial (flashlight)** | `radial-gradient(800px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.08), transparent 40%)` | Efeito flashlight em cards |
| **Linear (border)** | `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0))` | Border gradient com mask-composite |

---

## 9. Media Queries / Breakpoints

Ambos os sites compartilham os breakpoints padrão do Tailwind:

| Prefixo | Min-Width | Uso Típico |
|---------|-----------|------------|
| `sm` | `640px` | Pouco usado |
| `md` | `768px` | Layout grid de 4 colunas, padding responsivo — **mais usado** |
| `lg` | `1024px` | Grid de 2 colunas em cards, font-size bumps — **muito usado** |
| `xl` | `1280px` | Pouco uso explícito |
| `2xl` | `1536px` | Pouco uso explícito |

### Padrões Responsivos Observados

**Luminal:**
- Mobile-first: `grid-cols-1` → `md:grid-cols-4` (layout principal)
- Font scaling: `text-5xl` → `md:text-7xl` → `lg:text-9xl`
- Padding: `p-8` → `md:p-12` → `lg:p-16`
- Grid columns: `grid-cols-1` → `lg:grid-cols-2` → `lg:grid-cols-12`
- Elements hidden on mobile: `hidden md:block` (grid decorativo, beams)

**Instagram Slides:**
- Aspect ratio: `aspect-[9/16]` → `md:aspect-[3/4]`
- Max-width: `md:max-w-xl`
- Font scaling: moderado (1-2 breakpoints)
- Snap behavior: scroll-snap vertical full-height

---

## 10. Backdrop & Blur

| Classe | Valor | Uso |
|--------|-------|-----|
| `backdrop-blur-md` | `blur(12px)` | Header fixed (ambos) — **padrão** |
| `backdrop-blur-sm` | `blur(4px)` | Code editor window |
| `backdrop-blur` (custom) | `blur(20px)` | `.glass-panel` (IG) |
| `blur-3xl` | `blur(64px)` | Glow highlights |
| `blur-[0.5px]` | `blur(0.5px)` | Conic gradient edge |
| `blur-[50px]` | `blur(50px)` | Background glow sutil |
| `blur-[60px]` | `blur(60px)` | Ambient glow (Luminal) |
| `blur-[90px]` | `blur(90px)` | Ambient glow vermelho (Luminal) |
| `blur-[120px]` | `blur(120px)` | CTA background glow |

---

## 11. Layout Patterns

### Grid Systems

**Luminal — Grid de 4 colunas:**
```
grid grid-cols-1 md:grid-cols-4 divide-x divide-white/10
```
- Sidebar 1 coluna + conteúdo 3 colunas
- Usado em todas as seções (About, Capabilities, Featured, Process, Pricing)

**Luminal — Grid de 12 colunas:**
```
grid grid-cols-1 md:grid-cols-12
```
- Para layouts assimétricos (5+7, 8+4, 3+9)

**Instagram — Full-screen scroll snap:**
```
h-screen snap-y snap-mandatory overflow-y-auto
```
- Cada slide: `snap-start h-screen`

### Z-Index Scale

| Valor | Uso |
|-------|-----|
| `z-0` | Marquee content |
| `z-10` | Grid overlay, texto, gradients |
| `z-20` | Seções principais, labels, nav dots, footer |
| `z-30` | Sidebar sticky |
| `z-50` | Cursor animado, modais |
| `z-[60]` | Header fixed (IG) |

---

## 12. Padrões de Componentes Recorrentes

### CTA Button (Luminal) — Usado 10+ vezes
```html
<div class="relative group cursor-pointer w-max">
  <!-- Conic gradient border on hover -->
  <div class="absolute -inset-[1px] rounded-md 
    bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_300deg,#ef4444_360deg)] 
    opacity-0 group-hover:opacity-100 transition-opacity duration-300 
    animate-border-spin blur-[0.5px]">
  </div>
  <!-- Button body -->
  <div class="relative bg-neutral-900 border border-red-500/20 text-neutral-300 
    px-5 py-2.5 rounded-md flex items-center gap-3 shadow-lg shadow-red-500/5 
    group-hover:text-red-400 group-hover:border-red-500/50 transition-all duration-300">
    <span class="text-xs font-medium tracking-[0.2em] uppercase">Label</span>
    <iconify-icon icon="solar:arrow-right-up-linear" width="16" height="16" 
      class="text-neutral-500 group-hover:text-red-400 group-hover:translate-x-1 
      transition-all duration-300">
    </iconify-icon>
  </div>
</div>
```

### Glass Panel (Instagram Slides)
```css
.glass-panel {
  background: rgba(23, 23, 23, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
```

### Flashlight Card (Instagram Slides)
```css
.flashlight-card {
  background: rgba(255, 255, 255, 0.01);
  position: relative;
}
.flashlight-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    800px circle at var(--mouse-x) var(--mouse-y),
    rgba(255, 255, 255, 0.08),
    transparent 40%
  );
  pointer-events: none;
}
```

### Reveal on Scroll (Ambos)
```css
.reveal-hidden {
  opacity: 0;
  transform: translateY(20px);  /* Luminal: 20px, IG: 30px */
  filter: blur(10px);
}
.animate-in {
  animation: fadeInUpBlur 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  /* IG: animationIn 0.8s ease-out forwards */
}
```

### Grid Decorativo + Separadores (Luminal)
```html
<!-- Grid overlay de 4 colunas com bordas white/10 e "+" nos cruzamentos -->
<div class="absolute inset-0 grid grid-cols-4 pointer-events-none">
  <div class="border-r border-white/10 relative">
    <div class="absolute -right-[5px] -top-[5px] text-white/30 text-xs">+</div>
  </div>
  ...
</div>
```

---

## 13. Resumo Comparativo

| Aspecto | Luminal Creative Studio | Instagram Slides 02 |
|---------|------------------------|---------------------|
| **Tema** | Dark (neutral-950) | Dark (neutral-950 / --bg-deep: #050505) |
| **Cor de Acento** | Red-500 (#ef4444) | Nenhuma (100% monocromático) |
| **Font Body** | Inter | Inter |
| **Font Display** | Syne | Mono stack (Inter, Geist Mono) |
| **Fontes Carregadas** | ~7 | ~20 (intercambiáveis) |
| **Border Radius** | Maioria `none`, CTAs `md` | Maioria `none` |
| **Layout** | Grid 4-col com sidebar | Scroll-snap vertical full-screen |
| **Interação Destaque** | Conic gradient border spin | Flashlight mouse-follow |
| **Animação Principal** | fadeInUpBlur + typing + cube-reveal | animationIn + textSlide |
| **Complexidade CSS** | Alta (muitas @keyframes inline) | Moderada (menos animações, mais interação JS) |
| **Border Pattern** | `border-white/10` onipresente | `ring-white/5`, `border-white/5` mais sutil |
| **Uso de Blur** | Glow vermelho (`blur-[90px]`) | Glass panels (`blur(20px)`) |
