# Especificação Técnica - Cadastro e Análise de Prazos

## 1. Alterações no Banco de Dados

### 1.1 Nova Tabela: `similaridade_item_publicacao`
```sql
CREATE TABLE similaridade_item_publicacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_similaridade_id UUID NOT NULL REFERENCES similaridade_itens(id),
    publicacao_id UUID NOT NULL REFERENCES "Publicacao"(id),
    tenant_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_similaridade_id, publicacao_id)
);
```

### 1.2 Alteração na Tabela `Prazo`
```sql
ALTER TABLE "Prazo" ADD COLUMN auditoria_sugestao_id UUID REFERENCES auditoria_sugestao(id);
```

### 1.3 Atualização de Status
```sql
-- Adicionar os novos status permitidos
-- Dependendo do banco, pode ser uma constraint CHECK ou apenas atualização de lógica na aplicação.
```

## 2. Fluxo Backend

### 2.1 Cadastro de Item (Similaridade)
No método que processa o "Cadastrar":
- **Remover**: `await prazoRepository.create(...)`
- **Adicionar**: 
  ```javascript
  await similaridadeRepository.vincularPublicacao(itemId, publicacaoId, tenantId);
  await similaridadeRepository.updateStatus(itemId, 'cadastrado_sem_prazo');
  ```

### 2.2 Endpoint `/api/analise/confirmar`
- Input: `decisao_final_json`, `prazo_final`, `item_similaridade_id`, `publicacao_id`.
- Lógica:
  1. Cria registro em `auditoria_sugestao`.
  2. Cria registro em `Prazo` vinculado à `Publicacao` e à `auditoria_sugestao`.
  3. Atualiza `similaridade_itens` para `analisado_com_prazo`.

## 3. Fluxo Frontend

### 3.1 `public/js/similaridade.js`
- Modificar o observer ou a função de renderização dos cards:
  ```javascript
  if (item.status_decisao === 'cadastrado_sem_prazo') {
      btnCadastrar.disabled = true;
      btnCancelar.disabled = true;
      btnAnalisar.disabled = false;
  } else if (item.status_decisao === 'pendente') {
      btnCadastrar.disabled = false;
      btnCancelar.disabled = false;
      btnAnalisar.disabled = true;
  }
  ```
