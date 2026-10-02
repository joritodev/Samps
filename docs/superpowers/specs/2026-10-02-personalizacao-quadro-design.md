# Personalização do quadro do cliente (cor + capa)

**Data:** 2026-10-02 · **Escopo:** 1 fatia, sem migração, sem upload.

## Pedido
Usuários sentiram falta de personalizar o quadro (como no Trello: cor, foto de fundo) sem poluir.

## Decisão
- **Cor de destaque** e **capa**, só na moldura do quadro. Cards, colunas e alertas (vermelho/âmbar) não mudam.
- **Conjunto fechado de chaves** (7 cores, 6 capas em CSS). Nada de cor livre, URL ou arquivo: o banco guarda só a chave e o servidor recusa o resto.
- Armazenamento em `ClientBoard.config.appearance` (JSON já existente, merge preservando as outras chaves). **Sem migração.**
- Quem edita: `clients.edit` + acesso ao cliente (mesma regra de "Geral").
- Cor: `[data-board-accent]` sobrescreve `--primary`/`--ring` só dentro do quadro, com variante escura.
- Capa: faixa decorativa (`aria-hidden`) acima do cabeçalho; o título e os controles ficam em superfície normal, sem risco de contraste.

## Fora desta fatia (replanejar antes)
- Foto enviada pelo usuário: exige storage, validação de arquivo, limites e revisão de segurança (upload).
- Fundo de página inteira e preferências por pessoa (modelo de dados próprio).
- Sheets/janelas em portal herdam a cor padrão (ficam fora do wrapper do quadro).

## Verificação
Testes de `lib/board/appearance` (parse, sanitização, recusa de URL/cor livre), tsc, lint, build, captura real do quadro.
