# 8.0 - UI: Workspace de Execução de Tarefa

## Objetivo
- Proporcionar um ambiente focado para a execução da tarefa, com todas as informações e ferramentas necessárias.

## Escopo / Entregáveis
- Tela de execução em Split Screen.
- Componente de Checklist interativo.
- Área de Upload de comprovante.

## Passos e subtarefas
- 8.1 Criar layout split screen (Esquerda: Contexto/Checklist | Direita: Área de Trabalho).
- 8.2 Implementar componente de checklist com opção de adicionar/remover itens.
- 8.3 Criar botões de ação de status (Iniciar, Enviar para Revisão, etc).
- 8.4 Integrar componente de upload para o protocolo final.
- 8.5 Exibir informações resumidas do processo e da publicação original para contexto.

## Dependências
- 5.0 - API de Checklist e Ciclo de Vida.
- 6.0 - Integração de Protocolo e Upload.

## Paralelizável?
- Sim.

## Critérios de aceite
- Checklist funcional (marcar/desmarcar e editar itens).
- Botão de "Protocolar" habilitado apenas quando critérios forem atendidos.
- Transição visual de status ao clicar nos botões de ação.

## Testes
- Fluxo completo de execução: Iniciar -> Marcar Checklist -> Upload -> Finalizar.

## Notas
- A área da direita será focada no upload de documentos, conforme decidido.
