# PRD - Reestruturação de Prazos

## 1. Visão Geral
Reestruturar a entidade `Prazo` para que seu vínculo principal seja com o `Processo` e não mais com a `Publicação`. Esta mudança visa permitir a criação de prazos manuais e automáticos de forma independente de publicações, além de introduzir um sistema de status padronizado e auditoria.

## 2. Problema e Objetivos
### Problema
Atualmente, a tabela `Prazo` depende obrigatoriamente de uma `Publicacao`. Isso impede a criação de prazos que não se originam de publicações (prazos manuais) e dificulta a gestão de tarefas no fluxo de trabalho.

### Objetivos Mensuráveis
- Migrar 100% dos prazos existentes para o novo vínculo com `Processo`.
- Implementar sistema de status (`pendente`, `concluido`, `cancelado`, `em atraso`, `suspenso`).
- Garantir que 100% das alterações de status sejam registradas em tabela de auditoria.
- Remover a dependência de `publicacaoid` em todo o sistema.

## 3. Usuários e Histórias
### Usuários Principais
- **Advogado**: Precisa gerenciar seus prazos de forma clara e eficiente.
- **Controladoria**: Precisa auditar as alterações e garantir que nenhum prazo seja perdido.

### Histórias de Usuário
1. **Como Advogado**, quero criar um prazo manual vinculado diretamente a um processo para não esquecer de uma tarefa importante.
2. **Como Advogado**, quero alterar o status de um prazo para que minha fila de trabalho reflita a realidade.
3. **Como Gestor**, quero ver o histórico de alterações de um prazo para entender por que um status foi modificado.

## 4. Funcionalidades Principais

### 4.1. Novo Schema de Prazo
- **Remover**: `publicacaoid`.
- **Adicionar**: `processoid` (UUID/INT, NOT NULL).
- **Adicionar**: `status_id` (FK para `aux_status`, NOT NULL).
- **Adicionar**: `descricao` (TEXT) - Substitui a dependência visual da publicação.

### 4.2. Sistema de Status (Domínio: `prazo`)
Status obrigatórios a serem cadastrados no `aux_status`:
1. `pendente`
2. `concluido`
3. `cancelado`
4. `em atraso`
5. `suspenso`

### 4.3. Tabela de Auditoria (`prazo_auditoria`)
Campos necessários:
- `id`, `prazo_id`, `status_anterior_id`, `status_novo_id`, `usuario_id`, `data_alteracao`.

### 4.4. Regras de Negócio
- Um processo pode ter múltiplos prazos ativos.
- Prazos órfãos (sem publicação válida na migração) devem ser **removidos**.
- Ao criar um prazo via conciliação, o `processoid` deve ser derivado da publicação original.

## 5. Escopo e Planejamento

### O que NÃO está no escopo
- Implementação de Kanban complexo.
- Calendário de prazos (será tratado em outra task).

### Dependências
- Existência da tabela `aux_status`.
- Acesso aos scripts de migração SQL.

## 6. Design e Experiência (UX)
- **Interface**: Substituir a exibição da publicação pela `descricao` do prazo nas listagens.
- **Ações**: Botões claros para mudança de status (ex: "Concluir", "Suspender").

## 7. Requisitos Funcionais Numerados
1. [RF001] O sistema deve permitir a criação de prazos vinculados apenas ao `processoid`.
2. [RF002] O sistema deve migrar prazos existentes preenchendo `processoid` a partir de `Publicacao.processoid`.
3. [RF003] O sistema deve excluir prazos que não possuam vínculo válido com processo durante a migração.
4. [RF004] Toda alteração de status de prazo deve gerar um registro na tabela de auditoria.
5. [RF005] O status padrão para novos prazos deve ser `pendente`.
6. [RF006] As consultas de dashboard devem ser atualizadas para filtrar por `processoid` e `status_id`.
7. [RF007] A visualização do processo deve listar todos os prazos vinculados diretamente ao processo, independentemente de estarem vinculados a uma publicação.

## 8. Plano de Desenvolvimento (Abordagem)
1. **DB**: Scripts de migração (Alter Table + Data Backfill + Auditoria).
2. **Seed**: Inserção dos novos status no `aux_status`.
3. **Backend**: Atualização dos Services (`processosService`, `conciliacaoService`, `dashboardService`).
4. **Backend**: Implementação do trigger ou logic de auditoria.
5. **Frontend**: Ajuste nos componentes de listagem e criação de prazo.
