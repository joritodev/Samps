# Acessos temporários — teste de refinamento (não uso oficial)

**Data:** 2026-09-04  
**Objetivo:** liberar a empresa para **testar e refinar** o Samps OS. Não é go-live operacional.

## URL

- Produção: https://samps-os.vercel.app  
- Login do **app** em `/login` (Hobby: Production pública na borda da Vercel; proteção = auth do Samps OS).

## Contas seed (senha padrão)

Senha de todos: `Samps@2026`  
Seed marca `mustResetPassword: false` — sem fluxo de primeiro acesso nas contas demo.

| E-mail | Papel | Rotina de teste sugerida |
|--------|-------|--------------------------|
| `gestao@samps.digital` | Gestão | `/demandas` (criar), atribuição, overview; pode aprovar/publicar |
| `social@samps.digital` | Social Media | `/demandas` (criar + briefing) → `/meu-painel/social` (aprovar / publicar) |
| `designer@samps.digital` | Designer | `/meu-painel/design` (não use `/setores/design` — redireciona): Assumir → Iniciar → Entregar revisão |
| `videomaker@samps.digital` | Videomaker | `/meu-painel/video` — mesmo ciclo |
| `editor@samps.digital` | Editor | `/meu-painel/video` — fila / ajustes |
| `trafego@samps.digital` | Tráfego | `/meu-painel/trafego` |
| `admin@samps.digital` | Admin | Só se precisar de permissão total |
| `cliente@samps.digital` | Cliente externo | Portal — **não** vê mural/ausências internos |

## Ciclo mínimo a validar

1. Social/Gestão: `/demandas` → **Nova Demanda** → cliente + título → criar (status *A planejar*; quadro atualiza na hora).
2. Abrir o card → preencher briefing → **Concluir briefing** (vira *Demandada* no setor).
3. Social: acompanhar em `/meu-painel/social` (fila **Demandas**; extras = origem gestão).
4. Designer (ou executor do setor): Assumir → Iniciar produção → concluir com link do material → *Em revisão*.
5. Revisor (**Social / Gestão / Admin** — não o executor): **Solicitar ajuste** **ou** **Aprovar** (só com status *Em revisão*).
6. Após *Aprovada*: registrar publicação (link) → *Publicada* (não dá para publicar direto de *Em revisão*).

## Antes de enviar os acessos

1. [x] `master` com fatia criar demanda + correções QA mergeadas (local 2026-09-08 preparado; **deploy Vercel** ainda confirmar Ready)
2. [ ] `npx prisma migrate deploy` no Neon de Production (se ainda houver migration pendente)
3. [ ] Confirmar login com `social@samps.digital` / `Samps@2026` em produção
4. [x] Banco com seed/demo enriquecido (`prepare-test-demo-data` — anexos + tipos vídeo demo + Top 5)
5. [ ] Combinar canal de bug (WhatsApp/e-mail da gestão) e avisar: *teste de refinamento, não operação oficial*

Ver também: `2026-09-08-relatorio-preparacao-teste.md`.

## Mensagem pronta para colar

```
Olá! Segue acesso temporário para TESTE do Samps OS (refinamento — ainda não é uso oficial).

URL: https://samps-os.vercel.app
Login exemplo (Social): social@samps.digital
Senha: Samps@2026

Peço que cada pessoa use o login do próprio cargo (social, design, vídeo, gestão).
Roteiro curto: criar demanda → demandar setor → assumir → produzir → revisão → ajuste ou aprovar → publicar.

Reportem bugs com: (1) usuário, (2) tela, (3) o que esperavam, (4) o que aconteceu.
Não enviem arquivo/dado de cliente real neste ambiente.
```

## Segurança

- Trocar senhas seed **antes** de qualquer go-live.
- Não compartilhar `admin@` com o time amplo.
- Se houver dado real, criar Neon separado e re-seed — ver `2026-08-acesso-teste.md`.
