# Tech Spec - Conciliação e Cadastro de Similaridade de Publicações

## 1. Visão Técnica e Objetivos
Implementar um workflow de conciliação para publicações processadas via IA (N8N). A solução deve persistir os resultados de forma normalizada, atualizar o ciclo de vida do upload e permitir que analistas transformem itens analisados em registros oficiais com um único clique.

## 2. Arquitetura e Componentes

### 2.1 Backend (Node.js/Express)
- **Novos Módulos**:
  - `src/controllers/conciliacaoController.js`: Gerencia as ações de aceitar (cadastrar) e descartar (cancelar) itens.
  - `src/services/conciliacaoService.js`: Centraliza a lógica de negócio, incluindo transações de banco de dados e integração com o sistema de prazos existente.
- **Módulos Atualizados**:
  - `src/controllers/publicacaoController.js`: Atualizar `verificarSimilaridadeEmLote` para disparar a persistência normalizada em `similaridade_itens` e atualizar o status do upload ao final.
  - `src/services/similaridadeResultadoService.js`: Refatorar para realizar o cálculo de `data_vencimento` (via `addBusinessDays`) antes da inserção dos itens.

### 2.2 Frontend (JS)
- **`public/js/upload.js`**: Alterar o evento de clique no botão "Processado" da tabela de histórico para que ele dispare a troca de aba e o filtro de similaridade.
- **`public/js/similaridade.js`**: Implementar a lógica de captura de `uploadId` via parâmetro de navegação e carregamento dos itens pendentes da nova tabela.

## 3. Endpoints de API

### 3.1 `POST /api/similaridade/conciliar/cadastrar`
Realiza o cadastro oficial.
- **Payload**: `{ itemId: UUID }`
- **Fluxo**: 
  1. Verifica/Cria processo em `processos`.
  2. Insere em `Publicacao`.
  3. Insere **novo** registro em `publicacao_embedding` reutilizando o embedding já calculado no item de similaridade (sem sobrescrever/dedup).
  4. Insere `Andamento` e `Prazo` em uma única transação.
  5. Atualiza `similaridade_itens.status_decisao = 'cadastrado'`.
  6. Toda a sequência é transacional; falha ao gravar o embedding aborta o cadastro inteiro.

### 3.2 `POST /api/similaridade/conciliar/cancelar`
Registra o descarte.
- **Payload**: `{ itemId: UUID, motivo?: string }`
- **Fluxo**:
  1. Insere em `similaridade_descartes_auditoria`.
  2. Atualiza `similaridade_itens.status_decisao = 'cancelado'`.

### 3.3 `GET /api/similaridade/itens/:uploadId`
Lista itens pendentes para conciliação.

## 4. Modelo de Dados e Ciclo de Vida

### 4.1 Tabela `similaridade_itens`
- Estrutura normalizada conforme PRD (RF1).
- **Cálculo de Prazo**: Executado no backend durante o processamento do lote do N8N.

### 4.3 Fluxo de Embedding
- O embedding armazenado em `similaridade_itens` é reutilizado no cadastro.
- Inserção em `publicacao_embedding` sempre cria um novo registro (campos: `numero_do_processo`, `publicacao_id`, `texto`, `embedding`).
- Operação ocorre apenas no fluxo de `cadastrar` e dentro da mesma transação das tabelas oficiais; qualquer erro aciona rollback.

### 4.2 Status do Upload
O status na tabela `upload_Documentos` deve seguir este fluxo:
1. `pendente`: Upload realizado, aguardando N8N.
2. `em_processamento`: Payload recebido do N8N, itens sendo salvos na `similaridade_itens`.
3. `processado`: Itens salvos com sucesso, pronto para conciliação.

## 5. Lógica de Navegação e UX

### 5.1 Redirecionamento Histórico -> Similaridade
No frontend (`upload.js`):
- O botão "Processado" não abrirá mais o modal de resultados calculados.
- Ele executará:
  ```javascript
  const tabButton = document.querySelector('[data-bs-target="#tab-similaridade"]');
  new bootstrap.Tab(tabButton).show();
  // Dispara evento ou atualiza estado para carregar itens do uploadId
  ```

### 5.2 Gerenciamento de Estado Local
- Utilizar um objeto de estado no frontend para manter a lista de itens.
- Ao receber sucesso de um endpoint de conciliação, remover o item do array e re-renderizar o container de cards.

## 6. Estratégia de Testes
- **Rollback**: Validar que falhas no cadastro da `Publicacao` não deixam processos "vazios" órfãos se a transação falhar.
- **Concorrência**: Garantir que múltiplos cliques no botão de cadastrar não gerem registros duplicados (através de check de status atômico no banco).

---
**Tech Spec atualizada e salva em: `tasks/prd-similaridade-conciliacao/techspec.md`**
