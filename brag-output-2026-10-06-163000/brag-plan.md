# Samps OS — vídeo de abertura da reunião (v2)

**Run:** 2026-10-06 16:30
**Formato:** landscape 1920×1080, 30 fps
**Duração:** 70 s (pedido do cliente: "mais completo, mais profissional" — acima da janela padrão de 15–25 s do /brag)
**Tom:** `polished` + `cinematic` — filme de produto, não meme. Narrativa dor → método → gestão.
**Idioma:** português do Brasil (terminologia do produto: demanda, briefing, quadro, setor, cronômetro, Meu Painel, portal).
**Uso:** roda antes da apresentação ao vivo da plataforma para a Samps Digital.

## Por que refazer

A primeira versão foi rejeitada: animações soltas, fluxo sem sentido, música ruim, nenhuma dor real da
agência e nenhuma tela real do produto. Esta versão troca as três coisas:

1. **Dores reais, tiradas do contexto do projeto** (não genéricas).
2. **Fotos novas, de verdade:** 20 capturas da aplicação rodando local com o banco da
   `prisma/simulate-quarter.ts` (um trimestre fechado de operação: 5 clientes, 367 demandas, 641 sessões
   de trabalho, metas e OKRs). Tema escuro, 1600×1000 @2x.
3. **Outra trilha:** "The Builder", de Kevin MacLeod (CC BY 4.0) — build eletrônico com queda em 7,5 s,
   quebra em 30–38 s, pico em 46,5 s e 64,5 s. O roteiro foi escrito **em cima** dessa estrutura.

## Rubrica de planejamento

| Pergunta | Resposta |
|---|---|
| O que é o projeto | Samps OS, o sistema operacional interno da Samps Digital: demanda, briefing, produção, revisão, publicação e portal do cliente |
| Para quem é o vídeo | Para a própria agência que encomendou o software (gestão + time), na abertura da reunião |
| Qual é a dor | Operação espalhada em mil quadros/abas de Trello, status no WhatsApp, briefing mudando no meio da produção, hora não medida, gestão perguntando status de pessoa em pessoa, cliente sem lugar para ver o que saiu |
| Qual é a prova | As telas reais: quadro do cliente, cartão com briefing bloqueado, cronômetro rodando, Drive + visibilidade, Meu Painel por setor, agenda, portal, painel de gestão, performance do trimestre, metas e OKRs automáticos |
| O gancho | "Mil abas. Nenhuma resposta." sobre um campo de quadros fantasmas se multiplicando |
| A virada | Corte seco na queda da música (7,5 s) para a tela de login real com o lema da marca |
| O payoff | O trimestre medido pelo próprio sistema (307 entregas, 81% no prazo, 624 h) e OKR que se atualiza sozinho |
| O que NÃO entra | Número inventado de cliente, depoimento, promessa de SaaS, "streamline your workflow", print com dado de cliente real |
| Encerramento | "Do contrato à publicação, em um só lugar." + "Agora, ao vivo." (deixa o gancho para a demo) |

## Identidade

Do `DESIGN.md` (sem inventar): Tinta `#0B111E`, noite-moldura `#0A0C12`, Teal Profundo `#0C7E92`,
Ciano Lente `#2DB3C8`, noite-ciano `#3CC7DD`, Brasa `#E08A5C`, Papel `#F9FAFB`.
Tipografia: Plus Jakarta Sans 600/700 (display) e Inter 400/500/600 (texto), arquivos locais.
Fundo do filme: `#07090e` com brilho teal difuso e estático (gradiente grande, sem halo animado — a v1
causou banding). Legenda sempre no canto inferior esquerdo, sobre scrim, com barra teal de acento.

## Storyboard

Tempos em segundos. Cada legenda tem no mínimo 0,3 s por palavra de leitura.

### Ato 0 — O antes (0 → 7,4) · trilha no intro silencioso

| # | t | Tela | Texto | Movimento | SFX |
|---|---|---|---|---|---|
| S1 | 0,0–2,6 | campo de ~34 quadros fantasmas (DOM, cinza) se multiplicando | kicker `ANTES` · **"Mil abas. Nenhuma resposta."** | cards entram em stagger de 0,04 s; leve drift | `ui/rollover1` (0,2) + `interface/select_008` |
| S2 | 2,6–4,8 | mesmo campo, mais denso, chips "Atrasada" piscando | **"O briefing mudava no meio da produção."** | cards continuam a densificar | `interface/click_003` |
| S3 | 4,8–7,4 | campo satura e desfoca | **"O status real estava no WhatsApp. Às 23h."** | blur + desaturação subindo até o corte | `impact/impactGeneric_light_002` |

### Ato 1 — A virada (7,4 → 13,4) · queda da trilha em 7,5

| # | t | Tela | Texto | Movimento | SFX |
|---|---|---|---|---|---|
| S4 | 7,4–13,4 | quadro de marca limpo + a tela de acesso real (`/login`) como painel emoldurado à direita | **"Samps OS"** · "O sistema operacional da agência." · lema "Diagnóstico + Planejamento + Método = Resultado" · "Um acesso · o cargo decide o que abre" | wipe teal varre os cards; o painel entra deslizando da direita e respira 1,00 → 1,03 | `impact/impactBell_heavy_000` + `impactSoft_medium_001` em 7,40 |

### Ato 2 — O método, passo a passo (13,4 → 38,0)

