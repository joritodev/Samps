# Plano da fatia — upload de imagem e capa do quadro com foto

**Data:** 2026-10-02 · **Playbook:** schema/upload fora de plano → este plano fecha o desenho; **executar com modelo forte e revisão de segurança**.
**Spec relacionada:** `specs/2026-10-02-personalizacao-quadro-design.md`, `specs/2026-10-02-personalizacao-global-design.md`.

## Decisão pendente do usuário (bloqueia a execução)
Onde guardar os arquivos. Recomendação: **Vercel Blob** (projeto já está na Vercel; sem servidor próprio; URL pública imutável). Alternativas: Cloudflare R2 / S3 (mais controle, mais configuração). Exige criar o store e a variável `BLOB_READ_WRITE_TOKEN` na Vercel.

## Desenho
- **Fluxo:** o cliente envia o arquivo por Server Action/Route Handler (`multipart`), o servidor valida, reprocessa e grava no storage; o banco recebe só a URL e metadados. Sem upload direto do navegador ao storage (evita burlar validação).
- **Validação no servidor:** tipos `image/jpeg|png|webp` conferidos por **assinatura de bytes** (não pelo nome/`Content-Type`); limite 5 MB; dimensões mín. 1280×320, máx. 6000×6000; SVG e GIF recusados.
- **Reprocessamento:** `sharp` redimensiona (largura máx. 2400), recorta para proporção de faixa (aprox. 6:1) com foco central, converte para WebP, **remove EXIF/GPS**. O original não é guardado.
- **Nome do arquivo:** aleatório (cuid), caminho `board-covers/<boardId>/<id>.webp`; nunca usar o nome enviado.
- **Permissão:** `requireClientAccess(clientId)` + `clients.edit`; o quadro tem de pertencer ao cliente. Rate limit por usuário (ex.: 10 envios/hora).
- **Dados:** `ClientBoard.config.appearance.coverImage = { url, w, h }` (sem migração). Quando houver imagem, ela tem prioridade sobre a capa em gradiente. Ao trocar/remover, apagar o arquivo antigo do storage (best-effort) e registrar em auditoria (`logAudit`).
- **Exibição:** faixa já existente; `<img>` com `alt=""`, `object-cover`, escurecimento em gradiente por cima, `loading="eager"` (acima da dobra) com dimensões fixas para não deslocar o layout. CSP `img-src https:` já cobre o domínio do Blob.
- **UI:** na aba Geral > Aparência, botão "Enviar foto" com pré-visualização do recorte e "Remover foto"; erros claros (tipo, tamanho, dimensão).
- **Reuso:** a função de upload nasce genérica (`lib/storage/image-upload.ts`: `validateImage`, `processCover`, `putImage`, `deleteImage`) para login e portal depois.

## Tarefas (ordem)
1. Spike: confirmar storage com o usuário; criar store e variável de ambiente (Vercel + `.env.example`).
2. `lib/storage/image-upload.ts` + testes (assinatura de bytes, limites, SVG recusado, EXIF removido, nome aleatório).
3. Action `uploadBoardCoverAction` e `removeBoardCoverAction` (permissão, posse do quadro, rate limit, auditoria) + testes.
4. `sanitizeAppearance`/`parseAppearance` aceitam `coverImage` apenas com URL do domínio do storage.
5. UI de envio/remoção + exibição na faixa; teste de componente.
6. Gates: tsc, lint, vitest, build, captura real; **security-review** obrigatório (upload).

## Critérios de pronto
Imagem inválida (SVG, executável renomeado, 20 MB) é recusada; foto com GPS sai sem EXIF; usuário sem `clients.edit` ou de outro cliente recebe erro; trocar a foto apaga a anterior; faixa não causa deslocamento de layout; contraste do título/controles inalterado.

## Fora do escopo
Login, portal externo, perfil e preferências pessoais (fatias seguintes do mapa global).
