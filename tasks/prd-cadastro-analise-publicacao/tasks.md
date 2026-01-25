# Plano de Tarefas - Desacoplamento de Cadastro e Análise de Prazos

## Contexto
- Objetivo: Separar o ato de cadastrar a publicação da criação do prazo processual, permitindo uma análise técnica assistida por IA antes da definição do prazo final.
- PRD: `tasks/prd-cadastro-analise-publicacao/prd.md`
- Tech Spec: `tasks/prd-cadastro-analise-publicacao/techspec.md`

## Premissas e Escopo
- Inclusões: Criação de tabela de vínculo, novos status de decisão, alteração nos fluxos de backend (cadastro e confirmação) e ajustes na UI (habilitação de botões).
- Exclusões: Alterações no algoritmo de similaridade ou no fluxo de importação de dados.
- Riscos conhecidos: Quebra de integridade caso a transação de vínculo falhe; necessidade de garantir retrocompatibilidade com itens pendentes.

## Fases sugeridas
- Fase 1: Infraestrutura e Banco de Dados (Tasks 1.0 - 2.0)
- Fase 2: Lógica de Negócio e API (Tasks 3.0 - 4.0)
- Fase 3: Interface do Usuário e Integração (Tasks 5.0 - 6.0)
- Fase 4: Validação (Task 7.0)

## Dependências globais
- Migração de banco de dados deve ocorrer antes de qualquer alteração na lógica de backend.

## Lista de tarefas
| ID | Título | Depende de | Paralelizável | Entregáveis principais |
| --- | --- | --- | --- | --- |
| 1.0 | Mapeamento de Código e Preparação | - | Sim | Documento de mapeamento de arquivos e funções |
| 2.0 | Migração do Banco de Dados | - | Não | Script SQL executado (tabelas e colunas novas) |
| 3.0 | Ajuste no Fluxo de Cadastro (Backend) | 2.0 | Não | Service/Controller atualizado (cadastro sem prazo) |
| 4.0 | Evolução do Endpoint de Confirmação | 2.0, 3.0 | Sim | Endpoint `/api/analise/confirmar` atualizado |
| 5.0 | Lógica de Controle de Ações nos Cards (UI) | 3.0 | Sim | Frontend com botões habilitados/desabilitados por status |
| 6.0 | Integração do Modal de Análise | 4.0, 5.0 | Não | Fluxo completo do modal salvando o prazo final |
| 7.0 | Testes de Fluxo Ponta a Ponta | Todas | Não | Relatório de testes e validação de integridade |

## Notas
- Critérios de numeração: X.0 tarefas principais, X.Y subtarefas.
- Sempre incluir testes como subtarefas nas tarefas relevantes.
