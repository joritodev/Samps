# Vibe Design System

Design System completo, escalável e documentado — extraído e padronizado a partir dos sites **Luminal Creative Studio** e **Instagram Slides** (aura.build).

---

## 📁 Estrutura

```
base/design-system/
├── index.css                  ← Entry point (importa tudo)
├── tokens/
│   ├── colors.css             ← Paleta de cores + temas
│   ├── typography.css         ← Fontes, tamanhos, pesos
│   └── spacing.css            ← Espaçamento, radius, sombras, z-index, motion
├── base/
│   ├── reset.css              ← CSS reset/normalize
│   ├── typography.css         ← Estilos tipográficos (headings, body, labels)
│   ├── layout.css             ← Grid system, containers, flex helpers
│   ├── animations.css         ← Keyframes + classes de animação
│   └── utilities.css          ← Classes utilitárias
├── components/
│   ├── button.css             ← Botões (6 variantes + glow animado)
│   ├── input.css              ← Input, Select, Textarea, Checkbox, Radio
│   ├── card.css               ← Cards (glass, elevated, flashlight)
│   ├── badge.css              ← Badges/Tags
│   ├── alert.css              ← Alertas (info, success, warning, error)
│   ├── modal.css              ← Modal/Dialog com overlay
│   ├── navbar.css             ← Navegação fixa com blur
│   └── misc.css               ← Footer, Tooltip, Avatar, Divider
└── preview/
    └── index.html             ← Página de preview visual
```

## 🚀 Como Usar

```html
<!-- Importe o design system completo -->
<link rel="stylesheet" href="base/design-system/index.css">

<!-- Ou importe módulos individualmente -->
<link rel="stylesheet" href="base/design-system/tokens/colors.css">
<link rel="stylesheet" href="base/design-system/components/button.css">
```

---

## 🎨 Paleta de Cores

### Cores de Brand

| Token | Hex aproximado | Uso |
|---|---|---|
| `--color-primary-500` | `#ef4444` | CTA principal, accent vermelho |
| `--color-primary-600` | `#dc2626` | Botões accent |
| `--color-accent-500` | `#3b82f6` | Links, destaques azuis |
| `--color-accent-600` | `#2563eb` | Links hover |
| `--color-secondary-600` | `#9333ea` | Detalhes roxos |

### Escala Neutra

| Token | Descrição |
|---|---|
| `--color-neutral-950` | Background base (dark) `#0a0a0a` |
| `--color-neutral-900` | Superfície `#171717` |
| `--color-neutral-800` | Elevado `#262626` |
| `--color-neutral-700` | Bordas `#404040` |
| `--color-neutral-400` | Texto muted `#a3a3a3` |
| `--color-neutral-200` | Texto default (dark) `#e5e5e5` |
| `--color-neutral-0` | Branco `#ffffff` |

### Cores Semânticas

| Token | Uso |
|---|---|
| `--color-success-*` | Sucesso, confirmação |
| `--color-warning-*` | Alertas |
| `--color-error-*` | Erros, destruição |
| `--color-info-*` | Informações |

### Temas (Dark/Light)

```css
/* Dark (padrão) */
:root, [data-theme="dark"] { ... }

/* Light */
[data-theme="light"] { ... }

/* Alternar tema via JS: */
document.documentElement.dataset.theme = 'light';
```

**Variáveis semânticas de tema:**
- `--bg-base`, `--bg-surface`, `--bg-elevated`, `--bg-overlay`
- `--fg-default`, `--fg-muted`, `--fg-subtle`, `--fg-on-accent`
- `--border-default`, `--border-strong`, `--border-subtle`
- `--accent-default`, `--accent-hover`, `--accent-muted`

---

## 🔤 Tipografia

### Fontes

| Variável | Fonte | Uso |
|---|---|---|
| `--font-sans` | Inter | Corpo de texto |
| `--font-display` | Syne | Headings, hero |
| `--font-mono` | Geist Mono | Code, labels técnicos |
| `--font-serif` | Newsreader | Decorativo |

