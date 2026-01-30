# TASK-004 - Sincronização de Status e Geração de PDF

## Objetivo
- Automatizar a mudança de status da petição e gerar o arquivo PDF final.

## Escopo / Entregáveis
- Lógica de trigger/serviço para monitorar mudança de status da tarefa.
- Integração com biblioteca de geração de PDF (ex: Puppeteer ou similar já existente).
- Atualização do arquivo físico no storage (de HTML para PDF).

## Passos e subtarefas
1. Implementar hook no `tarefasService` para detectar mudança para status 'Pronto para Protocolo'.
2. Criar serviço de conversão HTML -> PDF.
3. Ao atingir o status 'Pronto para Protocolo', gerar o PDF e atualizar o caminho em `processo_doc` e na tabela de vínculo.
4. Atualizar o status da petição para 'Aprovado'.

## Dependências
- TASK-002 e TASK-003.

## Paralelizável?
- Não, depende do fluxo de salvamento base estar pronto.

## Critérios de aceite
- Ao mudar a tarefa para 'Pronto para Protocolo', um arquivo .pdf surge na pasta do processo.
- O registro em `processo_doc` aponta para o novo PDF.

## Testes
- Verificar geração de PDF no storage após mudança de status.
- Validar se o PDF contém o conteúdo correto da petição.
