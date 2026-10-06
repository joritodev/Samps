# Composition brief — Samps OS, abertura da reunião (v2)

**Arquivo:** `composition/index.html` (composição única, `data-composition-id="main"`)
**Canvas:** 1920×1080 · 30 fps · 70,0 s (2100 frames)
**Fundo:** `#07090e` com dois gradientes teal estáticos (sem halo animado — foi o que causou banding na v1)
**Timeline:** uma `gsap.timeline({ paused: true })` registrada em `window.__timelines["main"]`, sem
`Date.now()` e sem `Math.random()` solto (campo de quadros usa LCG com semente `20261006`).

## Estado da validação

```
npx hyperframes check  →  0 error(s), 16 warning(s)
```

As 16 warnings são todas do mesmo tipo (`monolithic_composition` / sugestão de quebrar cada `<section>`
em sub-composição). Foi uma escolha consciente: 17 cenas que compartilham o mesmo sistema de legenda,
scrim e punch ficam mais fáceis de manter juntas, e o arquivo tem ~940 linhas.

Contraste: 19/19 checagens de texto passam WCAG AA. Layout: 0 issues em 9 amostras. Motion: 0.

## Estrutura temporal

| Cena | t (s) | Tela | O que entra |
|---|---|---|---|
| S1 | 0,00–2,60 | campo de quadros fantasmas (DOM) | "Mil abas. Nenhuma resposta." |
| S2 | 2,60–4,84 | campo mais denso | "O briefing mudava no meio da produção." |
| S3 | 4,84–7,46 | campo satura, desfoca e dessatura | "E o status real estava no WhatsApp. Às 23h." |
| S4 | 7,40–13,46 | quadro de marca + `/login` como painel emoldurado | "Samps OS" + lema da marca |
| S5 | 13,40–17,86 | `/clientes/{id}` | 01 Contrato |
| S6 | 17,80–22,26 | `/clientes/{id}/quadro` | 02 Quadro |
| S7 | 22,20–26,66 | cartão, aba Briefing | 03 Briefing travado |
| S8 | 26,60–30,26 | Meu Painel · Design, cronômetro rodando | 04 Produção medida |
| S9 | 30,20–34,26 | cartão, aba Produção | 05 Entrega + visibilidade |
| S10 | 34,20–38,06 | `/portal` como cliente | 06 Portal |
| S11 | 38,00–42,46 | tríptico Design / Social / Vídeo | 07 Setores |
| S12 | 42,40–46,56 | `/agenda` | 08 Agenda |
| S13 | 46,50–51,56 | `/painel-gestao` | 09 Gestão — "Ver sem perguntar." |
| S14 | 51,50–57,06 | `/performance` (trimestre fechado) | 10 Performance |
| S15 | 57,00–61,26 | `/performance/okrs` | 11 Metas e OKRs |
| S16 | 61,20–64,56 | painel de gestão, claro sobre escuro | 12 Identidade |
| S17 | 64,50–70,00 | quadro de marca + brilho | "Do contrato à publicação, em um só lugar.", o ciclo em 6 etapas e "Agora, ao vivo." |

Os clipes se sobrepõem por 0,06 s de propósito: a legenda do clipe que sai termina de apagar enquanto o
shot seguinte já está em quadro, o que evita o flash de fundo entre cortes.

## Gramática visual (a mesma em todas as 13 cenas de produto)

- `.view` ocupa o quadro inteiro com a captura em `object-fit: cover`, `data-layout-allow-overflow`.
- `punch(view, at, dur, s0, s1, hold)` — `tl.set()` do scale inicial e depois um único `tl.to()` com
  keyframes: micro-respiro (+2,5%), empurrão até o alvo em `power2.inOut`, deriva linear no fim. Nunca
  dois tweens na mesma propriedade, nunca `transform` em CSS junto de GSAP.
- `transform-origin` por cena, apontado para o elemento que a legenda cita (KPI, chip do cronômetro,
  toggle de visibilidade, régua de métricas).
- `.edge` (vinheta) + `.scrim` (gradiente de 700 px subindo até 0,99 de opacidade no rodapé) para o
  texto pousar sem borda dura.
- `cap(id, at, dur)` — caixa de legenda no canto inferior esquerdo: barra teal cresce em `scaleY`,
  kicker, título e sub sobem 14/30/20 px em stagger, e tudo sai em 0,32 s antes do corte.
- `.capbox::before` — almofada radial escura atrás da legenda. É o que garante que o texto do filme
  nunca dispute leitura com o texto do print (sem ela, "Membros vinculados", "Ana Carolina" e nomes de
  cartão apareciam atravessando a linha de apoio). Como é pseudo-elemento, acompanha o fade da legenda
  e não entra na checagem de sobreposição do lint.
- Barra de progresso teal de 2 px no topo, 0 → 1920 px linear nos 70 s.

## Áudio

**Trilha:** `assets/music/threshold-by-jason-shaw.mp3` ("Threshold", Jason Shaw, Audionautix,
CC BY 4.0), `data-timeline-role="music"`, track-index 20.

A faixa foi escolhida pela forma, não pelo gênero. Medida em blocos de 0,25 s, ela faz sozinha o
que a automação da versão anterior tinha de forçar:

- 0–7 s: quase silêncio e depois um pulso baixo — o "antes".
- 7,3 s: a entrada começa, 0,15 s antes do corte da virada.
- 10,7–11,3 s: o groove chega de vez, ainda dentro do quadro "Samps OS".
- 37,5–38,0 s: a música sai de um vale e volta no mesmo instante em que entram os setores.
- 59 s: o pico da faixa cai na cena de OKR.
- 64–70 s: ela mesma alivia, junto com o fecho.

A automação só acompanha esses pontos e fecha o fade:

```
0 s → 0,00   1,1 s → 0,46   7,1 s → 0,46   8,2 s → 0,54
37,4 s → 0,52   38,3 s → 0,58   58,6 s → 0,60   64,4 s → 0,54
67,4 s → 0,38   70 s → 0,00
```

**SFX:** 13 cues, cada um em sua própria track-index (21–33), volume 0,30–0,52. Impactos nas viradas
(7,22 / 7,42 / 46,46 / 64,46), cliques leves quando a câmera fecha em um controle (23,38 / 27,75),
`drop` nas entradas de ato (13,38 / 34,18 / 37,98). Nada toca em cima de texto denso.

**O corte não foi reescrito.** As 17 cenas ficaram onde estavam; quem mudou foi a faixa, escolhida
porque os eventos dela já caem nesses tempos. `npx hyperframes beats` leu 253 batidas a 245,9 bpm
(incerto — é a subdivisão do groove de 99 bpm, então "perto de um beat" deixa de ser critério).
O critério que vale é o de energia, medido acima.

## Capturas

20 PNGs em `assets/shots/`, todas tiradas da aplicação rodando local (Next.js + Postgres com o seed e a
`prisma/simulate-quarter.ts`), viewport 1600×1000 com `deviceScaleFactor: 2` (3200×2000), tema escuro
exceto `painel-claro.png`. Clientes fictícios, links `example.com`, nenhum dado de cliente real.
Dezesseis entram no corte final; as outras quatro (`captacoes`, `cartao-visibilidade`, `demandas`,
`metas`) ficam como material da mesma sessão de fotos, caso o filme precise de outra versão.

A resolução de 3200 px existe por causa do zoom: a cena do quadro (S6) fecha em 2,06× e a do briefing
(S7) em 1,54×, então o print precisa de pixel de sobra para não amolecer.

## Enquadramento das cenas que precisaram de correção

- **S4 e S17** eram o print do login coberto por um scrim de 96%. Ficava um retângulo preto com letra
  grande em cima e o "Bem-vindo à Samps" do próprio print competindo com o título. Viraram quadro de
  marca limpo: em S4 o print entra emoldurado à direita, com brilho próprio e nitidez total; em S17 não
  há print nenhum, só a marca, o ciclo em seis etapas e a deixa para a demo.
- **S6 (quadro)** panorâmica em 1,2× mostrava a barra lateral e duas colunas vazias
  ("Nenhum cartão nesta coluna"). Agora fecha em 2,0× sobre as colunas "Feeds e Reels" e "Stories", com
  os cabeçalhos e a contagem visíveis, e desce pela lista em vez de varrer na horizontal.
- **S7 (briefing)** o selo "Briefing bloqueado em 02/10/2026 14:18" — que é exatamente o que a legenda
  cita — caía atrás da legenda. A câmera sobe 240 px para o selo ficar acima dela.
- **Ato 0** as três ondas de cartões preenchiam linha por linha e deixavam a metade de baixo do quadro
  vazia nos primeiros 2,6 s. O índice da célula passou a ser `(i * 23) % 63`: 23 é coprimo de 63, então
  cada onda cai espalhada pelo quadro inteiro e a sensação é de multiplicação, não de preenchimento.

## O que foi deliberadamente cortado

- Wordmark em texto sobre o shot de login: contraste 2,65:1 e colidia com o logo que já aparece na
  própria tela capturada.
- Brandmark em `mix-blend-mode: screen` no fecho: duplicava a marca do print.
- Waveform, equalizador e halo pulsante: enfeite, e o halo gerava banding em 8 bits.

## Saída

`npx hyperframes render --quality delivery` → 1920×1080, 30 fps, 2100 frames, 70,0 s, H.264 + AAC
48 kHz estéreo.

Dois acabamentos em cima do render:

1. **Capa no frame 0.** `brag.jpg` (t = 11,0 s) é colado como primeiro quadro com um `overlay` do
   ffmpeg (`enable='lt(n,1)'`), para que o vídeo parado já diga o que é o produto em vez de mostrar o
   caos quase preto do segundo zero.
2. **Normalização de loudness.** O render sai em −23,4 LUFS com pico em −5,8 dB: alto o bastante para o
   mixer, baixo para uma sala. Um passe de `loudnorm` em duas etapas leva para **−15,9 LUFS com pico
   real em −0,7 dB**, que é a faixa de web/projeção. A faixa dinâmica medida (LRA 7,0) é menor que o
   alvo, então nada foi comprimido — o intro silencioso continua silencioso. O vídeo é copiado sem
   reencode nesse passe.