### Escala de Tamanhos

| Token | Valor | Classe |
|---|---|---|
| `--text-2xs` | 9px | `.text-label-sm` |
| `--text-xs` | 10px | `.text-label`, `.nav-link` |
| `--text-sm` | 12px | `.text-body-sm`, `.text-caption` |
| `--text-base` | 14px | `.text-body`, `p` |
| `--text-md` | 16px | — |
| `--text-lg` | 18px | `.text-body-lg`, `h6` |
| `--text-xl` | 20px | `h5` |
| `--text-2xl` | 24px | `h4` |
| `--text-3xl` | 30px | — |
| `--text-4xl` | 36px | `h3` |
| `--text-5xl` | 48px | `h2` |
| `--text-7xl` | 72px | `h1` |

### Tamanhos Display (fluid)

```css
--text-display-sm:  clamp(2rem, 5vw, 3.75rem);
--text-display-md:  clamp(3rem, 8vw, 6rem);
--text-display-lg:  clamp(4rem, 12vw, 10rem);
--text-display-xl:  clamp(3rem, 16vw, 24rem);   /* hero gigante */
```

### Hierarquia de Headings

```html
<h1 class="heading-display-xl">Hero Display</h1>
<h1>Heading 1 (72px → 48px mobile)</h1>
<h2>Heading 2 (48px → 36px mobile)</h2>
<h3>Heading 3 (36px → 30px mobile)</h3>
<p>Body text (14px)</p>
<p class="text-lead">Lead text (18px, muted)</p>
<span class="text-label">LABEL TEXT</span>
<span class="text-overline">OVERLINE</span>
<code>monospace code</code>
```

---

## 📏 Sistema de Espaçamento

Baseado numa unidade de 4px:

| Token | Valor | px |
|---|---|---|
| `--space-1` | 0.25rem | 4px |
| `--space-2` | 0.5rem | 8px |
| `--space-3` | 0.75rem | 12px |
| `--space-4` | 1rem | 16px |
| `--space-5` | 1.25rem | 20px |
| `--space-6` | 1.5rem | 24px |
| `--space-8` | 2rem | 32px |
| `--space-10` | 2.5rem | 40px |
| `--space-12` | 3rem | 48px |
| `--space-16` | 4rem | 64px |
| `--space-20` | 5rem | 80px |
| `--space-24` | 6rem | 96px |
| `--space-32` | 8rem | 128px |

**Spacing de seção:**
- `--space-section-sm` → 64px
- `--space-section-md` → 96px
- `--space-section-lg` → 128px
- `--space-section-xl` → 192px

---

## 📐 Grid & Layout

### Container

```html
<div class="container">Max 1920px com padding lateral</div>
<div class="container container-xl">Max 1280px</div>
```

### Grid

```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div>Col 1</div>
  <div>Col 2</div>
  <div>Col 3</div>
</div>
```

### Grid 12 colunas

```html
<div class="grid grid-cols-12 gap-6">
  <div class="col-span-8">Conteúdo principal</div>
  <div class="col-span-4">Sidebar</div>
</div>
```

### Flex helpers

```html
<div class="flex-center">Centralizado</div>
<div class="flex-between">Espaçado</div>
<div class="flex-col gap-4">Stack vertical</div>
```

### Stack (vertical spacing pattern)

```html
<div class="stack">Filhos com gap-4 vertical</div>
<div class="stack-lg">Filhos com gap-8 vertical</div>
```

### Breakpoints

| Nome | Largura |
|---|---|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

---

## 🧱 Design Tokens

### Border Radius

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | 4px | Botões compactos |
| `--radius-base` | 8px | Padrão (= `--radius`) |
| `--radius-lg` | 12px | Cards |
| `--radius-xl` | 16px | Modais |
| `--radius-2xl` | 24px | Cards grandes |
| `--radius-full` | 9999px | Pills, avatares |

