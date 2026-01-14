# Plano de Tarefas - Conciliação e Cadastro de Similaridade de Publicações

## Contexto
- Objetivo: Transformar a análise de similaridade em uma ferramenta de decisão ativa, permitindo o cadastro automático ou descarte de publicações.
- PRD: `tasks/prd-similaridade-conciliacao/prd.md`
- Tech Spec: `tasks/prd-similaridade-conciliacao/techspec.md`

## Premissas e Escopo
- Inclusões: Persistência normalizada, cálculo de data de vencimento (dias úteis), criação automática de processo (simplificado), integração com tabelas oficiais (Publicação, Andamento, Prazo), auditoria de descartes e navegação contextual.
- Exclusões: Edição de texto da publicação e cadastro de partes do processo no fluxo simplificado.
- Riscos conhecidos: Inconsistência de prazos se feriados não estiverem atualizados; criação de processos duplicados em cliques simultâneos.

## Fases sugeridas
- Fase 1: Fundação (Banco de Dados e Infraestrutura Backend)
- Fase 2: Integração Frontend e UX
- Fase 3: Qualidade e Auditoria

## Dependências globais
- Acesso ao banco de dados para execução de scripts SQL.
- Disponibilidade dos serviços de utilitários de data (`addBusinessDays`).

## Lista de tarefas
| ID | Título | Depende de | Paralelizável | Entregáveis principais |
| --- | --- | --- | --- | --- |
| 1.0 | Evolução do Schema (SQL) | - | Não | Script SQL com colunas de negócio na `similaridade_itens`. |
| 2.0 | Refatoração da Persistência e Cálculo | 1.0 | Sim (com 3.0) | Service atualizado salvando itens individuais com data_vencimento calculada. |
| 3.0 | Endpoints de Conciliação (Backend) | 1.0 | Sim (com 2.0) | Endpoints `/cadastrar` e `/cancelar` com lógica de transação e auditoria. |
| 4.0 | UI de Conciliação (Frontend) | 3.0 | Não | Tela de similaridade carregando itens da nova API e ações de botões. |
| 5.0 | Navegação Contextual | 4.0 | Sim | Redirecionamento automático da aba Histórico para Similaridade. |
| 6.0 | Feedback e UX em Tempo Real | 4.0 | Sim | Remoção visual de cards e estados de loading/sucesso. |
| 7.0 | Testes de Integridade e Auditoria | 3.0, 4.0 | Não | Relatório de testes validando transações e registros de descarte. |

## Notas
- Critérios de numeração: X.0 tarefas principais, X.Y subtarefas.
- Sempre incluir testes como subtarefas nas tarefas relevantes.
