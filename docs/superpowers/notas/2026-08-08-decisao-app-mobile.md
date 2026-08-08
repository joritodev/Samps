# Decisão 5.2 — Aplicativo mobile

**Data:** 2026-08-08  
**Pergunta da reunião (28/07):** dá para exportar o site como app, como o Lovable faz?  
**Fontes de preço de loja:** [Apple Developer Program](https://developer.apple.com/programs/whats-included/) (US$ 99/ano); [Google Play](https://gtstu.com/app-store-google-play-publishing-costs/) (taxa única US$ 25) — consultados em 08/08/2026.

---

## 1. Quatro caminhos

| Caminho | Esforço | O que entrega | O que não entrega |
|---------|---------|---------------|-------------------|
| **Web responsiva** (Fase 2, Task 5) | Já em andamento / PR stack | Uso no celular pelo navegador; menu Sheet; kanban com scroll | Ícone na tela inicial, push, presença em loja |
| **PWA** (manifest + service worker) | Baixo (dias, não semanas) | Instalável, ícone, splash, offline básico de shell; push no Android | Push confiável no iOS; App Store / Play Store |
| **Wrapper nativo (Capacitor)** | Médio | Binário em loja, push nas duas plataformas, mesmo UI web | Experiência nativa de verdade; ainda é a web num container |
| **App nativo / React Native** | Alto | UX nativa, performance, APIs de dispositivo | Exige API estável separada + manutenção de dois clientes |

“Exportar como o Lovable” na prática é **wrapper** (Capacitor/TWA) ou **PWA**, não app nativo. O Lovable não gera um segundo codebase iOS/Android maduro.

---

## 2. O que muda para o usuário

| | Navegador (hoje + Fase 2) | PWA | Capacitor | Nativo |
|--|---------------------------|-----|-----------|--------|
| Abrir o sistema | URL / favorito | Ícone na home | Ícone da loja | Ícone da loja |
| Login | Igual | Igual (cookies/sessão) | Igual + bridge | Fluxo próprio (JWT) |
| Push de notificação | Limitado | Android ok; iOS frágil | iOS + Android | iOS + Android |
| Offline | Quase nenhum | Shell + cache leve | Idem PWA | Pode ser maior |
| Atualização | Deploy Vercel | Deploy Vercel | Deploy + às vezes review da loja | Review frequente |

O time da Samps pediu testar pelo celular em agosto. **Isso já é web responsiva** — não depende de loja.

---

## 3. Custo de conta e manutenção

| Item | Custo |
|------|------:|
| Apple Developer Program | **US$ 99 / ano** |
| Google Play Console | **US$ 25** (uma vez) |
| Manutenção PWA | Quase zero além do web |
| Manutenção Capacitor | +1 pipeline de build, certificados, reviews (~horas/mês) |
| Manutenção RN nativo | Time dedicado ou contrato contínuo; dobra superfície de bug |

Sem API pública estável (Decisão 5.3), o caminho nativo **não fecha**: o Samps OS hoje é Next.js com Server Actions e sessão cookie — modelo hostil a app nativo puro.

---

## 4. Dependência da Decisão 5.3

```
Responsiva → PWA          → não exige NestJS/JWT
Capacitor (loja)          → ainda pode usar a mesma web; push é o motivo real
React Native              → exige API (Nest/JWT ou tRPC/REST) + multi-cliente mental
```

Abrir NestJS “só porque quer app” é custo sem demanda de loja comprovada.

---

## 5. Recomendação

**2026: responsiva (já) → PWA em seguida. Capacitor só se a Samps quiser ícone nas lojas. Nativo não antes de 2027 e só depois de API + uso real estável.**

Ordem sugerida:

1. Fechar merge da Fase 2 mobile e validar no iPhone/Android do time (18/08).
2. Se pedirem “ícone na tela”: PWA (manifest + service worker) — **sem** taxa de loja.
3. Se pedirem App Store / Play: Capacitor + contas Apple/Google (~US$ 124 no primeiro ano).
4. Nativo: fora do escopo até o operacional de setembro estar em uso diário.

**Decisão pedida à gestão:** confirmar que o teste de agosto é **navegador no celular**; autorizar PWA como próximo passo pós-18/08 se o feedback for “quero ícone”.
