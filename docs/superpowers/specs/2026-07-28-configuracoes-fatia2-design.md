# Configurações — Fatia 2 (Contratos, Notificações, Portal)

**Data:** 2026-07-28  
**Status:** Aprovada em chat (Contratos = lista leitura)  
**Depende:** Fatia 1 (PR #9)

## Escopo

| Seção | Entrega |
|-------|---------|
| Contratos | Lista de contratos ativos (cliente, plano, status, datas) + link para `/clientes/[id]` |
| Notificações | Preferências pessoais in-app (quais tipos receber) persistidas em JSON no `User` ou preferência local via tabela leve; + link para inbox |
| Portal | Form global: `portalName`, `portalLogoUrl`, `portalColor` em `AgencySettings` |

## Decisões

### Contratos (A)
Somente leitura. Sem CRUD de template. Edição de contrato continua no cliente/wizard.

### Portal
Reutiliza campos existentes em `AgencySettings`. Defaults para novos portais / identidade global do portal.

### Notificações
Sem modelo de preferência hoje. **Decisão:** adicionar `User.notificationPrefs Json?` com flags por tipo (`DEADLINE`, `ASSIGNMENT`, `ADJUSTMENT`, `PUBLICATION`, `OTHER`) default `true`. UI toggles + link “Ver notificações”.  
`createNotification` respeita prefs do destinatário (skip se desligado).

## Fora

- Templates de plano
- E-mail/Push reais (só in-app)
- Aprovação/chat do portal do cliente

## Aceite

1. `/configuracoes/contratos` lista contratos ativos com link ao cliente
2. `/configuracoes/portal` salva nome/logo/cor
3. `/configuracoes/notificacoes` salva toggles; tipos desligados não geram notificação
4. `npx tsc --noEmit` limpo
