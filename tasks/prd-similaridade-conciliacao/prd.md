# PRD - Conciliação e Cadastro de Similaridade de Publicações

## 1. Visão Geral e Objetivos
Transformar a análise de similaridade em uma ferramenta de decisão ativa. O objetivo é permitir que o analista, após o processamento, possa rapidamente "Cadastrar" publicações legítimas ou "Cancelar" (descartar) duplicidades, automatizando a inserção nos registros oficiais do sistema (`processos`, `Publicacao`, `Andamento` e `Prazo`).

## 2. Escopo
- **Incluso**:
    - Persistência individual e normalizada de itens de similaridade.
    - Botões de ação: **Cadastrar** e **Cancelar**.
    - Integração automática: Cadastro dispara inserção em `Publicacao`, `Andamento` e `Prazo`.
    - Garantia de Processo: Criação automática de processo (apenas número) caso não exista.
    - Cálculo de Prazos: Lógica de cálculo de data de vencimento baseada em dias úteis e calendário de feriados.
    - Ciclo de Vida do Upload: Atualização do status para `'processado'` na tabela `upload_Documentos` após a persistência dos itens.
    - Auditoria: Tabela dedicada para registros de descartes (cancelamentos).
    - UX: Redirecionamento da aba "Histórico" para "Similaridade" (ação principal do botão Processado) e atualização em tempo real (remoção visual do card).
- **Não Incluso**:
    - Edição de texto da publicação no momento da conciliação.
    - Cadastro de partes do processo no fluxo automático de criação de processo simplificado.

## 3. Usuários e Histórias de Usuário
- **Analista de Operações**: "Como analista, quero revisar os itens processados e, com um clique, cadastrar as novas publicações no sistema sem precisar redigitar dados e sem me preocupar com o cálculo manual de prazos, vendo a lista diminuir conforme trabalho."

## 4. Requisitos Funcionais (RF)
1. **RF1 - Persistência Normalizada**: Salvar cada resultado do lote na tabela `similaridade_itens` com colunas específicas para metadados (processo, texto, datas, prazos).
2. **RF2 - Cálculo Automático de Prazo**: No momento da persistência inicial, o sistema deve calcular a `data_vencimento` somando os dias de `prazo_de_entrega` à `data_publicacao`, respeitando finais de semana e feriados cadastrados.
3. **RF3 - Ação "Cadastrar"**:
    - **Verificação de Processo**: Se o número do processo não existir, criar registro em `processos`.
    - **Inserção Oficial**: Inserir na tabela `Publicacao`, seguida de `Andamento` (descrição padrão) e `Prazo`.
    - **Embedding**: Criar um novo registro em `publicacao_embedding` reutilizando o vetor calculado na etapa de similaridade, com `numero_do_processo`, `publicacao_id`, `texto`, `embedding`. O insert é parte da mesma transação; falha invalida todo o cadastro.
    - **Estado**: Marcar item como `cadastrado` e remover da visão de pendências.
4. **RF4 - Ação "Cancelar"**:
    - Registrar o descarte na tabela `similaridade_descartes_auditoria` para fins de compliance.
    - Marcar item como `cancelado` e remover da visão de pendências.
5. **RF5 - Navegação Contextual (Histórico -> Similaridade)**: O botão que indica status "Processado" na aba Histórico deve redirecionar o usuário diretamente para a aba de Similaridade, carregando automaticamente os itens pendentes daquele upload específico.
6. **RF6 - Finalização da Análise Técnica**: O sistema deve marcar o upload como `'processado'` somente após garantir que todos os itens foram salvos na tabela `similaridade_itens`.
7. **RF7 - UI em Tempo Real**: A interface deve remover o card do item imediatamente após a confirmação de sucesso da API.

## 5. Modelo de Dados (Tabelas)
### similaridade_itens (Normalizada)
- `id` (UUID), `upload_documento_id` (FK), `tenant_id`, `status_verificacao`.
- `numero_processo`, `texto_publicacao`, `data_publicacao`, `prazo_dias`.
- `data_vencimento` (Calculada), `status_decisao` (pendente, cadastrado, cancelado).
- `hash_publicacao`, `embedding` (vector).

### similaridade_descartes_auditoria
- `id`, `item_id`, `tenant_id`, `usuario_id`, `dados_originais` (jsonb), `data_descarte`.

## 6. UX e Apresentação
- **Cards de Conciliação**: Exibição clara do texto, similaridade encontrada e as datas calculadas.
- **Botões**: [Cadastrar] (Sucesso/Verde) e [Cancelar] (Perigo/Outline).
- **Transição**: Feedback visual de progresso (ex: "Processando cadastro...") seguido da remoção do card.

## 7. Métricas de Sucesso
- Redução de 90% no esforço manual de cadastro de publicações e prazos vindos de uploads.
- 100% de consistência entre a `data_vencimento` calculada e a inserida na tabela `Prazo`.
- Registro de auditoria para todos os descartes efetuados.
