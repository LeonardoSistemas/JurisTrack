# Ciclo de Vida do Documento e Integração com a Fila de Trabalho

Este documento detalha a reestruturação da gestão de petições, estabelecendo o vínculo direto entre **Processo**, **Tarefa (Providência)** e o **Documento**, garantindo a rastreabilidade e a automação do fluxo jurídico.

---

## 1. Visão Geral do Fluxo Integrado

A petição deixa de ser um texto isolado e passa a ser um **Documento do Processo com Ciclo de Vida**, cujo status é sincronizado com a execução da tarefa na Fila de Trabalho.

1.  **Gatilho:** Uma tarefa é iniciada na Fila de Trabalho.
2.  **Ação:** O advogado gera a petição a partir de um modelo sugerido.
3.  **Vínculo:** O sistema cria um registro que une `Processo` + `Tarefa` + `Documento`.
4.  **Ciclo de Vida:** O status do documento reflete a etapa atual da tarefa (Elaboração, Revisão, Finalizado).

---

## 2. Reestruturação de Tabelas e Vínculos

Para garantir a rastreabilidade total, a tabela de petições finalizadas (ou documentos gerados) deve ser expandida:

### Tabela: `Peticionamento_Finalizado` (ou `Processo_Documentos_Gerados`)
| Campo | Descrição | Motivo |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único. |
| `processo_id` | FK -> `processos` | Vínculo com a pasta do processo. |
| `tarefa_id` | FK -> `tarefas` | **(Novo)** Vínculo direto com a execução na Fila. |
| `modelo_id` | FK -> `Modelos_Peticao` | Rastrear qual template originou a peça. |
| `conteudo` | TEXT/HTML | Conteúdo editado pelo advogado. |
| `status` | ENUM | Reflete o estado atual (Rascunho, Revisão, Finalizado). |
| `usuario_id` | FK -> `users` | Autor da última alteração. |
| `processo_doc_id` | FK -> `processo_doc` | **(Novo)** Vínculo com a estrutura oficial de documentos do processo. |

---

## 3. Sincronização de Status (Tarefa ↔ Petição)

O status da petição no processo deve ser alterado automaticamente conforme o avanço na Fila de Trabalho, refletindo-se também no registro da tabela `processo_doc`:

| Status da Tarefa | Status da Petição (na Tabela de Vínculo) | Comportamento Esperado |
| :--- | :--- | :--- |
| **Aguardando** | (Não existe) | Botão "Gerar Petição" disponível na tarefa. |
| **Em Elaboração** | **Rascunho** | Registro criado na tabela de vínculo; entrada em `processo_doc` para visibilidade. |
| **Em Revisão** | **Em Revisão** | Status na tabela de vínculo atualizado; bloqueio de edição para o autor. |
| **Pronto para Protocolo** | **Aprovado** | Status na tabela de vínculo atualizado; pronto para download/envio. |
| **Protocolado** | **Finalizado** | Status na tabela de vínculo finalizado; documento em `processo_doc` arquivado. |

---

## 4. Interface de Execução (Fila de Trabalho)

A tela de execução da tarefa (`tarefasExecucao.html`) deve ser o centro da confecção:

### Opção de Gerar e Confeccionar
- **Botão Dinâmico:** Se a providência tiver modelos vinculados, exibir o botão **"Gerar Petição"** na área de conteúdo.
- **Integração com Editor:** Ao clicar, o sistema abre o editor (TinyMCE) dentro do contexto da tarefa, já realizando o *merge* das variáveis do processo.
- **Vínculo com Documentos:** Ao salvar a primeira versão, o sistema gera o registro na tabela intermediária (controlando o status) e cria uma entrada na tabela `processo_doc` para que a petição apareça na lista de documentos do processo.
- **Salvamento Automático:** Cada salvamento na petição atualiza o conteúdo e o status na tabela intermediária de vínculo.

### Regras de Ouro para o UX
- **Rastreabilidade:** Na ficha do processo, ao clicar no documento, deve ser possível ver: *"Gerado a partir da Tarefa #123 (Protocolar Contestação)"*.
- **Segurança:** O controle de permissões e bloqueios de edição é regido pelo status presente na tabela intermediária de vínculo.
- **Centralização:** A petição é visível como um documento do processo, mas sua inteligência de estado reside na tabela de vínculo com a tarefa.
- **Versionamento:** Se o modelo base for alterado, a petição já gerada **não** sofre alteração, preservando o trabalho já realizado pelo advogado.

---

## 5. Próximos Passos Técnicos

1.  **Migração de Banco:** 
    - Adicionar `tarefa_id`, `status` e `processo_doc_id` na tabela intermediária de petições.
2.  **Refatoração do Controller:** Ajustar o `peticaoController` para gerenciar o status na tabela intermediária e manter o ponteiro em `processo_doc`.
3.  **Update UI:** Injetar a lista de modelos sugeridos na tela de execução da tarefa.
4.  **Automação:** Criar lógica de serviço para sincronizar o status entre `tarefas` e a tabela intermediária de petições.
