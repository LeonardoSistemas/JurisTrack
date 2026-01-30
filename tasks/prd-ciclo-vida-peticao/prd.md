# PRD - Ciclo de Vida da Petição e Integração com Fila de Trabalho

## 1. Visão Geral
Este documento descreve a implementação da rastreabilidade e gestão do ciclo de vida de petições dentro do JurisTrack. A petição deixa de ser um registro isolado e passa a ser um documento vinculado a uma **Tarefa (Providência)** e a um **Processo**, com armazenamento físico no servidor e sincronização automática de status.

## 2. Problema e Objetivos
### Problema
Atualmente, as petições geradas manualmente não possuem um vínculo forte com as tarefas da Fila de Trabalho, dificultando o controle de quais peças foram produzidas para quais prazos e qual o estado atual de cada uma (rascunho, finalizada, etc). Além disso, o conteúdo é salvo apenas como HTML no banco de dados, sem gerar um arquivo físico rastreável na pasta do processo.

### Objetivos
*   Estabelecer vínculo direto entre `Processo` + `Tarefa` + `Documento`.
*   Automatizar a atualização de status da petição com base no avanço da tarefa.
*   Garantir que toda petição gerada seja salva fisicamente no storage do tenant.
*   Centralizar a confecção da petição na tela de execução da tarefa.

## 3. Personas e Histórias de Usuário
### Personas
*   **Advogado:** Responsável por executar tarefas e redigir as peças.
*   **Gestor Jurídico:** Precisa auditar quais documentos foram gerados por cada tarefa.

### Histórias de Usuário
1.  **Como Advogado**, quero gerar uma petição diretamente da tela de execução de uma tarefa, para que eu não precise sair do meu fluxo de trabalho.
2.  **Como Advogado**, quero que os dados do processo sejam preenchidos automaticamente no modelo selecionado, para evitar erros manuais.
3.  **Como Gestor**, quero ver na lista de documentos do processo qual tarefa originou cada petição, para garantir a rastreabilidade total.

## 4. Requisitos Funcionais

### RF001 - Reestruturação de Dados (Banco de Dados)
1.  Criar ou atualizar a tabela de vínculo (ex: `Peticionamento_Finalizado`) para incluir:
    *   `tarefa_id` (FK -> tarefas)
    *   `processo_id` (FK -> processos)
    *   `processo_doc_id` (FK -> processo_doc)
    *   `status` (ENUM: 'Rascunho', 'Em Revisão', 'Aprovado', 'Finalizado')
    *   `caminho_arquivo` (VARCHAR) - Caminho no storage.

### RF002 - Interface de Execução (Fila de Trabalho)
1.  Na tela `tarefasExecucao.html`, logo abaixo do card de ações de status, adicionar o botão **"Gerar Petição"**.
2.  O botão deve abrir o editor (TinyMCE) carregando os modelos vinculados à providência da tarefa.
3.  Realizar o merge automático das variáveis do processo (já existente no sistema).

### RF003 - Salvamento Físico e Storage
1.  Ao salvar a petição em estado de 'Rascunho' ou 'Em Revisão', o sistema deve salvar o conteúdo HTML.
2.  **Quando o status da tarefa mudar para 'Pronto para Protocolo', o sistema deve gerar automaticamente um arquivo PDF da petição.**
3.  O arquivo (HTML ou PDF) deve ser salvo no servidor seguindo o padrão: `storage/[tenant_id]/[numero_processo]/[nome_arquivo]`.
4.  Criar/atualizar o registro correspondente na tabela `processo_doc` para que a petição apareça na aba de documentos do processo.

### RF004 - Sincronização de Status
1.  Sincronizar o status da petição com o status da tarefa:
    *   Tarefa 'Em Elaboração' -> Petição 'Rascunho'.
    *   Tarefa 'Pronto para Protocolo' -> Petição 'Aprovado'.
    *   Tarefa 'Protocolado' -> Petição 'Finalizado'.

### RF005 - Histórico e Exclusão
1.  Se uma petição for removida do vínculo do processo, o registro em `processo_doc` deve ser removido, mas o histórico da petição deve ser mantido para fins de auditoria.

## 5. Requisitos Não Funcionais
*   **Segurança:** O acesso aos arquivos deve respeitar o `tenant_id`.
*   **Integridade:** O vínculo entre tarefa e petição deve ser único (uma petição principal por tarefa).

## 6. Regras de Negócio
1.  O advogado pode editar a petição livremente ou começar do zero no editor.
2.  Não haverá bloqueio de edição por permissionamento nesta fase inicial.
3.  Alterações no modelo base após a geração da petição não devem afetar o documento já criado (versionamento estático).

## 7. Critérios de Aceite
*   [ ] O botão "Gerar Petição" aparece apenas em tarefas que permitem geração de documento.
*   [ ] O arquivo físico é criado corretamente na pasta do tenant/processo.
*   [ ] A petição aparece na lista de documentos do processo com referência à tarefa de origem.
*   [ ] O status da petição muda automaticamente ao alterar o status da tarefa.