### Sombras

| Token | Uso |
|---|---|
| `--shadow-xs` | Elevação sutil |
| `--shadow-sm` | Cards padrão |
| `--shadow-lg` | Cards hover |
| `--shadow-xl` | Modais |
| `--shadow-glow-primary` | Glow azul (CTA) |
| `--shadow-glow-accent` | Glow vermelho |
| `--shadow-ring` | Focus ring |

### Z-Index

| Token | Valor | Uso |
|---|---|---|
| `--z-base` | 0 | Conteúdo normal |
| `--z-raised` | 10 | Conteúdo elevado |
| `--z-sticky` | 30 | Navbar |
| `--z-overlay` | 40 | Overlays |
| `--z-modal` | 50 | Modais |
| `--z-tooltip` | 80 | Tooltips |

### Transições

```css
--ease-default:  cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring:   cubic-bezier(0.22, 1, 0.36, 1);  /* cards Luminal */
--ease-bounce:   cubic-bezier(0.16, 1, 0.3, 1);   /* reveal animations */

--duration-fast:     150ms;
--duration-default:  300ms;
--duration-slow:     500ms;
--duration-slower:   800ms;
```

---

## 🔘 Componentes

### Button

```html
<!-- Variantes -->
<button class="btn btn-primary">Primary</button>
<button class="btn btn-accent">Accent (vermelho)</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-ghost">Ghost</button>
<button class="btn btn-danger">Danger</button>
<button class="btn btn-glow">Glow Animado</button>

<!-- Tamanhos -->
<button class="btn btn-primary btn-xs">Extra Small</button>
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary btn-md">Medium</button>
<button class="btn btn-primary btn-lg">Large</button>
<button class="btn btn-primary btn-xl">Extra Large</button>

<!-- Modificadores -->
<button class="btn btn-primary btn-pill">Pill Shape</button>
<button class="btn btn-primary btn-block">Full Width</button>
<button class="btn btn-ghost btn-icon">🔍</button>
<button class="btn btn-primary" disabled>Disabled</button>
```

**Estados:** hover (cor/shadow), active (scale 0.98), focus-visible (ring), disabled (opacity 0.5)

### Input / Select / Textarea

```html
<!-- Input padrão -->
<div class="form-group">
  <label class="form-label">Email</label>
  <input type="email" class="input" placeholder="you@example.com">
  <span class="form-helper">Nunca compartilhamos seu email.</span>
</div>

<!-- Input minimal (underline) -->
<input type="email" class="input input-minimal" placeholder="Enter your email">

<!-- Select -->
<select class="select">
  <option>Option 1</option>
  <option>Option 2</option>
</select>

<!-- Textarea -->
<textarea class="textarea" placeholder="Sua mensagem..."></textarea>

<!-- States -->
<input class="input input-error" value="Invalid">
<span class="form-error">Este campo é obrigatório.</span>

<!-- Checkbox / Radio -->
<input type="checkbox" class="checkbox">
<input type="radio" class="radio" name="choice">
```

### Card

```html
<!-- Card padrão -->
<div class="card">
  <div class="card-body">Conteúdo</div>
</div>

<!-- Card glass (translúcido) -->
<div class="card card-glass">
  <div class="card-header"><h3>Título</h3></div>
  <div class="card-body">Conteúdo</div>
  <div class="card-footer">Footer</div>
</div>

<!-- Card interactive com accent hover -->
<div class="card card-interactive card-accent-hover">
  <div class="card-body">
    <span class="card-accent-text">Hover me</span>
  </div>
</div>

<!-- Card flashlight (mouse tracking) -->
<div class="card card-flashlight">
  <div class="card-body">Move o mouse aqui</div>
</div>
```

### Badge

```html
<span class="badge badge-default">Default</span>
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success badge-dot">Online</span>
<span class="badge badge-warning">Pendente</span>
<span class="badge badge-error">Erro</span>
<span class="badge badge-solid-accent">Novo</span>
```

