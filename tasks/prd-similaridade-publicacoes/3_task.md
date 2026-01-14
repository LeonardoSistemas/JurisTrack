# 3.0 - Observabilidade, limites de carga e testes

## Objetivo
- Complementar o backend com logs/métricas e garantir cobertura de testes para manter o serviço confiável sob diferentes cargas.

## Escopo / Entregáveis
- Logs estruturados por batch que registram `tenantId`, `batchSize`, `maxConcurrency`, `durationMs` e número de itens processados.
- Métricas customizadas (via observability/sentry ou logs) para tempo médio por batch, percentil 95 e número de batches.
- Documentação/configuração dos limites de `batchSize` e `maxConcurrency` (variáveis de ambiente) e mensagens de erro (`503`, `retryAfter`).
- Testes unitários, integração, contract e de performance descritos no tech spec.

## Passos e subtarefas
- Adicionar logs em pontos-chave do service (início/fim de batch, item com erro, tempo total de request).
- Configurar headers (`X-Processing-Time`, `X-Items-Processed`) e expor erros (`503`, `erro de processamento específico`).
- Escrever testes unitários e integração (mockando payloads e respostas de service).
- Criar testes de contract para garantir schema da resposta.
- Executar testes de performance manualmente com lotes de 1k, 10k e 100k para calibrar valores default.

## Dependências
- Depende de `1.0` e pode rodar paralelamente ou após `2.0`.

## Paralelizável?
- Sim (desde que `1.0` esteja funcional).

## Critérios de aceite
- Logs/métricas exibem batch/processamento e são acessíveis para debugging.
- Testes cobrem os fluxos críticos e são executáveis com `npm test`.
- Limites de carga funcionam e `503` é retornado quando necessário.

## Testes
- Unitários: `publicacaoDuplicidadeService` batches e fallback.
- Integração: endpoint responde corretamente e os headers retornam valores esperados.
- Performance: medir tempo/memória com lotes de 1k/10k/100k, ajustar `batchSize`.

## Notas
- Garantir que nenhum log inclua dados sensíveis das publicações (somente hashes/performance).

