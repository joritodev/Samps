# Acessos temporários — teste de refinamento (não uso oficial)

**Data:** 2026-09-04  
**Objetivo:** liberar a empresa para **testar e refinar** o Samps OS. Não é go-live operacional.

## URL

- Produção: https://samps-os.vercel.app  
- Login do **app** em `/login` (Hobby: Production pública na borda da Vercel; proteção = auth do Samps OS).

## Contas seed (senha padrão)

Senha de todos: `Samps@2026`  
No primeiro acesso o middleware pode pedir `/first-access` se `mustResetPassword` estiver ativo — use o fluxo ou peça à gestão resetar.

| E-mail | Papel | Rotina de teste sugerida |
|--------|-------|--------------------------|
| `gestao@samps.digital` | Gestão | Criar demanda em `/demandas`, ver quadro global, aprovar/publicar |
| `social@samps.digital` | Social Media | Criar demanda, concluir briefing, acompanhar revisão/publicação |
| `designer@samps.digital` | Designer | `/meu-painel/design` (não use `/setores/design` — redireciona): Assumir → Iniciar → Entregar revisão |
| `videomaker@samps.digital` | Videomaker | `/meu-painel/video` — mesmo ciclo |
| `editor@samps.digital` | Editor | `/meu-painel/video` — fila / ajustes |
| `trafego@samps.digital` | Tráfego | `/meu-painel/trafego` |
| `admin@samps.digital` | Admin | Só se precisar de permissão total |
| `cliente@samps.digital` | Cliente externo | Portal — **não** vê mural/ausências internos |

## Ciclo mínimo a validar

1. Social/Gestão: `/demandas` → **Nova Demanda** → cliente + título → criar (status *A planejar*).
2. Abrir o card → preencher briefing → **Concluir briefing** (vira *Demandada* no setor).
3. Designer (ou executor do setor): Assumir → Iniciar produção → concluir com link do material → *Em revisão*.
4. Revisor: **Solicitar ajuste** (volta *Em ajuste*) **ou** **Aprovar**.
5. Após aprovado: registrar publicação (link) → *Publicada*.

## Antes de enviar os acessos

1. [ ] `master` com a fatia de criar demanda mergeada e deploy Vercel **Ready**
2. [ ] `npx prisma migrate deploy` no Neon de Production (se ainda houver migration pendente)
3. [ ] Confirmar login com `social@samps.digital` / `Samps@2026`
4. [ ] Confirmar que o banco é **seed de demonstração** (sem dado real de cliente)
5. [ ] Combinar canal de bug (WhatsApp/e-mail da gestão) e avisar: *teste de refinamento, não operação oficial*

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
