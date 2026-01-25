# 4.0 - API de Gestão e Listagem de Tarefas

## Objetivo
- Fornecer os endpoints necessários para que o frontend exiba a fila de trabalho e os detalhes de cada tarefa.

## Escopo / Entregáveis
- `GET /api/tarefas`: Listagem com filtros.
- `GET /api/tarefas/:id`: Detalhes completos.
- `PATCH /api/tarefas/:id/atribuir`: Alteração de responsável/revisor.

## Passos e subtarefas
- 4.1 Criar Controller e Service para Tarefas.
- 4.2 Implementar listagem com filtros obrigatórios de `tenant_id`.
- 4.3 Adicionar filtros por `responsavel_id` (Minhas Tarefas) e `status`.
- 4.4 Implementar busca por número do processo dentro da lista de tarefas.
- 4.5 Criar endpoint de detalhes que retorne dados do processo e evento vinculados.

## Dependências
- 1.0 - Modelagem e Criação do Banco de Dados.

## Paralelizável?
- Sim, com as tarefas 5.0 e 6.0.

## Critérios de aceite
- Endpoints retornando dados corretos e respeitando o isolamento de tenant.
- Filtros funcionando conforme especificado no PRD.

## Testes
- Testes de contrato da API.
- Validar se a busca por processo é performática (uso de índices).

## Notas
- A listagem deve retornar o cálculo de prioridade (Crítico, Atenção, Tranquilo) baseado na `data_limite`.
