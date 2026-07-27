# Importar o Vibe Design System neste projeto

## Objetivo

Copiar e integrar o **Vibe Design System** (CSS puro, sem frameworks) neste repositório, mantendo a estrutura de pastas e tornando os tokens/componentes utilizáveis nas páginas existentes.

## Fonte

Pasta completa em:

`c:\Users\Jorito\Downloads\nqaosgd0.aura.build\design-system\`

Estrutura esperada (copiar integralmente, sem reescrever do zero):

```
design-system/
├── index.css
├── README.md
├── tokens/     (colors.css, typography.css, spacing.css)
├── base/       (reset.css, typography.css, layout.css, animations.css, utilities.css)
├── components/ (button, input, card, badge, alert, modal, navbar, misc)
└── preview/    (index.html — galeria de referência)
```

## O que fazer

1. **Copiar** a pasta `design-system/` para a raiz deste projeto (ou para `src/design-system/` / `public/design-system/` se o stack exigir assets estáticos — escolha o caminho certo para o bundler/servidor deste repo e ajuste os `@import` relativos se necessário).

2. **Não reescrever** o CSS. Use os arquivos como estão. É 100% CSS com custom properties (`--var`), dark-first (`:root` / `[data-theme="dark"]`), light via `[data-theme="light"]`.

3. **Carregar fontes** (obrigatório para tipografia correta):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Syne:wght@400;500;600;700;800&family=Geist+Mono&family=Newsreader:ital@1&display=swap" rel="stylesheet">
```

4. **Importar o entry point** em cada página/layout que for usar o DS:

```html
<link rel="stylesheet" href="/design-system/index.css">
```

(ou o caminho equivalente no projeto; em frameworks, importe `design-system/index.css` no CSS/JS global.)

5. **Tema**: no `<html>` use `data-theme="dark"` (padrão) ou `"light"`. Toggle:

```js
document.documentElement.dataset.theme =
  document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
```

6. **Usar classes do DS** (não inventar outras). Exemplos:

- Botões: `.btn .btn-primary|accent|secondary|ghost|danger|glow` + `.btn-sm|md|lg`
- Forms: `.form-group .form-label .input .select .textarea .input-error .form-error`
- Cards: `.card .card-glass .card-interactive` + `.card-header|.card-body|.card-footer`
- Badge / Alert / Modal / Navbar / Avatar / Tooltip: conforme `design-system/README.md` e `preview/index.html`

7. **Referência visual**: abrir `design-system/preview/index.html` no navegador para ver todos os componentes. Em caso de dúvida de markup, copiar o HTML do preview.

8. **Regras**:

- Não adicionar Tailwind/Bootstrap/UI kits para estes componentes.
- Preferir tokens semânticos (`--bg-base`, `--fg-default`, `--accent-default`, `--border-default`, `--space-*`, `--radius-*`) em CSS novo.
- Não quebrar o reset global do DS sem necessidade; se o projeto já tem reset conflitante, importe só `tokens/` + `components/` e documente o que foi omitido.
- Manter `preview/` no repo como documentação viva.

## Critério de sucesso

- [ ] Pasta `design-system/` presente e completa
- [ ] CSS global carrega `index.css` + Google Fonts
- [ ] Uma página/demo usa botão, input e card do DS
- [ ] Toggle dark/light funciona via `data-theme`
- [ ] Zero dependência de framework de UI para estes estilos
