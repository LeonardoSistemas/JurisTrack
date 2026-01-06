<!-- Template para lista de tarefas de uma funcionalidade -->
# Plano de Tarefas - Login multi-tenant

## Contexto
- Objetivo: Entregar login multi-tenant com autenticação e CRUD de usuários em Node/Express com Supabase, incluindo front simples de login e mensagens em PT-BR.
- PRD: tasks/prd-login/prd.md
- Tech Spec: tasks/prd-login/techspec.md

## Premissas e Escopo
- Inclusões: Tela de login com validação básica; endpoint `/api/auth/login` com hash bcrypt e checagem de tenant/usuário ativos; endpoints `/api/users` para listar/criar/atualizar/inativar/reativar; logs mínimos; seed inicial com tenant e admin; mensagens PT-BR; dados em Supabase.
- Exclusões: Sessões/refresh token; middleware de proteção de rotas; recuperação/troca de senha; UI para gestão de usuários; rate limiting/captcha; provedores sociais/SSO; auditoria detalhada.
- Riscos conhecidos: Falha de build do `bcrypt` em Windows (fallback `bcryptjs`); rotas de gestão sem auth nesta fase; ausência de rate limiting expõe brute force; necessidade de manter status ativo/inativo consistente.

## Fases sugeridas
- Fase 1: Modelo de dados/Supabase e camadas de serviço para auth e CRUD.
- Fase 2: Frontend de login, seed inicial e ajustes de logging/observabilidade.
- Fase 3: Testes (unitários/contrato) e roteiro manual de validação.

## Dependências globais
- Supabase configurado (`SUPABASE_URL`, `SUPABASE_KEY`) e módulo `src/config/supabase.js`; decisão de e-mail único global; disponibilidade de `bcrypt` (ou `bcryptjs` fallback); tabelas `tenants` e `users` criadas com índices conforme spec.

## Lista de tarefas
| ID | Título | Depende de | Paralelizável | Entregáveis principais |
| --- | --- | --- | --- | --- |
| 1.0 | Planejamento e alinhamento de escopo e riscos | - | Não | Decisões registradas, riscos priorizados, dependências mapeadas |
| 2.0 | Modelo de dados e acesso Supabase (DDL/helpers) | 1.0 | Parcial | DDL tenants/users, índices, helpers de consulta/mutação e normalização de e-mail/status |
| 3.0 | Autenticação `/api/auth/login` | 2.0 | Parcial | Rota/controller/service com validação, bcrypt, checagem de status/tenant, respostas PT-BR e logs |
| 4.0 | CRUD de usuários `/api/users` | 2.0 | Parcial | Rotas/controller/service para listar/criar/atualizar/inativar/reativar com validações e mensagens PT-BR |
| 5.0 | Frontend da página de login | 3.0 | Sim | `login.html`, `login.js`, `login.css` com validação cliente, fetch, estados de carregamento/erro |
| 6.0 | Seed inicial de tenant e admin | 2.0 | Sim | Script `scripts/seed-login.js` idempotente criando tenant default e admin com hash bcrypt |
| 7.0 | Logs e observabilidade mínima | 3.0, 4.0 | Sim | Padrão de logs info/warn/error para auth/CRUD, contagem básica de tentativas, documentação |
| 8.0 | Testes e QA (unitário/contrato/manual) | 3.0, 4.0, 5.0 | Parcial | Casos unitários prioritários, smoke/contrato de endpoints, roteiro manual do front |

## Notas
- Critérios de numeração: X.0 tarefas principais, X.Y subtarefas.
- Sempre incluir testes como subtarefas nas tarefas relevantes.






