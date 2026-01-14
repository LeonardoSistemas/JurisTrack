# Tarefa Complementar - Persistência de Embedding no Cadastro

## Contexto
- Complementar ao plano original para garantir que, ao cadastrar uma publicação proveniente de similaridade, seja criado um **novo** registro em `publicacao_embedding` reutilizando o vetor calculado.

## Escopo
- Inserir novo registro em `publicacao_embedding` usando dados do item de similaridade (`numero_do_processo`, `publicacao_id`, `texto`, `embedding`), sem sobrescrita/dedup.
- Operação ocorre apenas no fluxo de **cadastrar** e dentro da transação que inclui `processos`, `Publicacao`, `Andamento` e `Prazo`.
- Qualquer erro ao gravar o embedding deve abortar toda a transação.

## Dependências
- Endpoints de conciliação implementados (tarefa 3.0 do plano principal).

## Entregáveis
- Backend ajustado para inserir embedding como novo registro no `POST /api/similaridade/conciliar/cadastrar`, reutilizando o embedding do item.
- Teste/validação de rollback: falha no insert de `publicacao_embedding` impede criação de processo/publicação/andamento/prazo.

## Status
- Pendente
