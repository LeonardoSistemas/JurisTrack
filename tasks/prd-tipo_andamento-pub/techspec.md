# Tech Spec - Tipo de andamento em similaridade de publicações

## 1. Visão Técnica e Objetivos
Enriquecer a análise de similaridade de publicações com o campo `tipo_andamento`, permitindo uma decisão jurídica mais célere. Além disso, simplificar a interface de conciliação através de elementos nativos de colapso (`details/summary`) e reorganizar a navegação principal para melhor fluxo de trabalho.

## 2. Arquitetura e Componentes

### 2.1 Backend (Node.js/Express)
- **Persistência**: 
  - Atualizar o serviço de persistência de resultados de similaridade para incluir a nova coluna.
  - Garantir que a normalização aceite tanto `tipo_andamento` quanto `tipoAndamento` (fallback).
- **API**:
  - O endpoint de recebimento de lote (`/api/publicacoes/similaridade`) deve processar e salvar o novo campo.
  - O endpoint de listagem de itens (`/api/similaridade/itens/:uploadId`) já retorna todos os campos da tabela, portanto não requer alterações estruturais, apenas garantia de que o dado esteja presente.

### 2.2 Frontend (JS/HTML/CSS)
- **Componentes de UI**:
    - `public/js/similaridade.js`: Alterar a renderização dos cards para incluir o texto de `tipo_andamento` em destaque (negrito e maior).
    - `public/js/similaridade.js`: Substituir o `textarea` de exibição do texto da publicação por um elemento `<details>` com `<summary>` para colapso nativo.
    - `public/js/components/sidebar.js`: 
        - Renomear item de menu "Upload / Inicio" para "Análise de publicações".
        - Remover item "Similaridade".
        - Implementar seção "Cadastros" como um accordion (iniciando fechado).
- **Limpeza**:
    - Remover `public/html/similaridade.html`.
    - Remover rotas e referências à página legada no `src/app.js`.

## 3. Alterações no Modelo de Dados

### 3.1 Tabela `similaridade_itens`
- **Coluna**: `tipo_andamento`
- **Tipo**: `TEXT`
- **Restrição**: `NULLABLE` (para manter compatibilidade com registros antigos e payloads parciais).

## 4. Endpoints de API

### 4.1 `POST /api/publicacoes/similaridade`
- **Entrada**: Adicionar campo opcional `tipo_andamento` em cada item do array.
- **Lógica**: Mapear o campo para a coluna correspondente na tabela `similaridade_itens`.

## 5. Lógica de UI e UX

### 5.1 Cards de Conciliação
- O campo `tipo_andamento` será exibido acima do número do processo.
- Estilo: Texto em negrito (`fw-bold`) e tamanho levemente aumentado (`fs-5` ou similar).
- Caso ausente, exibir o fallback "—".

### 5.2 Texto Colapsável
- Utilizar a estrutura:
  ```html
  <details>
    <summary>Ver texto da publicação</summary>
    <pre style="white-space: pre-wrap;">{{texto}}</pre>
  </details>
  ```
- O `<summary>` deve exibir um label claro como "Texto da Publicação".

### 5.3 Sidebar Accordion
- A seção "Cadastros" será envolta em um elemento que permita colapso (ex: usando classes do Bootstrap `collapse` ou lógica customizada no Web Component).
- Por padrão, inicia **fechado**.

## 6. Estratégia de Testes
- **Migração**: Validar se a adição da coluna não impacta a leitura de registros existentes.
- **Payload**: Testar envio de lotes via `/api/publicacoes/similaridade` com e sem o campo `tipo_andamento`.
- **Navegação**: Verificar se não existem links órfãos para `/similaridade` e se o redirecionamento do menu está correto.
- **UI**: Validar o comportamento de abrir/fechar do `details/summary` e o visual do accordion na sidebar.

---
**Tech Spec gerada e salva em: `tasks/prd-tipo_andamento-pub/techspec.md`**