| # | t | Tela real | Legenda | Punch |
|---|---|---|---|---|
| S5 | 13,4–17,8 | `/clientes/{id}` | 01 CONTRATO · **"O contrato gera a demanda."** | 1,0 → 1,45 nos KPIs do cliente (14 em aberto · 91 demandas · 77 publicadas) |
| S6 | 17,8–22,2 | `/clientes/{id}/quadro` | 02 QUADRO · **"Um quadro por cliente. Nada se perde no meio."** | pan lateral + 1,05 → 1,18 |
| S7 | 22,2–26,6 | cartão → aba Briefing | 03 BRIEFING · **"O briefing trava quando é concluído."** | 1,0 → 1,8 em "Briefing bloqueado em 02/10/2026 14:18" |
| S8 | 26,6–30,2 | Meu Painel · Design com cronômetro rodando | 04 PRODUÇÃO · **"A produção é medida, não estimada."** | 1,0 → 1,9 no chip "Em execução… 0min" |
| S9 | 30,2–34,2 | cartão → aba Produção (quebra da trilha) | 05 ENTREGA · **"Link do Drive na demanda. E você decide o que o cliente vê."** | 1,05 → 1,6 no toggle "Visível no portal do cliente" |
| S10 | 34,2–38,0 | `/portal` como cliente externo | 06 PORTAL · **"O cliente vê só o que foi liberado."** | 1,02 → 1,3 nos contadores do portal |

### Ato 3 — A operação inteira (38,0 → 51,5) · trilha volta em 38

| # | t | Tela real | Legenda | Punch |
|---|---|---|---|---|
| S11 | 38,0–42,4 | Meu Painel Design / Social / Vídeo (tríptico em 3 cortes de ~1,4 s) | 07 SETORES · **"Cada setor com a sua fila."** | cada corte com 1,04 → 1,12 |
| S12 | 42,4–46,5 | `/agenda` | 08 AGENDA · **"Prazo, entrega, publicação e reunião no mesmo calendário."** | 1,02 → 1,25 no mês |
| S13 | 46,5–51,5 | `/painel-gestao` (pico da trilha em 46,5) | 09 GESTÃO · **"Ver sem perguntar."** sub: "57 em aberto · 3 atrasadas · 14 sem responsável" | corte seco em 1,0, punch 1,0 → 1,5 na régua de KPIs, depois desliza para "Carga por pessoa" |

### Ato 4 — O resultado medido (51,5 → 64,5)

| # | t | Tela real | Legenda | Punch |
|---|---|---|---|---|
| S14 | 51,5–57,0 | `/performance?preset=lastquarter` | 10 PERFORMANCE · **"Um trimestre inteiro, medido pelo próprio sistema."** sub: "307 entregas · 81% no prazo · 624 h — simulação de um trimestre" | 1,0 → 1,55 na régua 307 / 81% / 25% / 624 h |
| S15 | 57,0–61,2 | `/performance/okrs` | 11 METAS · **"Metas e OKRs que se atualizam sozinhos."** | 1,0 → 1,7 em "Automático · 81% → 95%" |
| S16 | 61,2–64,5 | par claro/escuro do painel de gestão | 12 IDENTIDADE · **"Claro ou escuro. A mesma marca."** | wipe vertical revelando o tema claro sobre o escuro |

### Ato 5 — Fechamento (64,5 → 70,0) · pico em 64,5 e cauda silenciosa

| # | t | Tela | Texto | Movimento | SFX |
|---|---|---|---|---|---|
| S17 | 64,5–70,0 | quadro de marca limpo (fundo + brilho teal/brasa) | **"Do contrato à publicação, em um só lugar."** · "Samps OS · o sistema operacional da Samps Digital" · lista do ciclo (contrato → portal) · "Agora, ao vivo." · crédito da trilha | título sobe, régua abre, as 6 etapas entram em stagger de 0,11 s | `impact/impactBell_heavy_003` em 64,45 |

Barra de progresso teal de 2 px cresce de 0 a 1920 ao longo dos 70 s (acabamento, não enfeite).

## Áudio

- **Trilha:** `assets/music/the-builder-by-kevin-macleod.mp3`, fade-in de 1,4 s até 0,30,
  `data-automation` levantando para 0,44 na queda (7,5 s), 0,48 no pico de 46,4 s, 0,50 em 64,4 s
  e descendo a 0 entre 66,6 e 70 s. Não há narração, então a trilha carrega o filme.
- **SFX:** 12 cues, 0,55–0,78 de volume, cada um em sua própria track-index (trilha = 10, SFX = 11+).
  Famílias: `impact/impactSoft_*` e `impactBell_heavy_*` nas viradas; `interface/drop_*`,
  `click_003`, `select_008` nas entradas de legenda; nada em cima de texto denso.
- **Música cue guidance:** estrutura medida com análise de RMS do próprio arquivo (intro 0–7,4 s;
  groove em 7,5 s; quebra 30–38 s; picos em 46,5 s e 64,5 s; vale em 65,5–69 s). Cortes de ato travados
  em 7,4 · 30,2 · 38,0 · 46,5 · 64,5. Beat grid fina via `npx hyperframes beats` depois de montar.
- **Audio-reactive:** sutil — brilho de fundo e presença do shot respiram com o RMS. Sem waveform,
  sem equalizador, sem halo animado (banding).

## Honestidade

- Os números em tela vêm do banco da simulação de trimestre que acompanha o produto; a legenda do S14
  diz "simulação de um trimestre". Nenhum resultado de cliente real é afirmado.
- Nenhuma captura contém dado de cliente real: os cinco clientes são fictícios (Clínica Aurora,
  Studio Vita, Doce Raiz, Mendes & Prado, Terra Viva) e os links usam `example.com`.
- Crédito da trilha no quadro final, como pede a licença CC BY 4.0.
