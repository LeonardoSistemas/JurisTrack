# 5.0 - API de Checklist e Ciclo de Vida

## Objetivo
- Permitir a interação com os itens do checklist e a progressão da tarefa através dos seus estados.

## Escopo / Entregáveis
- Endpoints de CRUD para `tarefa_checklist_item`.
- Endpoint de atualização de status com validações de regra de negócio.

## Passos e subtarefas
- 5.1 Criar endpoints para marcar/desmarcar itens do checklist da tarefa.
- 5.2 Implementar adição e remoção manual de itens no checklist de uma tarefa específica.
- 5.3 Criar lógica de transição de status (ex: Iniciar -> Em Elaboração).
- 5.4 Validar transições proibidas (ex: não voltar de Protocolado para Aguardando).

## Dependências
- 3.0 - Gatilho de Criação Automática de Tarefa.
- 4.0 - API de Gestão e Listagem de Tarefas.

## Paralelizável?
- Sim, com a tarefa 6.0.

## Critérios de aceite
- Itens do checklist podem ser alterados sem afetar o modelo global.
- Status da tarefa atualiza corretamente no banco com registro de `updated_at`.

## Testes
- Validar se a remoção de um item do checklist da tarefa X não remove da tarefa Y.
- Testar transições de status válidas e inválidas.

## Notas
- Alterações no checklist são exclusivas da instância da tarefa, conforme definido pelo usuário.
