# Plano de Tarefas - Fila de Trabalho e Gestão de Tarefas Automáticas

## Contexto
- Objetivo: Transformar a análise de publicações e prazos em uma linha de produção automática, centralizando a execução de providências com responsáveis, checklists e controle de status.
- PRD: `tasks/prd-fila-de-trabalho/prd.md`
- Tech Spec: `tasks/prd-fila-de-trabalho/techspec.md`

## Premissas e Escopo
- Inclusões: Nova interface de fila, criação automática de tarefas, checklist dinâmico por tarefa, gestão de status e upload obrigatório de comprovante.
- Exclusões: Kanban complexo, notificações push/e-mail, IA para redação e distribuição automática de carga.
- Riscos conhecidos: Integridade de dados no isolamento por tenant e performance na listagem de tarefas com muitos filtros.

## Fases sugeridas
- Fase 1: Infraestrutura e Banco de Dados (Tabelas e Status)
- Fase 2: Backend e Lógica de Negócio (Gatilhos, APIs e Validações)
- Fase 3: Frontend e Interface (Dashboard, Workspace e Integração com Análise)

## Dependências globais
- Acesso ao Supabase para criação de tabelas.
- `uploadService` funcional para integração de documentos.
- Sistema de autenticação e tenant_id configurados.

## Lista de tarefas
| ID | Título | Depende de | Paralelizável | Entregáveis principais |
| --- | --- | --- | --- | --- |
| 1.0 | Modelagem e Criação do Banco de Dados | - | Não | Scripts SQL de criação das tabelas e índices. |
| 2.0 | Configuração de Status e Dados Iniciais | 1.0 | Sim | Tabela `aux_status` populada com domínios de tarefa. |
| 3.0 | Gatilho de Criação Automática de Tarefa | 1.0, 2.0 | Não | Service de providência criando tarefas e clonando checklists. |
| 4.0 | API de Gestão e Listagem de Tarefas | 1.0, 2.0 | Sim | Endpoints CRUD de tarefas com filtros de tenant/responsável. |
| 5.0 | API de Checklist e Ciclo de Vida | 3.0, 4.0 | Sim | Endpoints de manipulação de checklist e transição de status. |
| 6.0 | Integração de Protocolo e Upload | 5.0 | Sim | Validação de upload obrigatório para status "Protocolado". |
| 7.0 | UI: Dashboard da Fila de Trabalho | 4.0 | Sim | Interface de listagem em 3 blocos (Crítico/Atenção/Tranquilo). |
| 8.0 | UI: Workspace de Execução de Tarefa | 5.0, 6.0 | Sim | Tela de split screen com checklist e área de documentos. |
| 9.0 | UI: Integração na Tela de Análise | 3.0 | Sim | Campo de seleção de responsável na confirmação de providência. |

## Notas
- Critérios de numeração: X.0 tarefas principais, X.Y subtarefas.
- Sempre incluir testes como subtarefas nas tarefas relevantes.
- O campo `revisor_id` deve ser criado, mas a lógica de revisão será simplificada para o MVP.
