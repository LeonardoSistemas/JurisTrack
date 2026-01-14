<!-- Template para lista de tarefas de uma funcionalidade -->
# Plano de Tarefas - Adequação Multi-Tenant

## Contexto
- Objetivo: Garantir isolamento lógico por `tenant_id` em todas as camadas (DB, API, serviços, jobs, cache, storage), evitando vazamento de dados entre clientes.
- PRD: tasks/prd-mult_tenant/prd.md
- Tech Spec: tasks/prd-mult_tenant/techspec.md

## Premissas e Escopo
- Inclusões: Migrações faseadas para `tenant_id`, middleware de contexto, helpers de scoping (filtro/injeção), refatoração de serviços/rotas, ajustes em jobs n8n e storage, observabilidade com `tenant_id`, suíte de testes e rollout com feature flag.
- Exclusões: Estratégia multi-tenant por schema/banco separado; mudanças no fluxo de login além do middleware; suporte a super admin/troca de tenant.
- Riscos conhecidos: Filtro de tenant esquecido em query manual; colisão em chaves únicas ao compor com `tenant_id`; jobs/payloads sem `tenant_id`; uploads legados sem prefixo por tenant.

## Fases sugeridas
- Fase 1: Migração de esquema (fase 1) + backfill seguro e idempotente.
- Fase 2: Migração de esquema (fase 2) + ajustes de código (middleware, helpers, serviços, jobs, storage) + testes.
- Fase 3: Rollout controlado com flag e smoke tests finais.

## Dependências globais
- Acesso ao Supabase e credenciais para aplicar migrações.
- Tenant padrão para backfill: `43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597`.
- Tokens JWT já contendo `tenantId`; variáveis de ambiente/feature flag (`ENABLE_TENANT_SCOPE`).

## Lista de tarefas
| ID | Título | Depende de | Paralelizável | Entregáveis principais |
| --- | --- | --- | --- | --- |
| 1.0 | Inventário e planejamento de migração | - | Sim (desbloqueia 5.0/6.0) | Lista de tabelas/uniques, tenant padrão e plano de fases |
| 2.0 | Migração de esquema – fase 1 (tenant_id nullable + índices) | 1.0 | Não | Scripts SQL fase 1 aplicados/validados |
| 3.0 | Backfill de tenant_id (idempotente) | 2.0 | Não | Script de backfill executado com logs/validação |
| 4.0 | Migração de esquema – fase 2 (NOT NULL + uniques compostas) | 3.0 | Não | Scripts fase 2 aplicados com FKs fortes e uniques compostas |
| 5.0 | Middleware de contexto de tenant | 1.0 | Sim (com 6.0, 9.0) | `tenantContextMiddleware` aplicado às rotas `/api` |
| 6.0 | Helpers de scoping de dados (filtro/injeção) | 1.0 | Sim (com 5.0, 9.0) | Helpers `withTenantFilter`/`injectTenant` e base DAO ajustada |
| 7.0 | Refatoração de serviços e rotas tenant-aware | 5.0, 6.0 | Parcial (por domínio) | Serviços/rotas com filtro/injeção de `tenant_id` e validações |
| 8.0 | Jobs e integrações (n8n) com tenant | 5.0, 6.0 | Sim (após 5.0/6.0) | Payloads/consumidores com `tenant_id` e validações |
| 9.0 | Storage/uploads segregados por tenant | 5.0, 6.0 | Sim (com 5.0/6.0) | Prefixos `<tenantId>/` e registro de `tenant_id` em uploads |
| 10.0 | Observabilidade e segurança (logs/metrics/authz) | 5.0, 6.0 | Sim (com 7.0/8.0/9.0) | Logs/metrics/traces com `tenant_id`; checagens de autorização |
| 11.0 | Testes e dados de teste | 5.0–10.0 | Não | Suíte de testes + fixtures/seeds com `tenant_id` |
| 12.0 | Rollout e feature flag | 4.0, 11.0 | Não | Plano de ativação/flag, smoke tests e checklist de deploy |

## Notas
- Critérios de numeração: X.0 tarefas principais, X.Y subtarefas.
- Sempre incluir testes como subtarefas nas tarefas relevantes.








