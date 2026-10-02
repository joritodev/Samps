---
target: painel-gestao
total_score: 22
max_score: 36
na_heuristics: 5
p0_count: 0
p1_count: 3
target_identity: "file:/home/user/Samps/app/(agency)/painel-gestao/page.tsx"
target_fingerprint: "sha256:d44b282b5fe54fb2ceeaf9ab6a3fe22d353e3d69615666babe113e05c26d3973"
target_path: /home/user/Samps/app/(agency)/painel-gestao/page.tsx
timestamp: 2026-09-29T20-18-58Z
slug: app-agency-painel-gestao-page-tsx
closed: true
---
⚠️ DEGRADED: single-context (subagentes só são criados nesta sessão sob pedido explícito do usuário)

Alvo: app/(agency)/painel-gestao/page.tsx (Painel da Gestão), modo Operate.

## Design Health Score
| # | Heurística | Nota | Problema-chave |
|---|---|---|---|
| 1 | Visibilidade do estado | 2 | Nenhum loading.tsx na agência: ao navegar, nada indica carregamento |
| 2 | Linguagem do usuário | 3 | "Dashboard" na nav vs "Painel da Gestão" no título; "Sem resp."; "Hoje" ambíguo; formato cru ("stories") ao lado do tipo ("Story") |
| 3 | Controle e liberdade | 3 | Tela de leitura; saídas claras |
| 4 | Consistência | 3 | Card de demanda clicável nos quadros, inerte no painel |
| 5 | Prevenção de erro | n/a | Tela só de leitura |
| 6 | Reconhecimento | 3 | Tudo visível; atalho de busca ⌘K escondido na sidebar |
| 7 | Flexibilidade e eficiência | 1 | Nenhum drill-down: KPIs e alertas não levam a nada; sem filtros; sem atalhos |
| 8 | Estética e minimalismo | 3 | Limpo, mas Alertas repete 4 números que a faixa de KPIs já mostra |
| 9 | Recuperação de erro | 3 | app/error.tsx com "Tentar de novo" |
| 10 | Ajuda | 1 | Nenhuma ajuda contextual (ex.: o que conta como "Atrasos/mês") |
| **Total** | | **22/36** | **Aceitável (61%)** |

## Design Specificity Verdict
LLM: a faixa de KPIs + grade de cards é o esqueleto padrão da categoria; a marca aparece em detalhes (avatar em gradiente, cor do cliente no card). Serve ao modo Operate, mas nada na composição diz "agência com ciclo de demanda": o painel mostra contagens, não o fluxo (briefing → produção → revisão → publicação) que é o diferencial do produto.
Detector (CLI): 0 achados nos arquivos. Navegador (overlay injetado, desktop e mobile): 19 achados — 7 low-contrast (iniciais brancas sobre gradiente ember, 2,2–2,6:1; âmbar #bd6705 a 4,1:1), 1 ai-color-palette (gradiente nos avatares; parcialmente falso positivo por ser o gradiente da marca, mas aqui é decorativo), 9 nested-cards (cards de demanda dentro do card "Prioridades gerais"), 1 undersized-ui-text ("DIGITAL" do logo a 10px), 1 skipped-heading (h1 → h3), 1 layout-transition (height; não está no código do projeto, provável biblioteca: falso positivo provável).
Concordância: o detector confirmou o card-dentro-de-card e o problema de hierarquia de títulos que a revisão notou; pegou o contraste dos avatares, que a revisão não tinha visto.

## Priority Issues
1. [P1] Cards de prioridade inertes. O card não abre a demanda; a gestão vê o problema e precisa ir a outra tela procurar. Fix: DemandCard com onClick abrindo o sheet de detalhe (como nos quadros) ou link para a demanda. Comando: polish.
2. [P1] KPIs e alertas sem destino. "3 atrasadas" não leva à lista das 3. Quebra o princípio "ver sem perguntar". Fix: cada KPI/alerta vira link para /demandas filtrado (?status=, ?atrasadas=1, ?semResponsavel=1); exige filtro por searchParams no quadro geral. Comando: harden.
3. [P1] Sem estado de carregamento. Nenhum loading.tsx em app/(agency); com banco remoto a navegação parece travada. Fix: loading.tsx com skeleton no layout da agência e nas rotas pesadas (painel, demandas, performance). Comando: harden.
4. [P2] Contraste e aninhamento (detector). Iniciais brancas sobre gradiente ember (2,2:1); âmbar de atenção 4,1:1; cards dentro de card; h1→h3. Fix: avatar sólido neutro com texto escuro; warning 32 95% 34%; lista de prioridades sem moldura interna (linhas divididas) ou sem card externo; CardTitle como h2. Comando: polish.
5. [P2] Redundância e sobrecarga. 9 KPIs + 8 atalhos (que repetem a sidebar) + alertas repetindo 4 KPIs. Fix: alertas ficam só como exceções acionáveis (atrasadas, sem responsável) ou somem; atalhos reduzidos aos 4 setores; "Sem resp." → "Sem responsável" com quebra; nav "Dashboard" → "Painel". Comando: distill.

## Persona Red Flags
Alex (power user, gestão): não consegue ir de "3 atrasadas" para as 3 demandas; nenhum atalho de teclado visível; card de prioridade não abre.
Sam (teclado/leitor de tela): cards de prioridade não são focáveis nem acionáveis; hierarquia h1→h3 pula níveis; iniciais do avatar abaixo de 4,5:1 (aria-hidden, impacto menor).
Líder de setor (persona do projeto: 10–20 pessoas, gestão e produção com o mesmo peso): "Carga por setor" mostra volume, mas não quem está sobrecarregado; precisa sair do painel para saber quem pegar.

## Minor Observations
- "DIGITAL" do logo a 10px (abaixo do piso de 12px da própria spec).
- Cores das barras de setor vêm da ordem da lista, não da identidade do setor (Design em tinta quase preta pesa mais que os outros).
- "Hoje" deveria dizer "Concluídas hoje".

## Questions to Consider
- E se o painel mostrasse o fluxo (quantas em briefing, produção, revisão, publicação) em vez de 9 contagens soltas?
- Os Alertas precisam existir se cada KPI já for clicável?
- O painel deveria responder "quem está sobrecarregado hoje?" antes de "quantas demandas existem"?
