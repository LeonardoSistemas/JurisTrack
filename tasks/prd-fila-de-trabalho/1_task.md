# 1.0 - Modelagem e Criação do Banco de Dados

## Objetivo
- Implementar a estrutura de persistência necessária para a Fila de Trabalho, garantindo isolamento por tenant e integridade referencial.

## Escopo / Entregáveis
- Script SQL para criação da tabela `aux_status`.
- Script SQL para criação da tabela `tarefa_fila_trabalho`.
- Script SQL para criação da tabela `tarefa_checklist_item`.
- Índices para performance (tenant_id, responsavel_id, data_limite).

## Passos e subtarefas
- 1.1 Criar tabela `aux_status` para gerenciar estados globais.
- 1.2 Criar tabela `tarefa_fila_trabalho` com FKs para processos, eventos e usuários.
- 1.3 Criar tabela `tarefa_checklist_item` para instâncias de checklist.
- 1.4 Adicionar políticas de RLS (Row Level Security) para garantir isolamento por `tenant_id`.
- 1.5 Criar índices de busca para otimizar a fila de trabalho.

## Dependências
- Nenhuma.

## Paralelizável?
- Não. Esta é a base para todas as outras tarefas.

## Critérios de aceite
- Tabelas criadas no Supabase com as colunas definidas na Tech Spec.
- Políticas de RLS ativas e testadas.
- FKs configuradas corretamente (on delete cascade onde aplicável).

## Testes
- Verificar se um usuário de um tenant não consegue visualizar tarefas de outro tenant via SQL direto.
- Validar se a inserção de uma tarefa sem `processo_id` ou `tenant_id` falha.

## Notas
- Incluir o campo `revisor_id` como opcional.
- Garantir que `data_limite` seja do tipo Date.
