<!-- Template para lista de tarefas de uma funcionalidade -->
# Plano de Tarefas - Similaridade de Publicações em Lote

## Contexto
- Objetivo: Reduzir duplicidades e retrabalho na validação de publicações retornando status e detalhes para o front em lote.
- PRD: tasks/prd-similaridade-publicacoes/prd.md
- Tech Spec: tasks/prd-similaridade-publicacoes/techspec.md

## Premissas e Escopo
- Inclusões: endpoint em lote, processamento em batches controlados, resposta com dados do modal, UI com cards por status.
- Exclusões: cache/mensageria externos e exposição pública (apenas usuários internos).
- Riscos conhecidos: volume extremo de publicações, computação semântica pesada, falha parcial do batch.

## Fases sugeridas
- Fase 1: Construir e validar o endpoint em lote com batches e limite de concorrência.
- Fase 2: Ajustar o front interno para consumir o endpoint e renderizar cards/modais.
- Fase 3: Complementar observabilidade e testes (unitários, integração, contract/performance).

## Dependências globais
- Front interno acionado após fluxo do N8N; coordenar testes com esse fluxo.

## Lista de tarefas
| ID | Título | Depende de | Paralelizável | Entregáveis principais |
| --- | --- | --- | --- | --- |
| 1.0 | Implementar endpoint de similaridade em lote | - | Não | Rota/controller/service novos; processamento em batches com limite de concorrência; schema de resposta com campos para modal. |
| 2.0 | Ajustar front interno para cards e modais de status | 1.0 | Sim | Front enviando `{ numero_processo, tenant_id, data_publicacao, texto }`, agrupamento por status e modais listando detalhes. |
| 3.0 | Observabilidade, limites de carga e testes | 1.0 | Sim (com 2.0 após estabilidade) | Logs/métricas por batch, limites `batchSize`/`maxConcurrency`, testes unitários/integração/contract/performance. |

## Notas
- Critérios de numeração: X.0 tarefas principais, X.Y subtarefas.
- Sempre incluir testes como subtarefas nas tarefas relevantes.

