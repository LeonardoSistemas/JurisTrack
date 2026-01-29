# 3.0 - Gatilho de Criação Automática de Tarefa

## Objetivo
- Automatizar a criação de uma tarefa na fila sempre que uma providência for confirmada na análise de publicações.

## Escopo / Entregáveis
- Alteração no service de Evento/Providência.
- Lógica de clonagem de checklist padrão para a instância da tarefa.

## Passos e subtarefas
- 3.1 Identificar o ponto de confirmação de providência no backend.
- 3.2 Implementar lógica para buscar o checklist padrão vinculado à providência selecionada.
- 3.3 Criar registro em `tarefa_fila_trabalho` com status inicial "Aguardando".
- 3.4 Inserir itens clonados na tabela `tarefa_checklist_item`.
- 3.5 Garantir que toda a operação ocorra dentro de uma transação.

## Dependências
- 1.0 - Modelagem e Criação do Banco de Dados.
- 2.0 - Configuração de Status e Dados Iniciais.

## Paralelizável?
- Não, depende da estrutura de dados pronta.

## Critérios de aceite
- Ao salvar uma providência, uma tarefa correspondente deve aparecer no banco de dados.
- O checklist da tarefa deve conter os mesmos itens do checklist padrão da providência.

## Testes
- Teste unitário para a função de criação de tarefa.
- Teste de integração: simular confirmação de providência e verificar persistência no banco.

## Notas
- Certificar-se de passar o `tenant_id` corretamente para todos os novos registros.
