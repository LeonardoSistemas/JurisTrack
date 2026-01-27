# 2.0 - Configuração de Status e Dados Iniciais

## Objetivo
- Popular o sistema com os estados necessários para o ciclo de vida das tarefas da fila de trabalho.

## Escopo / Entregáveis
- Script SQL de INSERT para a tabela `aux_status`.

## Passos e subtarefas
- 2.1 Mapear os status: "Aguardando", "Em Elaboração", "Em Revisão", "Pronto para Protocolo", "Protocolado".
- 2.2 Definir cores hexadecimais para cada status para uso na UI.
- 2.3 Executar o insert dos registros com o domínio `tarefa_fila_trabalho`.

## Dependências
- 1.0 - Modelagem e Criação do Banco de Dados.

## Paralelizável?
- Sim, pode ser feito em paralelo com o desenvolvimento do backend após a criação das tabelas.

## Critérios de aceite
- Registros presentes na tabela `aux_status`.
- Status disponíveis para consulta via API.

## Testes
- Consultar a tabela e verificar se todos os 5 status estão ativos e com o domínio correto.

## Notas
- O domínio deve ser exatamente `tarefa_fila_trabalho` para facilitar filtros.
