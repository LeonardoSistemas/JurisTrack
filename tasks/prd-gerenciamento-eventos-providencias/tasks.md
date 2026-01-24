# Plano de Tarefas - Gerenciamento de Eventos e Providências Jurídicas

## Contexto
- Objetivo: Implementar interfaces administrativas e lógica de persistência para gerenciamento de eventos processuais, providências, checklists e modelos de petição.
- PRD: `tasks/prd-gerenciamento-eventos-providencias/prd.md`
- Tech Spec: `tasks/prd-gerenciamento-eventos-providencias/techspec.md`

## Premissas e Escopo
- Inclusões: CRUD de eventos, mapeamento de andamentos, CRUD de providências, configuração de regras Evento->Providência, checklists e vínculo de modelos.
- Exclusões: Automação de workflows de execução, edição dinâmica de variáveis nos modelos, drag & drop para reordenação.
- Riscos conhecidos: Garantir isolamento por tenant em todas as operações; complexidade na reordenação manual de checklists.

## Fases sugeridas
- Fase 1: Infraestrutura e Banco de Dados (Tarefas 1.0 e 2.0)
- Fase 2: Gestão de Eventos e Mapeamentos (Tarefas 3.0 e 4.0)
- Fase 3: Gestão de Providências, Checklists e Modelos (Tarefas 5.0, 6.0 e 7.0)
- Fase 4: Integração Final (Tarefa 8.0)

## Dependências globais
- Acesso ao banco de dados PostgreSQL/Supabase.
- Ambiente Node.js configurado com middlewares de autenticação e tenant.

## Lista de tarefas
| ID | Título | Depende de | Paralelizável | Entregáveis principais |
| --- | --- | --- | --- | --- |
| 1.0 | Migrações de Banco de Dados | - | Sim | Tabelas `providencia_checklist` e `providencia_modelo` |
| 2.0 | Estrutura de Backend (Boilerplate) | - | Sim | Novos arquivos de rotas, controllers e services |
| 3.0 | API e Interface de Eventos | 2.0 | Sim | CRUD de Eventos e tela `eventos.html` |
| 4.0 | Mapeamento de Andamentos | 3.0 | Sim | Gestão de `andamento_evento` |
| 5.0 | API e Interface de Providências | 2.0 | Sim | CRUD de Providências e tela `providencias.html` |
| 6.0 | Configuração de Regras (Evento -> Providência) | 3.0, 5.0 | Não | Interface de vínculo com prazos e prioridades |
| 7.0 | Checklists e Vínculo de Modelos | 1.0, 5.0 | Não | Lógica de itens de checklist e associação de modelos |
| 8.0 | Atualização da Navegação (Sidebar) | 3.0, 5.0 | Sim | Menu "Configurações Jurídicas" no `sidebar.js` |

## Notas
- Critérios de numeração: X.0 tarefas principais, X.Y subtarefas.
- Sempre incluir testes como subtarefas nas tarefas relevantes.
