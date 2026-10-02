# Plano da fatia — upload de imagem e capa do quadro com foto

**Data:** 2026-10-02 · **Playbook:** schema/upload fora de plano → este plano fecha o desenho; **executar com modelo forte e revisão de segurança**.
**Spec relacionada:** `specs/2026-10-02-personalizacao-quadro-design.md`, `specs/2026-10-02-personalizacao-global-design.md`.

## Decisão: Vercel Blob (aprovada em 02/10, condicionada ao custo abaixo)
Projeto já está na Vercel; sem servidor próprio. Exige criar o store e a variável `BLOB_READ_WRITE_TOKEN` na Vercel.

**Custo (tabela pública; conferir na página oficial antes de ativar):** Hobby inclui 1 GB de armazenamento, 10 GB de transferência/mês e 10 mil operações simples; excedente a US$ 0,023/GB de armazenamento, US$ 0,05/GB de transferência e US$ 0,40 por milhão de operações. Plano Pro inclui transferência pela CDN (1 TB/mês por time) e créditos mensais para o restante.
**Estimativa do uso aqui:** capa tratada ~150–300 KB; 100 clientes ≈ 30 MB de armazenamento; ~20 usuários abrindo o quadro 50x/dia ≈ 4–5 GB/mês de transferência com a imagem sem cache. Cache longo (URL imutável por envio) reduz isso a uma fração.
**Guardas de custo:** limite de 5 MB por envio, capa guardada já reduzida, uma capa por quadro (a antiga é apagada), limite de envios por hora, `Cache-Control` longo.
**Atenção:** o plano Hobby da Vercel é de uso não comercial; se o Samps OS já roda em produção para a agência, o plano relevante é o Pro.

## Desenho
- **Fluxo:** o cliente envia o arquivo por Server Action/Route Handler (`multipart`), o servidor valida, reprocessa e grava no storage; o banco recebe só a URL e metadados. Sem upload direto do navegador ao storage (evita burlar validação).
- **Validação no servidor:** tipos `image/jpeg|png|webp` conferidos por **assinatura de bytes** (não pelo nome/`Content-Type`); limite 5 MB; dimensões mín. 1280×320, máx. 6000×6000; SVG e GIF recusados.
- **Seleção do recorte (requisito):** ao escolher a foto, abre uma janela com a foto inteira, um **retângulo de recorte na proporção da faixa** que a pessoa arrasta (teclado: setas) e um **controle de zoom**; a área fora do recorte aparece escurecida. Abaixo, **pré-visualização ao vivo** do cabeçalho real do quadro (faixa + logo + título + botões) com o recorte aplicado, em claro e escuro. Botões "Usar esta foto" e "Cancelar"; nada é enviado antes de confirmar. Componente de recorte próprio (sem dependência nova): cálculo em coordenadas normalizadas (x, y, largura) com limites para não sair da foto. Em celular, recorte por arrasto/pinça.
- **Reprocessamento:** o navegador envia a foto e o retângulo normalizado; o servidor **revalida e limita** o retângulo, recorta com `sharp` (largura final máx. 2400, proporção da faixa), converte para WebP e **remove EXIF/GPS**. Só a versão recortada é guardada (menos custo); para reposicionar depois, a pessoa escolhe a foto de novo.
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
