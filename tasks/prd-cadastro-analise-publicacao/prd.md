# PRD - Desacoplamento de Cadastro e Análise de Prazos

## 1. Introdução
Este documento descreve a alteração no fluxo de conciliação de publicações. O objetivo é separar a criação do registro da publicação (cadastro) da criação do prazo processual, permitindo que o usuário realize uma análise assistida por IA antes de definir o prazo final.

## 2. Contexto e Problema
Atualmente, o botão **Cadastrar** no fluxo de similaridade realiza a criação completa: Processo (se necessário), Publicação, Andamento e Prazo. No entanto, a definição do prazo muitas vezes requer uma análise técnica mais profunda que a IA pode auxiliar através de um modal específico. Precisamos que o cadastro inicial aconteça sem o prazo, e que o prazo seja criado posteriormente após a análise.

## 3. Objetivos
- Separar o ato de cadastrar a publicação da criação do prazo.
- Persistir o vínculo entre o item de similaridade e a publicação gerada.
- Habilitar o botão de **Analisar** apenas após o cadastro.
- Garantir a rastreabilidade e auditoria entre a sugestão da IA e o prazo final criado.

## 4. Requisitos Funcionais

### RF1 - Evolução do Modelo de Dados
1.  **Tabela de Vínculo**: Criar a tabela `similaridade_item_publicacao` para persistir a relação entre `similaridade_itens.id` e `Publicacao.id`.
2.  **Status de Decisão**: Atualizar a coluna `status_decisao` na tabela `similaridade_itens` para suportar os novos estados:
    - `pendente` (atual)
    - `cadastrado_sem_prazo` (pós clique em Cadastrar)
    - `analisado_com_prazo` (pós confirmação no modal de análise)
    - `cancelado` (atual)
3.  **Auditoria no Prazo**: Adicionar a coluna `auditoria_sugestao_id` (FK para `auditoria_sugestao.id`) na tabela `Prazo` para garantir o vínculo com a análise da IA.

### RF2 - Alteração no Fluxo de "Cadastrar"
Ao clicar em **Cadastrar**:
1.  Manter a criação de: `processos`, `Publicacao`, `publicacao_embeddings` e `Andamento`.
2.  **Remover** a criação automática do registro na tabela `Prazo`.
3.  Inserir registro na nova tabela de vínculo `similaridade_item_publicacao`.
4.  Atualizar `similaridade_itens.status_decisao` para `cadastrado_sem_prazo`.

### RF3 - Alteração no Fluxo de "Analisar"
1.  O botão **Analisar** deve estar habilitado **somente** se o status for `cadastrado_sem_prazo`.
2.  O modal de análise deve ser carregado com o contexto da `publicacao_id` vinculada ao item.

### RF4 - Atualização do Endpoint de Confirmação (`/api/analise/confirmar`)
Ao confirmar a análise no modal:
1.  Inserir o registro na tabela `Prazo` utilizando o `prazo_final` e demais dados definidos no modal.
2.  Associar o `Prazo` ao `publicacao_id` e ao `auditoria_sugestao_id` gerado durante a análise.
3.  Atualizar o status do item em `similaridade_itens` para `analisado_com_prazo`.

### RF5 - Regras de UI
1.  **Botão Cancelar**: Deve ser desabilitado caso o item já esteja com status `cadastrado_sem_prazo` ou superior.
2.  **Feedback Visual**: O card deve refletir o estado intermediário (ex: badge "Cadastrado, aguardando análise").

## 5. Requisitos Não Funcionais
- **Integridade**: A criação do prazo deve ser transacional com a atualização do status do item de similaridade.
- **Auditoria**: Todas as decisões tomadas no modal de análise devem ser registradas em `auditoria_sugestao`.

## 6. Fora de Escopo
- Alterações no algoritmo de cálculo de similaridade.
- Alterações no fluxo de importação (N8N/Upload).

## 7. Critérios de Aceite
- [ ] Clicar em Cadastrar não gera mais registro na tabela `Prazo`.
- [ ] Após cadastrar, o botão Analisar fica disponível e o botão Cancelar fica indisponível.
- [ ] Após concluir a análise no modal, um novo Prazo é criado e vinculado à publicação correta.
- [ ] O status do item de similaridade transita corretamente: `pendente` -> `cadastrado_sem_prazo` -> `analisado_com_prazo`.
