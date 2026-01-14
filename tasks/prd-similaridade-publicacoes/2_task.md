# 2.0 - Ajustar front interno para cards e modais de status

## Objetivo
- Garantir que o front, acionado após o fluxo do N8N, envie o payload correto e apresente os resultados da similaridade agrupados por status com acesso aos detalhes das publicações.

## Escopo / Entregáveis
- Atualização do front para enviar `{ numero_processo, tenant_id, data_publicacao, texto }` ao novo endpoint.
- Agrupamento dos itens retornados por `status` e exibição de cards com a quantidade por status.
- Modais que listam `numero_processo`, `texto`, `data_publicacao` e `similarity` ao clicar em cada card.
- Feedback visual (ex: carregando/processamento) para lotes grandes com base em headers ou métricas expostas pelo backend.

## Passos e subtarefas
- Atualizar o fluxo que chama a API após o N8N para montar o payload com os campos exigidos.
- Ao receber o array de resposta, agrupar por status (NOVO, POSSIVEL_DUPLICADO, etc.) e computar contagem para cada card.
- Implementar cards no UI/JS existente com botões que disparam modais preenchidos com os detalhes de cada publicação.
- Consumir cabeçalhos `X-Processing-Time` e `X-Items-Processed` para exibir tempo/quantidade processada (opcional) e indicar quando o backend sugere retry.
- Validar que o modal mostra corretamente o `texto` completo e mantém a ordenação esperada.

## Dependências
- Depende de `1.0` (endpoint implementado e testado).

## Paralelizável?
- Sim, pode ser trabalhado em paralelo com `3.0` após `1.0` estiver estável.

## Critérios de aceite
- Cards atualizam as quantidades quando novos resultados chegam.
- Modais exibem os campos requisitados e mantêm scroll confortável para textos longos.
- Usuário vê aviso claro se o backend retornar `503` ou sugerir `retryAfter`.

## Testes
- Unitário: testar funções de agrupamento e renderização de cards/modais.
- Integração: teste manual com payloads retornando diferentes status.
- Contract: garantir que o front consome exatamente o schema definido (`numero_processo`, `texto`, `data_publicacao`, `status`, `similarity`).

## Notas
- Coordenar testes com o fluxo do N8N para garantir que a chamada aconteça no momento certo após o retorno do processo.

