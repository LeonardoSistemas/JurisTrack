# 9.0 - UI: Integração na Tela de Análise

## Objetivo
- Permitir a atribuição de um responsável no momento em que a providência é decidida.

## Escopo / Entregáveis
- Campo de seleção de responsável na modal/tela de confirmação de providência.

## Passos e subtarefas
- 9.1 Localizar o componente de confirmação de providência na tela de análise.
- 9.2 Adicionar um dropdown de seleção de usuário (filtrado pelo tenant).
- 9.3 Enviar o `responsavel_id` selecionado para o endpoint de salvamento da providência.

## Dependências
- 3.0 - Gatilho de Criação Automática de Tarefa.

## Paralelizável?
- Sim.

## Critérios de aceite
- O usuário pode escolher quem executará a tarefa antes de confirmá-la.
- Se nenhum responsável for escolhido, definir um comportamento padrão (ex: criador da providência ou deixar vazio).

## Testes
- Confirmar uma providência com um responsável selecionado e verificar se a tarefa foi criada corretamente para esse usuário.

## Notas
- Listar apenas usuários ativos do mesmo `tenant_id`.
