# Vibe Design System — Samps OS

Cópia integral do **Vibe Design System** (CSS puro).

## Onde está

| Caminho | Uso |
|---------|-----|
| `design-system/` | Fonte no repositório + preview local |
| `public/design-system/` | Servido pelo Next.js em `/design-system/*` |

## Escopo neste projeto

O DS é carregado **somente** nas rotas de auth (`app/(auth)`), via `VibeAuthShell`.

A intranet (`app/(agency)`) continua no design system Samps (Tailwind + tokens da marca).

Tema Samps no login: `themes/samps-login.css` (azul royal, coral, fundo `#FBFBFB`, light por padrão).

## Preview

Com o dev server rodando:

[http://localhost:3000/design-system/preview/index.html](http://localhost:3000/design-system/preview/index.html)

## Login

`/login` usa classes do DS: `.card`, `.btn-primary`, `.input`, `.form-group`, `.badge`, toggle dark/light.
