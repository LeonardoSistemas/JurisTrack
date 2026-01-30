# TASK-003 - Integração da UI na Fila de Trabalho

## Objetivo
- Disponibilizar a funcionalidade de geração de petição diretamente na tela de execução de tarefas.

## Escopo / Entregáveis
- Alteração em `public/html/tarefasExecucao.html`.
- Alteração em `public/js/tarefasExecucao.js`.
- Injeção do botão "Gerar Petição" e abertura do editor TinyMCE.

## Passos e subtarefas
1. Localizar o card de ações de status em `tarefasExecucao.html`.
2. Inserir o botão "Gerar Petição" condicionalmente (se a providência permitir).
3. Implementar lógica no JS para abrir o modal/editor carregando o contexto do processo (`processoId`) e da tarefa (`tarefaId`).
4. Reutilizar a lógica de merge de variáveis de `gerarPeticao.js`.

## Dependências
- TASK-002 (API de salvamento).

## Paralelizável?
- Sim, em paralelo com o Backend.

## Critérios de aceite
- O botão aparece na tela de execução da tarefa.
- Ao clicar, o editor abre com os dados do processo já preenchidos (merge).

## Testes
- Teste manual de fluxo: Abrir tarefa -> Clicar em Gerar Petição -> Verificar merge de variáveis -> Salvar.
