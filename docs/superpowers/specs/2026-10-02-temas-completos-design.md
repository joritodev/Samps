# Temas completos (Rosa, Azul, Lavanda… em claro e escuro)

**Data:** 2026-10-02 · **Status:** proposta para aprovação, sem código.
**Base:** fatia 2 (cor de destaque e densidade por dispositivo, já em `master`) e `2026-10-02-personalizacao-global-design.md`.

## Pedido
Poder escolher temas inteiros (ex.: "rosa claro" e "rosa escuro") com cores que combinam, sem poluição visual e para vários gostos.

## O que é um tema
**Tema = matiz + modo.** O matiz define a paleta; o modo (claro/escuro, já existente via `next-themes`) escolhe a variante. Qualquer tema vale nos dois modos, então "rosa claro" e "rosa escuro" são o mesmo tema Rosa em modos diferentes.

A paleta tinge **só os neutros** (fundo, cards, bordas, texto secundário, menu lateral, campos) e define a **cor de destaque**. Cards seguem quase brancos (claro) ou escuros (escuro); a cor forte aparece só no destaque.

## Regras que impedem poluição
1. **Cores semânticas ficam fixas em todos os temas:** vermelho (atraso/erro), âmbar (atenção), verde (sucesso), azul (info), laranja da marca e as cores de setor/cliente escolhidas pelo usuário.
2. **Tintura limitada:** saturação dos neutros ≤ 30% no claro e ≤ 26% no escuro; nunca saturação alta em área grande.
3. **Matizes vizinhos ao vermelho (≈335°–20°: Rosa, Coral)** usam tintura menor no fundo e **alerta sempre com ícone + texto**, não só cor (a amostra mostrou os cards de atraso se misturando ao fundo no rosa escuro).
4. **Contraste garantido por teste** (ver abaixo), nos dois modos, para todos os temas.
5. **Um tema por vez, sem mistura livre.** A cor de destaque pessoal (fatia 2) continua existindo e, se escolhida, **sobrepõe** a do tema; a cor do quadro (`data-board-accent`) continua vencendo localmente.

## Catálogo inicial (8 temas)
| Tema | Matiz | Observação |
|------|-------|------------|
| Samps (padrão) | teal atual | sem mudança; é o que existe hoje |
| Rosa | 340° | tintura reduzida (regra 3) |
| Coral | 14° | idem; quente, sem conflito com o âmbar de atenção |
| Âmbar/Areia | 38° | luminosidade do destaque reduzida para passar no contraste |
| Verde | 156° | |
| Azul | 214° | |
| Lavanda | 266° | |
| Grafite | neutro (sat. 0–6%) | para quem não quer cor nenhuma |

Matiz livre (controle deslizante) **fora desta fatia**: só depois de o catálogo provar que a geração de paleta é estável.

## Como a paleta é gerada
Uma função pura recebe o matiz e devolve todos os tokens de `:root` e `.dark` (os mesmos nomes de `globals.css`: `--background`, `--card`, `--border`, `--muted-foreground`, `--primary`, `--sidebar*`, `--shell`, `--ring` etc.).

- **Claro (referência):** fundo 30%/97,5%, card 30%/99,5%, secundário 28%/94,5%, borda 22%/89,5%, texto 45%/10%, texto secundário 12%/40%, menu 24%/94,5%.
- **Escuro (referência):** fundo 22%/8,5%, card 20%/11,5%, secundário 18%/15%, borda 16%/19%, texto 30%/97%, menu 26%/6%.
- **Destaque:** claro `64%` de saturação com luminosidade reduzida até o contraste com branco ser ≥ 4,6:1; escuro `78%`, luminosidade subindo até o contraste com o texto escuro ser ≥ 4,6:1.
- Os valores acima vêm do protótipo já renderizado no painel real; o plano os fixa em um script que **gera um arquivo CSS commitado** (`app/themes.css`), para a produção não calcular nada em tempo de execução.

## Persistência (mesma da fatia 2)
- Cookie `samps-theme` por dispositivo, sem banco, sem migração.
- Atributo `data-theme="rosa"` no `<html>` aplicado pelo script inline do `<head>` antes da primeira pintura (estende `PREFERENCES_BOOT_SCRIPT`; valida contra a lista do catálogo).
- Sincronização entre dispositivos fica para fatia própria com migração planejada (`User.preferences`).

## Interface
Em Configurações > Aparência, nova seção **Tema** acima da cor de destaque: grade de cartões com miniatura (claro e escuro lado a lado) e nome; seleção por rádio acessível. O seletor claro/escuro continua separado. Texto de apoio: "A cor de destaque, se escolhida, sobrepõe a do tema".

## Teste de contraste (obrigatório)
Para **cada tema × modo**, com pares lidos de `app/themes.css`:
- `foreground`/`background`, `card-foreground`/`card`, `popover-foreground`/`popover` ≥ 7:1.
- `muted-foreground`/`background` e `/card` ≥ 4,5:1.
- `primary-foreground`/`primary`, `sidebar-primary-foreground`/`sidebar-primary` ≥ 4,5:1.
- `sidebar-foreground`/`sidebar` ≥ 4,5:1.
- `border` contra `background` com razão ≥ 1,15:1 (borda visível sem pesar).
- **Distinção do alerta:** cor de borda destrutiva contra o fundo ≥ 1,6:1 em todos os temas (barra o problema do rosa escuro).

## Riscos e pendências
- **Cores fixas no código:** ~14 usos de `bg-white`/`text-white`/cinzas e ~17 hexadecimais. A maioria são cores de dado do usuário (setores, catálogo) ou logo e **devem ficar**; os demais (ex.: `agency-calendar`, `board-calendar`, `board-header`, `design-board`, `themes-settings`) precisam ser revisados.
- **Gráficos** (`--chart-*`) e barras de setor usam laranja/azul fixos: manter como estão (dado, não moldura).
- **Login e portal externo** herdam o tema do dispositivo; o login da agência e o portal com marca são fatias separadas.
- **Quadro com capa colorida** sobre fundo de tema: validar visualmente com todas as capas.
- **Tamanho do CSS:** 8 temas × 2 modos × ~30 variáveis ≈ 5 KB comprimido; aceitável.

## Fora do escopo
Matiz livre, tema por cliente/quadro, tema por usuário sincronizado entre dispositivos, fundos de página com imagem, qualquer mudança de layout ou tipografia.
