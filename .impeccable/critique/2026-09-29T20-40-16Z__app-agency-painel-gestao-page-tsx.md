---
target: painel-gestao
total_score: 18
max_score: 36
na_heuristics: 5
p0_count: 2
p1_count: 2
target_identity: "file:/home/user/Samps/app/(agency)/painel-gestao/page.tsx"
target_fingerprint: "sha256:04a094ff70d8a903b40669de8719efb564bfea0aa2054218938735d833022d23"
target_path: /home/user/Samps/app/(agency)/painel-gestao/page.tsx
timestamp: 2026-09-29T20-40-16Z
slug: app-agency-painel-gestao-page-tsx
---
Method: dual-agent (A: design review subagent · B: detector/browser subagent)

Alvo: app/(agency)/painel-gestao/page.tsx, modo Operate. Segunda crítica (após o painel acionável, commit b3b1d0f).

## Design Health Score
| # | Heurística | Nota | Problema-chave |
|---|---|---|---|
| 1 | Visibilidade do estado | 3 | Contagens coerentes (21 = soma do fluxo); sem "atualizado às", "Concluídas hoje 0" sem contexto |
| 2 | Linguagem do usuário | 2 | Fluxo põe Ajustes antes de Revisão (ajuste é retorno); card mostra origem "Social" com setor real Design |
| 3 | Controle e liberdade | 2 | ?abrir= fica na URL após fechar; id inexistente falha em silêncio |
| 4 | Consistência | 2 | "Sem responsável" conta PUBLISHED, "Em aberto" não; "Atrasos no mês" vai a /performance; chips "Reel"/"reel" |
| 5 | Prevenção de erro | n/a | Tela só de leitura |
| 6 | Reconhecimento | 2 | "7 3" na carga por pessoa depende da legenda no canto; prazo absoluto "30 set" |
| 7 | Flexibilidade e eficiência | 2 | KPIs e fluxo clicáveis; pessoas e setores sem destino; sem atribuir; "Filtros" em breve |
| 8 | Estética e minimalismo | 3 | Coerente com a Mesa de Operação; ruído nos cards (6 "Alta" iguais, tipo+formato duplicados) |
| 9 | Recuperação de erro | 1 | Sem error.tsx em (agency): falha derruba o shell; ?abrir inválido sem retorno |
| 10 | Ajuda | 1 | Nada explica "Atrasos no mês" vs "Atrasadas" nem o critério de Prioridades |
| **Total** | | **18/36** | **Aceitável (50%)** |

## Design Specificity Verdict
A: meio fundamentado. A faixa do fluxo é o elemento mais próprio do produto e os números fecham; o resto (KPIs, barras, grade de cards) é painel genérico. Dois desvios traem o método: Ajustes como etapa linear e Prioridades ordenadas por peso, trazendo uma demanda Agendada em 1º e deixando as 3 atrasadas de fora.
B: CLI exit 0, 1 consultivo (text-[13px] no nome do usuário, agency-sidebar.tsx:308). Navegador: painel 5 achados (nested-cards x4, layout-transition x1), /demandas 6. nested-cards no desktop = real mas fraco (cards dentro do painel inset do shell); no mobile e nas colunas do Kanban = falso positivo; layout-transition = sonner (terceiros); em-dash = títulos do seed. De 19 achados na 1ª crítica para 5, sem contraste nem hierarquia.

## Priority Issues
1. [P0] Carga por pessoa esconde quem está livre (só aparece quem tem demanda aberta), sem setor, sem link, sem cronômetro ativo. Fix: todos os membros ativos da produção por setor, atrasadas com rótulo, link para a fila da pessoa, quem está com timer agora. Comando: layout + clarify.
2. [P0] Prioridades gerais mostra trabalho pronto (Agendada) e esconde atrasadas. Fix: "Precisa de você": atrasada > sem responsável > vence em 48h > prioridade; excluir APPROVED/SCHEDULED; motivo no card. Comando: clarify + distill.
3. [P1] Destino do drill-down é beco sem saída: ?abrir abre formulário de briefing travado; URL não limpa; id inválido sem aviso. Fix: sheet com visão operacional (responsável, etapa, prazo relativo, timer), router.replace ao fechar, toast se não achar. Comando: harden.
4. [P1] Fluxo ensina o ciclo errado e "aberto" tem dois significados. Fix: Briefing → A fazer → Produção → Revisão → Publicação com Ajustes como retorno; OPEN_EXCLUDED em todas as contagens; setor real no card. Comando: clarify.
5. [P2] Mobile com Prioridades por último e sem error.tsx na agência. Fix: ordem mobile KPIs → Precisa de você → pessoas → setor; app/(agency)/error.tsx com shell. Comando: adapt + harden.

## Persona Red Flags
Alex: pessoa não clicável; "Atrasos no mês" quebra o padrão; filtro exige rolagem horizontal; sem atalho de teclado.
Sam: sidebar sem aria-current; link do card lê o card inteiro; aria-label em span sem role; <main> dentro de <main> no demand-board.
Líder de setor: quem está livre não aparece; sem filtro por setor; timers ativos calculados e descartados; não atribui do painel; barra de 4% em setor com 0.

## Minor Observations
- sectorHref manda slug desconhecido para Design; ordem de setores instável.
- Setores somam 17 e "Em aberto" 21 (sem setor some) sem explicação.
- "0" cinza de atrasadas repetido; omitir quando zero.
- Consultas calculadas e não usadas (doneWeek, doneMonth, activeProjects, shootsMonth).
- text-[13px] no nome do usuário (fora do ramp).

## Questions to Consider
- Se o painel existe para distribuir e cobrar, por que não dá para distribuir nem cobrar dele?
- Um dia sem atrasos merece uma tela diferente?
- Ajustes é etapa ou sintoma (taxa de retorno da Revisão)?