### Alert

```html
<div class="alert alert-info">
  <div class="alert-content">
    <div class="alert-title">Informação</div>
    <div class="alert-description">Detalhes da mensagem aqui.</div>
  </div>
</div>

<div class="alert alert-success"> ... </div>
<div class="alert alert-warning"> ... </div>
<div class="alert alert-error"> ... </div>
```

### Modal

```html
<div class="modal-overlay is-open">
  <div class="modal">
    <div class="modal-header">
      <h3 class="modal-title">Título</h3>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <p>Conteúdo do modal aqui.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost">Cancelar</button>
      <button class="btn btn-primary">Confirmar</button>
    </div>
  </div>
</div>
```

### Navbar

```html
<header class="navbar">
  <div class="navbar-inner">
    <a href="/" class="navbar-brand">Brand</a>
    <nav class="navbar-nav">
      <a href="#" class="nav-link is-active">Home</a>
      <a href="#" class="nav-link">About</a>
      <a href="#" class="nav-link">Contact</a>
    </nav>
    <button class="navbar-toggle">☰</button>
  </div>
</header>
<main class="has-navbar">...</main>
```

### Misc (Avatar, Tooltip, Divider, Footer)

```html
<!-- Avatar -->
<div class="avatar avatar-lg">
  <img src="photo.jpg" alt="User">
</div>

<!-- Avatar group -->
<div class="avatar-group">
  <div class="avatar avatar-md"><img src="1.jpg"></div>
  <div class="avatar avatar-md"><img src="2.jpg"></div>
  <div class="avatar avatar-md">+3</div>
</div>

<!-- Tooltip -->
<span class="tooltip">
  Hover me
  <span class="tooltip-content">Tooltip text</span>
</span>

<!-- Divider -->
<hr class="divider">
```

---

## 🌗 Dark Mode

O sistema é **dark-first** (refletindo os sites analisados). Para mudar:

```html
<!-- Dark (padrão) -->
<html data-theme="dark">

<!-- Light -->
<html data-theme="light">
```

```js
// Toggle
function toggleTheme() {
  const html = document.documentElement;
  html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
}
```

Todas as variáveis semânticas (`--bg-base`, `--fg-default`, etc.) reagem automaticamente à troca de tema.

---

## 📋 Estados dos Componentes

| Estado | Padrão Visual |
|---|---|
| **Default** | Cores e opacidades base |
| **Hover** | Cor mais clara, leve brilho/elevação |
| **Focus** | Focus ring (`--shadow-ring`) com 2px offset |
| **Active** | `scale(0.98)`, cor mais escura |
| **Disabled** | `opacity: 0.5`, `pointer-events: none` |

---

## 🎭 Animações

| Classe | Efeito |
|---|---|
| `.animate-fade-in-up` | Fade + slide up + blur out |
| `.animate-scale-in` | Scale de 0.95 → 1 |
| `.animate-spin` | Rotação contínua |
| `.animate-pulse` | Pulso de opacidade |
| `.animate-float` | Flutuação suave |
| `.animate-border-spin` | Borda conic-gradient girando |
| `.animate-marquee` | Scroll horizontal infinito |
| `.animate-beam` | Beam vertical (decorativo) |
| `.reveal-hidden` | Base para scroll-reveal |
| `.delay-100` a `.delay-1000` | Delays para stagger |

**Respeita `prefers-reduced-motion`** — animações são desabilitadas automaticamente.

---

## 🔗 Compatibilidade

- **ShadCN/UI**: variáveis `--background`, `--foreground`, `--primary`, `--destructive`, etc. estão mapeadas.
- **Tailwind**: os tokens seguem a mesma escala numérica e naming convention.
- **CSS Puro**: 100% CSS com custom properties, sem dependência de build tools.
- **Browsers**: Funciona em todos os browsers modernos (Chrome 80+, Firefox 78+, Safari 14+).
