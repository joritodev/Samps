# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Time interno da Samps Digital**, entre 10 e 20 pessoas, divididas em setores: social media, design, vídeo (videomaker e editor) e tráfego pago.
- **Produção e gestão usam o sistema com a mesma intensidade.** A produção pega, executa e entrega demandas (Meu Painel, cronômetro, revisão). A gestão distribui, acompanha e cobra: painel de gestão, performance, prazos e atrasos.
- **Uso principal no computador, com uso secundário no celular.** O celular serve para consultas e ações pontuais fora da mesa. Toda tela precisa funcionar nele, mas a densidade é pensada para o desktop.
- **Cliente externo**, no portal: vê só o que a equipe libera (entregas, publicações, calendário e arquivos).

## Product Purpose

O Samps OS é o sistema operacional interno da agência. O dia a dia inteiro cabe nele: demanda, briefing, produção, revisão, publicação e portal do cliente.

- **O que ele garante:**
  - o contrato gera o cartão;
  - o briefing trava depois de concluído;
  - o cronômetro mede a produção;
  - o Drive registra a entrega;
  - o portal mostra o que foi liberado.
- **Sucesso:** a operação roda no sistema, não em planilha e WhatsApp, e a gestão enxerga carga, atrasos e produtividade sem perguntar para ninguém.

## Positioning

É a ferramenta feita para o método da Samps, não um produto genérico:
- **Não é CRM white-label, não é Trello e não é produto para vender.**
- **O ciclo da demanda é a lei:** os status vêm do sistema, e as colunas do quadro são só visuais.
- **Existe papel por cargo:** cada setor tem o seu Meu Painel.

## Operating Context

**Ciclo da demanda**
- Criar a demanda → concluir o briefing → assumir no setor → produzir com cronômetro → revisão → ajuste ou aprovação → publicação.

**Organização do trabalho**
- Quadros por cliente, com colunas livres.
- Quadros por setor.
- Checklist no estilo Trello: atribuir um responsável a um item cria uma demanda-filha no Meu Painel.

**Rotinas da agência**
- Agenda com prazos, entregas, publicações, reuniões e ausências.
- Captações externas (videomaker).
- Mural de avisos e aniversários.
- Menções `@` em comentários, com notificação.

**Gestão**
- Painel de gestão.
- `/performance`: resumo, por pessoa, por tipo e exportação em CSV.
- Impersonação "ver como cliente".

## Capabilities and Constraints

- **Stack atual:** Next.js 14 (App Router), Prisma/Postgres, NextAuth, Tailwind + shadcn/ui, Vitest. Deploy na Vercel.
- **Papéis e permissões por tipo de usuário:** ADMIN, MANAGEMENT, SOCIAL_MEDIA, DESIGNER, VIDEOMAKER, VIDEO_EDITOR, OTHER e EXTERNAL_CLIENT.
- **O portal nunca mostra dado interno:** nada de mural, aniversário, endereço interno ou cronômetro.
- **A CSP está em modo de bloqueio**, sem `unsafe-eval`.
- **Terminologia da interface em português:** demanda, briefing, quadro, setor, captação, Meu Painel, ajuste, publicação.
- **Em aberto:**
  - pontuação da equipe (aguarda as regras da Samps);
  - anexos na demanda;
  - capacidade de 8h por pessoa.

## Brand Commitments

O usuário não declarou nenhum compromisso de marca obrigatório (29/09/2026).

Identidade que já existe no produto e serve como referência:
- nome Samps OS;
- logo da câmera em gradiente;
- lema "Diagnóstico + Planejamento + Método = Resultado".

## Evidence on Hand

- **Dados de exemplo:** clientes Bella Clinic e Clínica Sorriso, e 25 demandas (`prisma/seed.ts`).
- **Especificações e planos:** `docs/superpowers/`.
- **Não há, e não deve ser inventado:** depoimentos, métricas de cliente, cases públicos.

## Product Principles

1. **O ciclo da demanda manda.** Toda tela reflete o status real da demanda, nunca um estado paralelo.
2. **Produção e gestão têm o mesmo peso.** Uma tela serve a quem executa sem esconder o que a gestão precisa acompanhar, e o contrário também vale.
3. **Desktop primeiro, celular funcional.** A densidade é de ferramenta de mesa, e toda ação essencial continua possível no celular.
4. **Ver sem perguntar.** Carga, prazo, atraso e responsável ficam visíveis onde a decisão acontece.
5. **O portal é vitrine controlada.** O cliente vê só o que foi liberado, com clareza e sem ruído interno.
