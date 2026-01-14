# 1.0 - Implementar endpoint de similaridade em lote

## Objetivo
- Entregar a rota/controller/service que consome lotes de publicações e retorna resultados com `status`, `publicacaoId`, `similarity` e dados do modal.

## Escopo / Entregáveis
- Nova rota `POST /api/publicacoes/similaridade` no `publicacoesRoutes`.
- Controller que valida payload, aplica limites de `batchSize`/`maxConcurrency` e chama o service.
- `publicacaoDuplicidadeService` que normaliza texto, calcula hash/semântica, processa batches sequenciais e limita concorrência.
- Resposta padrão com objetos `{ publicacaoId?, status, similarity, numero_processo, texto, data_publicacao }`.

## Passos e subtarefas
- Criar handler no controller com validações (array obrigatório, campos `numero_processo`, `texto`, `data_publicacao`, `tenant_id`).
- Configurar limites (variáveis de ambiente `BATCH_SIZE`, `MAX_CONCURRENCY`) e mensagens de erro (`400`, `503`, `500`).
- Atualizar service para processar em blocos e usar queue simples (`p-limit` ou implementação caseira) para chamadas assíncronas.
- Garantir que cada item agrega `numero_processo`, `texto` e `data_publicacao` na resposta e resolve `publicacaoId` internamente.
- Documentar schema e cabeçalhos (`X-Processing-Time`, `X-Items-Processed`).

## Dependências
- Nenhuma direta; depende apenas das libs internas existentes.

## Paralelizável?
- Não (pré-requisito para demais tarefas).

## Critérios de aceite
- Endpoint responde em `200` com array na mesma ordem do payload.
- Lida com batches maiores sem exceder memória (verificar logs de batches processados).
- Timeout/`503` registrados ao ultrapassar limites configurados.

## Testes
- Unitário: simular batches pequenos/grandes no `publicacaoDuplicidadeService`.
- Integração: chamar rota com payload válido, payload inválido e payload excedendo limites.
- Contract: garantir schema da resposta com todos os campos exigidos.

## Notas
- Priorizar clareza da mensagem de erro quando o lote for rejeitado por excesso de carga.

