# Hyperframes Composition Brief: Samps OS

## Objective
Create a meeting-entry brag video for Samps OS. It plays before the live walkthrough. It is not the step-by-step demo.

## Output
- Composition directory: `brag-output-2026-10-06-022004/composition/`
- Rendered video: `brag-output-2026-10-06-022004/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 48 seconds

The 15–25s cap is extended on purpose: this is the opening of a client meeting and the lines must be readable in a room. Documented in `brag-plan.md`.

## Source Material
- Project root: `/workspace`
- Primary files read: `PRODUCT.md`, `DESIGN.md`, `README.md`, `components/brand/samps-logo.tsx`, `app/(agency)/painel-gestao/page.tsx`, `app/(agency)/performance/layout.tsx`, `components/performance/performance-tabs.tsx`, `components/performance/goals-board.tsx`, `lib/agency/demand-filters.ts`, `prisma/seed-demands.ts`
- Product name: Samps OS
- Tagline / strongest claim: Diagnóstico + Planejamento + Método = Resultado
- Key UI or visual moment to recreate: Painel da Gestão flow strip plus the demand card moving into Produção with the timer
- Copy that must appear verbatim:
  - O contrato gera o cartão
  - O briefing trava depois de concluído
  - O cronômetro mede a produção
  - O Drive registra a entrega
  - O portal mostra o que foi liberado
  - A Mesa de Operação
  - Diagnóstico + Planejamento + Método = Resultado
  - Painel da Gestão
  - Briefing, A fazer, Produção, Revisão, Publicação
  - Em aberto, Atrasadas, Sem responsável, Concluídas hoje
  - Performance
  - Como a operação está indo, comparada ao período anterior
  - Visão geral, OKRs, Metas, Indicadores
  - Metas em andamento
  - A gestão enxerga carga, atrasos e produtividade sem perguntar para ninguém.

## Creative Direction
- Tone preset: polished
- Creative direction: abertura de reunião para a Samps Digital
- Interpretation: slow holds, large type, brand color only where the product uses it
- Angle: the operation lived in spreadsheets and WhatsApp; the system is the desk; then hand the room back for the live flow
- Hook: “A operação ainda morava fora.”
- Outro / punchline: Samps OS + lema + “Agora, o fluxo ao vivo.”
- Avoid:
  - Generic SaaS language
  - Invented ROI, “100%”, or before/after percentages
  - Real customer names, emails, or secrets
  - Abstract filler visuals

## Visual Identity
- Background: #0A0C12 night frame, #F9FAFB desk, #FFFFFF cards
- Text: #0B111E on paper, #F9FAFB on night
- Accent: #0C7E92, #2DB3C8, #E08A5C (logo and swatch only)
- Display font: Plus Jakarta Sans (local woff2)
- Body font: Inter (local woff2)
- Visual references from the project: camera mark from `samps-logo.tsx`; management flow; performance tabs

## Storyboard
Use the storyboard in `brag-output-2026-10-06-022004/brag-plan.md` as the creative contract.

Scene summary:
1. Fora do sistema — 6.8s — “A operação ainda morava fora.” + Planilha, WhatsApp, Perguntar
2. Garantias — 9.3s — the five product guarantees, sequential, then hold
3. A mesa — 8.7s — camera mark, three brand colors, lema
4. O ciclo em uso — 11.0s — Painel da Gestão, card “Reel depoimento paciente” lands in Produção, timer 00:00→00:42
5. A gestão vê — 8.2s — KPI labels, Performance tabs, the “sem perguntar” line
6. Entrega o microfone — 5.05s — logo, lema, “Agora, o fluxo ao vivo.”

## Audio
- Audio role: warm bed
- Audio arc: fade in, hold under the desk scenes, fade out on the handoff
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`
- Music treatment: volume lane 0 → 0.38 by 0.6s, hold, 0.38 → 0 from 46.2s to 48s
- Music cue guidance: bundled preset for 0–25s; bass peaks after that. Lock logo at 15.82s, card landing at 31.67s, outro at 43.10s. Guarantee lines on 7.35, 8.73, 10.38, 12.02, 13.64.
- Audio-reactive treatment: none in the final render. A bass-driven halo scaled into visible rings on the dark field, so the halo stays static. No waveform.
- Audio-coupled moments:
  - hook — soft impact
  - guarantees 1, 3, 5 — drop
  - logo — bong
  - card landing — click
  - outro logo — soft impact
- SFX selection guidance: low HF risk only (`impactSoft_medium_001`, `impactSoft_medium_002`, `drop_001`, `bong_001`, `click_003`)
- SFX analysis guidance: `/tmp/brag-skill/skills/brag/assets/sfx/sfx-analysis.md`
- Exact SFX choice: the five files above, already copied into `composition/assets/sfx/`
- Audio files: music is in `composition/assets/music/`

## Hyperframes Instructions
Standalone GSAP composition. Do not run the generic hyperframes promo interview. Show the management desk, not a diagram of features. Counts on the desk are interface chrome, not company results. Keep text at video scale and inside the frame. `npx hyperframes check` must pass before render.
