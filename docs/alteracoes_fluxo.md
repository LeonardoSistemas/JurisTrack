# Alterações Necessárias no Fluxo

## 1. Separar cadastro do prazo

### No fluxo do botão **Cadastrar**

-   Remover a criação automática do **Prazo**.
-   Manter a criação de:
    -   processos\
    -   Publicacao\
    -   publicacao_embeddings\
    -   Andamento

### Persistir vínculo para uso no modal

-   Salvar **publicacao_id** (e opcionalmente **processo_id**) em
    `similaridade_itens` ou em tabela auxiliar.
-   Esse vínculo permitirá que o modal crie o prazo corretamente depois.

## 2. Criar o prazo no modal

### No endpoint `/api/analise/confirmar`

-   Inserir registro na tabela **Prazo** usando `prazo_final` definido
    no modal.
-   Associar o prazo ao **publicacao_id** salvo no passo anterior.

## 3. Regras de status

-   Criar um status intermediário, por exemplo:
    -   `cadastrado_sem_prazo`
-   Após salvar no modal, atualizar para:
    -   `cadastrado_com_prazo` **ou**\
    -   `analisado_com_prazo`

## 4. UI (Interface)

-   Manter botões **Cadastrar** e **Cancelar** nos cards de
    similaridade.
-   Habilitar o botão **Analisar** **somente** para itens já cadastrados
    (que possuam `publicacao_id`).

## 5. Contexto no prazo (opcional, mas recomendado)

-   Armazenar na tabela **Prazo**:
    -   referência à `auditoria_sugestao`, **ou**
    -   copiar `decisao_final_json` / `providencia_id`
-   Isso facilita consultas futuras, auditoria e rastreabilidade.
