# Tech Spec - Fila de Trabalho e Gestão de Tarefas Automáticas

## 1. Visão Geral
Esta especificação técnica detalha a implementação da Fila de Trabalho, transformando a análise de publicações em uma linha de produção guiada. O sistema automatizará a criação de tarefas a partir de providências confirmadas, permitindo a gestão de responsáveis, checklists dinâmicos e controle de status até o protocolo final.

## 2. Arquitetura do Sistema

### 2.1 Componentes e Camadas
Seguindo o padrão do projeto, a implementação será dividida em:
- **Routes**: Definição dos endpoints REST.
- **Controllers**: Validação de entrada, autorização de tenant e orquestração.
- **Services**: Lógica de negócio, integração com Supabase e regras de transição de status.
- **Repositories/TenantScope**: Garantia de isolamento de dados por `tenant_id`.

### 2.2 Fluxo de Dados
1. **Gatilho**: O `eventoProvidenciaController` acionará a criação de uma tarefa ao confirmar uma providência.
2. **Persistência**: Dados salvos no Supabase (PostgreSQL).
3. **Arquivos**: Comprovantes de protocolo salvos no Supabase Storage via `uploadService`.

## 3. Design de Dados (Esquema de Banco)

### 3.1 Tabela: `aux_status`
Tabela genérica para gestão de estados do sistema.
- `id`: UUID (PK)
- `nome`: String (ex: "Em Elaboração")
- `dominio`: String (valor fixo: "tarefa_fila_trabalho")
- `ativo`: Boolean (default: true)
- `cor_hex`: String (opcional, para UI)

### 3.2 Tabela: `tarefa_fila_trabalho`
- `id`: UUID (PK)
- `processo_id`: FK (processos)
- `evento_id`: FK (eventos)
- `providencia_id`: FK (providencia_juridica)
- `responsavel_id`: FK (usuarios)
- `revisor_id`: FK (usuarios, opcional)
- `status_id`: FK (aux_status)
- `data_limite`: Date
- `tenant_id`: FK (tenants)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### 3.3 Tabela: `tarefa_checklist_item`
Instância do checklist para a tarefa específica.
- `id`: UUID (PK)
- `tarefa_id`: FK (tarefa_fila_trabalho)
- `titulo`: String
- `ordem`: Integer
- `concluido`: Boolean (default: false)
- `obrigatorio`: Boolean (default: true)
- `tenant_id`: FK (tenants)

## 4. Interfaces de API (Endpoints)

### 4.1 Gestão de Tarefas
- `GET /api/tarefas`: Lista tarefas do tenant com filtros (meu_trabalho, status, prioridade).
- `POST /api/tarefas`: Criação manual ou via sistema (internal).
- `GET /api/tarefas/:id`: Detalhes da tarefa, incluindo checklist e contexto do processo.
- `PATCH /api/tarefas/:id/status`: Altera o status (ex: para "Em Revisão").
- `PATCH /api/tarefas/:id/atribuir`: Muda o responsável ou revisor.

### 4.2 Checklist da Tarefa
- `GET /api/tarefas/:id/checklist`: Lista itens da instância.
- `PUT /api/tarefas/:id/checklist/:itemId`: Marca como concluído/pendente.
- `POST /api/tarefas/:id/checklist`: Adiciona item extra àquela tarefa.
- `DELETE /api/tarefas/:id/checklist/:itemId`: Remove item da instância.

### 4.3 Protocolo e Anexos
- `POST /api/tarefas/:id/protocolar`: Endpoint que recebe o arquivo, chama `uploadService.uploadFileToProcessoDoc` e move o status para "Protocolado".

## 5. Regras de Negócio e Lógica Principal

### 5.1 Gatilho de Criação Automática
Ao confirmar uma providência:
1. Buscar checklist padrão em `providencia_checklist`.
2. Criar registro em `tarefa_fila_trabalho` com status inicial ("Aguardando").
3. Clonar itens do checklist padrão para `tarefa_checklist_item`.

### 5.2 Lógica de Prioridade (Cálculo em Tempo Real)
- **Crítico (Vermelho)**: `data_limite` <= hoje.
- **Atenção (Amarelo)**: `data_limite` <= hoje + 3 dias.
- **Tranquilo (Verde)**: `data_limite` > hoje + 3 dias.

### 5.3 Validação de Protocolo
O status "Protocolado" só pode ser atingido se:
1. Todos os itens obrigatórios do checklist da tarefa estiverem `concluido = true`.
2. Houver pelo menos um documento vinculado na tabela `processo_Doc` associado a esta tarefa/processo.

## 6. Análise de Impacto
- **Performance**: Indexação por `tenant_id` e `responsavel_id` na tabela de tarefas.
- **Segurança**: Filtro de tenant obrigatório em todas as queries via `withTenantFilter`.
- **Integridade**: Uso de transações (se possível via Supabase RPC ou lógica de service) ao clonar checklists.

## 7. Estratégia de Testes
- **Unitários**: Validação de transição de status e cálculo de prioridade.
- **Integração**: Fluxo completo desde a confirmação da providência até a criação da tarefa.
- **Contrato**: Garantir que o payload de upload de comprovante segue o padrão do `uploadService`.

## 8. Observabilidade
- Logs de erro via `logError` em todas as falhas de transição de status.
- Rastreamento de tempo de execução (timestamp de início vs timestamp de protocolo).
