# TASK-001 - Migração de Banco de Dados (DDL)

## Objetivo
- Preparar a estrutura do banco de dados para suportar o vínculo entre petições, tarefas e documentos do processo, além de gerenciar o ciclo de vida.

## Escopo / Entregáveis
- Script SQL para alteração da tabela `Peticionamento_Finalizado` (ou criação de nova tabela se necessário).
- Adição de campos: `tarefa_id`, `processo_id`, `processo_doc_id`, `status` (ENUM), `caminho_arquivo`.
- Script de rollback para as alterações.

## Passos e subtarefas
1. Identificar se utilizaremos a tabela `Historico_Peticoes` ou criaremos a `Peticionamento_Finalizado` conforme o documento de visão.
2. Criar script SQL em `scripts/sql/reestrutura_peticao_ddl.sql`.
3. Adicionar as Foreign Keys para `tarefas`, `processos` e `processo_doc`.
4. Definir o ENUM de status: 'Rascunho', 'Em Revisão', 'Aprovado', 'Finalizado'.

## Dependências
- Nenhuma.

## Paralelizável?
- Não, esta task deve ser a primeira para garantir a integridade dos dados.

## Critérios de aceite
- O script SQL executa sem erros.
- As tabelas possuem os campos necessários e as restrições de integridade (FKs).

## Testes
- Executar o script em ambiente de desenvolvimento e verificar a estrutura via `DESCRIBE` ou ferramenta de banco.
