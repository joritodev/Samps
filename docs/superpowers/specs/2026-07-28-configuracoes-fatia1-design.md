# Configurações — Fatia 1 (Empresa + catálogo operacional)

**Data:** 2026-07-28  
**Status:** Aprovada em chat  
**Escopo:** A — Empresa, Setores, Tipos, Prioridades, Status; Usuários → `/equipe`

## Problema

O hub `/configuracoes` tem Temas e Funções reais; as demais seções são stub. Gestão não consegue editar dados da agência nem o catálogo operacional (setores, tipos, prioridades, status).

## Decisão

Abordagem 1: shell compartilhado de catálogo + formulário Empresa; Usuários redireciona para `/equipe`.

## Escopo

| Seção | Entrega |
|-------|---------|
| Empresa | Form em `AgencySettings` |
| Setores | CRUD leve + `isActive` + líder + distribuição |
| Tipos | CRUD leve + `isActive` + sortOrder |
| Prioridades | CRUD leve + cor/weight + `isActive` |
| Status | CRUD leve + cor/`isFinal` + `isActive` |
| Usuários | Link/redirect para `/equipe` |

**Fora:** Contratos, Notificações, Portal (stubs).

## Arquitetura

```
pages (server) → settings.service (read/write)
              → settings.actions (requirePermission settings.access)
              → components/agency/*-settings.tsx
```

- Soft deactivate (`isActive=false`); não hard-delete se houver vínculos.
- Audit `OTHER` ou ações existentes ao salvar.
- UI alinhada a `RolesSettings` / `ThemesSettings` (header + back link).

## Aceite

1. Gestão edita Empresa e persiste.
2. CRUD/ativar Setores, Tipos, Prioridades, Status.
3. Usuários aponta para `/equipe`.
4. Sem `settings.access` → sem acesso às seções protegidas.
5. `npx tsc --noEmit` limpo.
