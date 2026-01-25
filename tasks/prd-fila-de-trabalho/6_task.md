# 6.0 - Integração de Protocolo e Upload

## Objetivo
- Garantir que uma tarefa só seja finalizada (Protocolada) mediante a entrega de um comprovante e conclusão do checklist.

## Escopo / Entregáveis
- Endpoint `POST /api/tarefas/:id/protocolar`.
- Integração com `uploadService` para salvar o comprovante.

## Passos e subtarefas
- 6.1 Implementar endpoint que recebe o arquivo de comprovante.
- 6.2 Validar se todos os itens obrigatórios do checklist estão concluídos.
- 6.3 Chamar `uploadService` para salvar o arquivo vinculado ao processo e à tarefa.
- 6.4 Alterar status da tarefa para "Protocolado" após sucesso no upload.

## Dependências
- 5.0 - API de Checklist e Ciclo de Vida.

## Paralelizável?
- Sim.

## Critérios de aceite
- Tarefa só muda para "Protocolado" se houver arquivo enviado.
- Tarefa só muda para "Protocolado" se checklist estiver 100% (itens obrigatórios).
- Arquivo aparece na lista de documentos do processo.

## Testes
- Tentar protocolar sem anexo (deve falhar).
- Tentar protocolar com checklist pendente (deve falhar).
- Validar persistência do arquivo no storage e banco.

## Notas
- Utilizar o mesmo conceito de upload de documentos para processo já existente.
