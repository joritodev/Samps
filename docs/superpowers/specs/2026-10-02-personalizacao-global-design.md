# Personalização no site inteiro (mapa de possibilidades)

**Data:** 2026-10-02 · **Status:** proposta, sem código. Depende da fatia de upload (plano em `plans/2026-10-02-upload-capa-quadro.md`).

## Estado atual (verificado no código)
- Tema claro/escuro: `next-themes`, página `/configuracoes/temas`, seletor também no login. Preferência fica **no navegador**.
- Login: `SampsAuthShell` sobre `bg-background`, sem imagem de marca.
- `AgencySettings` (singleton): `name`, `logoUrl`, `portalName`, `portalLogoUrl`.
- `User.avatarUrl` e `Client.logoUrl` são **campos de URL digitada**; não existe upload binário nem storage no projeto.
- `User.notificationPrefs` (Json) já guarda preferências por pessoa. Não há campo geral de preferências.
- CSP já permite `img-src https:`; hospedagem na Vercel; banco Neon.
- Quadro do cliente: cor + capa por chaves em `ClientBoard.config.appearance` (entregue).

## Princípio
Personalizar a **moldura** (login, cabeçalhos, destaque), nunca a superfície de trabalho (cards, tabelas, alertas). Conjuntos fechados de opções; imagem só onde há texto sobre ela com escurecimento garantido.

## Onde cabe, por camada
| # | Onde | Quem decide | Onde guarda | Risco |
|---|------|-------------|-------------|-------|
| 1 | **Tema de cor do app inteiro** (mesmas 7 chaves do quadro) | cada pessoa | `User.preferences` (novo Json) + cookie espelho para o 1º render sem flash | baixo |
| 2 | **Login: fundo e identidade da agência** (imagem + logo + frase) | gestão/admin | `AgencySettings.loginBackground*` | médio: página pública, imagem de upload |
| 3 | **Login: tema claro/escuro e cor** | quem acessa, por dispositivo | cookie/localStorage (não há usuário antes do login) | baixo |
| 4 | **Capa do quadro com foto própria** | `clients.edit` | `ClientBoard.config.appearance.coverImage` | médio (upload) |
| 5 | **Capa do perfil / cabeçalho do Meu painel** | cada pessoa | `User.preferences` | médio (upload) |
| 6 | **Densidade** (confortável/compacta) | cada pessoa | `User.preferences` | baixo |
| 7 | **Portal do cliente** (cor e capa de marca para o cliente externo) | gestão | `ClientPortal.config` | médio: superfície pública |
| 8 | Fundo de página inteira e imagens atrás de listas | — | — | **não recomendado** (legibilidade) |

## Pontos de atenção
- **Login é pré-identidade:** não dá para aplicar preferência de usuário. Opções: (a) visual único definido pela agência; (b) por dispositivo via cookie. Recomendo (a) + toggle de tema já existente.
- **Primeiro render:** preferência no banco causa flash. Espelhar a cor em cookie lido no `layout` raiz para renderizar `data-accent` no servidor.
- **Contraste:** toda cor nova precisa passar 4,5:1 com o texto do botão nos dois temas (validar na tabela de chaves, com teste).
- **Imagem pública no login:** pode ser indexada/baixada por qualquer um; só imagem de marca, nunca de cliente.
- **Branding por cliente no portal externo** é a camada de maior valor comercial e a que mais precisa de revisão de segurança.

## Ordem sugerida (1 fatia = 1 PR)
1. Upload de imagem (infra) + capa do quadro com foto (plano separado).
2. Tema de cor pessoal + densidade (`User.preferences`, cookie espelho).
3. Login com identidade da agência (reaproveita o upload).
4. Portal do cliente com marca.
