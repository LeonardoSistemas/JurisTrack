# TASK-002 - Refatoração do Backend (Service/Controller)

## Objetivo
- Atualizar a lógica de salvamento de petições para incluir os novos vínculos e persistência física.

## Escopo / Entregáveis
- Refatoração de `peticaoController.js` e `peticaoService.js`.
- Implementação da lógica de salvamento físico (HTML) no storage usando `uploadService`.
- Criação automática de registro em `processo_doc` ao salvar uma petição.

## Passos e subtarefas
1. Atualizar `peticaoService.createLogPeticao` para receber `tarefa_id` e `processo_id`.
2. Integrar com `uploadService` para salvar o conteúdo HTML no caminho `storage/[tenant_id]/[numero_processo]/`.
3. Implementar chamada para `processosService.vincularDocumento` (ou similar) para inserir na tabela `processo_doc`.
4. Garantir que o `tenant_id` seja respeitado em todas as operações.

## Dependências
- TASK-001 (Estrutura de Banco).

## Paralelizável?
- Sim, pode ser iniciada em paralelo com a UI (TASK-003).

## Critérios de aceite
- Ao salvar uma petição via API, um arquivo .html é criado no storage.
- Um registro é criado na tabela de histórico e na tabela `processo_doc`.

## Testes
- Teste unitário para o `peticaoService`.
- Teste de integração via Postman/Insomnia no endpoint `POST /peticoes-finalizadas`.
