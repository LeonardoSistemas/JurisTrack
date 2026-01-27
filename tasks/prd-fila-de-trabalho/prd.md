# PRD - Fila de Trabalho e Gestão de Tarefas Automáticas

## 1. Visão Geral e Objetivos
O objetivo deste projeto é transformar a análise de publicações e prazos em uma linha de produção automática. Atualmente, o sistema já classifica eventos e sugere providências, mas a execução ainda depende da memória do advogado. A Fila de Trabalho centralizará o que precisa ser feito, com responsáveis definidos, checklists e modelos de peça integrados, garantindo que nenhum prazo seja perdido e que a execução seja guiada.

## 2. Escopo

### 2.1 Incluso
- **Nova Interface de Fila de Trabalho**: Visualização organizada por prioridade (Crítico, Atenção, Tranquilo) e tempo (Hoje, Próximos Dias, Futuro).
- **Criação Automática de Tarefas**: Ao confirmar uma providência na tela de análise, o sistema deve gerar uma tarefa vinculada.
- **Atribuição de Responsável**: Nova etapa na interface de providência para selecionar o usuário do tenant que executará a tarefa.
- **Tela de Execução de Tarefa**: Interface focada no trabalho, com checklist lateral, contexto do processo e editor/upload de documentos.
- **Fluxo de Status**: Ciclo de vida da tarefa (Aguardando, Em Elaboração, Em Revisão, Pronto para Protocolo, Protocolado).
- **Upload Obrigatório**: Exigência de anexo de comprovante para finalização da tarefa (Protocolado).

### 2.2 Não Incluso
- Kanban complexo ou calendários como tela principal.
- Notificações push ou e-mail (neste MVP).
- IA para redação automática de peças (apenas modelos pré-definidos).
- Distribuição automática de carga de trabalho (atribuição é manual).

## 3. Usuários e Histórias de Usuário
- **Advogado Executor**: "Como executor, quero abrir minha fila e ver exatamente o que preciso protocolar hoje, com todos os documentos e modelos à mão, para não perder tempo procurando informações."
- **Gestor do Escritório**: "Como gestor, quero atribuir tarefas específicas para membros da equipe durante a análise da publicação e garantir que o protocolo só seja finalizado com o comprovante anexado."

## 4. Requisitos Funcionais (RF)

### 4.1 Geração e Atribuição (Interface de Providência)
1. **RF1 - Seleção de Responsável**: A interface de confirmação de providência deve incluir um campo de seleção (dropdown) com todos os usuários ativos do `tenant_id`.
2. **RF2 - Gatilho de Criação**: Ao salvar a providência, o sistema deve criar um registro na tabela `tarefa` com os vínculos de: Processo, Evento, Providência, Prazo e Responsável.

### 4.2 Fila de Trabalho (Dashboard de Tarefas)
3. **RF3 - Estrutura da Fila**: Exibir tarefas agrupadas em 3 blocos: Fila Prioritária (Urgente/Hoje), Fila Normal (Próximos Dias) e Fila Futura.
4. **RF4 - Indicadores Visuais**: Cada tarefa deve ter um indicador de cor:
   - 🔴 **Crítico**: Vence hoje ou atrasado.
   - 🟡 **Atenção**: Vence em até 3 dias.
   - 🟢 **Tranquilo**: Vence em mais de 3 dias.
5. **RF5 - Filtros Rápidos**: Filtros no topo para "Minhas Tarefas", "Hoje", "Críticas" e busca por "Número do Processo".

### 4.3 Execução da Tarefa (Workspace)
6. **RF6 - Checklist Dinâmico**: Exibir o checklist vinculado à providência. O usuário deve marcar itens conforme progride, nessa etapa o usuário pode adicionar ou remover os itens do checklist.
7. **RF7 - Gestão de Status**:
   - Botão **Iniciar**: Muda status para "Em Elaboração" e registra timestamp.
   - Botão **Enviar para Revisão**: Muda status para "Em Revisão". Se não houver revisor, o executor pode marcar como revisado.
   - Botão **Aprovar**: Muda status para "Pronto para Protocolo".
8. **RF8 - Protocolo e Upload**: O botão "Marcar como Protocolado" só deve ser habilitado após o upload de ao menos um arquivo (comprovante).

## 5. Requisitos Não Funcionais (RNF)
1. **RNF1 - Usabilidade**: O advogado deve identificar sua tarefa prioritária em menos de 5 segundos ao abrir a fila.
2. **RNF2 - Integridade**: Uma tarefa não pode ser finalizada sem estar vinculada a um processo e um tenant válido.
3. **RNF3 - Performance**: A busca por número de processo na fila deve ser instantânea (indexada).

## 6. Modelo de Dados (Estrutura Sugerida)

### Tabela: `tarefa`
- `id` (UUID)
- `processo_id` (FK)
- `evento_id` (FK)
- `providencia_id` (FK)
- `responsavel_id` (FK -> usuarios)
- `revisor_id` (FK -> usuarios, opcional)
- `status` (ENUM: aguardando, elaboracao, revisao, pronto, protocolado)
- `data_limite` (Date)
- `tenant_id` (FK)
- `created_at`, `updated_at`

### Tabela: `tarefa_checklist_item` (Instância do checklist na tarefa)
- `id` (UUID)
- `tarefa_id` (FK)
- `titulo` (String)
- `concluido` (Boolean)

## 7. UX/UI
- **Layout de 3 Blocos**: Limpo, sem excesso de botões na listagem.
- **Tela de Execução**: Split screen (Esquerda: Checklist/Contexto | Direita: Editor/Peça/Anexos).
- **Ações de Mudança de Fase**: Botões grandes e claros que representam a próxima etapa do fluxo.

## 8. Métricas de Sucesso
- 100% das tarefas finalizadas com comprovante anexo.
- Redução no tempo entre a publicação e o início da elaboração da peça.
- Zero prazos perdidos para tarefas inseridas na fila.
