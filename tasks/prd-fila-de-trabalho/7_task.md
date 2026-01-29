# 7.0 - UI: Dashboard da Fila de Trabalho

## Objetivo
- Criar a interface central onde o advogado visualiza e gerencia suas tarefas pendentes.

## Escopo / Entregáveis
- Tela de Fila de Trabalho com 3 blocos de prioridade.
- Filtros de busca e "Minhas Tarefas".

## Passos e subtarefas
- 7.1 Criar componente de lista de tarefas com indicadores de cor (Vermelho, Amarelo, Verde).
- 7.2 Implementar agrupamento visual por blocos: Crítico, Atenção e Tranquilo.
- 7.3 Adicionar barra de filtros (Status, Responsável, Busca por Processo).
- 7.4 Implementar navegação para a tela de execução ao clicar em uma tarefa.

## Dependências
- 4.0 - API de Gestão e Listagem de Tarefas.

## Paralelizável?
- Sim, com as tarefas 8.0 e 9.0.

## Critérios de aceite
- Interface limpa e responsiva.
- Identificação visual imediata de tarefas urgentes (RNF1).
- Filtros funcionando em tempo real.

## Testes
- Validar se a cor do indicador muda corretamente conforme a data de vencimento.
- Testar busca por número de processo.

## Notas
- Seguir o padrão de design do sistema para tabelas e cards.
