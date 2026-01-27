# Tasks - Reestruturação de Prazos

## 1. Banco de Dados e Migração
- [ ] **Task 1.1**: Criar script SQL para seed de status de prazo (`pendente`, `concluido`, `cancelado`) no domínio `prazo` da tabela `aux_status`.
- [ ] **Task 1.2**: Criar script de migração DDL/DML:
    - Adicionar `processoid` e `status_id` (FKs) na tabela `Prazo`.
    - Executar backfill de `processoid` via `Publicacao`.
    - Definir status default 'pendente' para prazos existentes.
    - Aplicar restrições NOT NULL e remover `publicacaoid`.

## 2. Backend (Serviços e Controllers)
- [ ] **Task 2.1**: Atualizar `src/services/processosService.js` (`criarPrazoManual`):
    - Remover criação de `Publicacao`.
    - Inserir diretamente em `Prazo` com `processoid` e `status_id`.
- [ ] **Task 2.2**: Atualizar `src/services/processosService.js` (`obterProcessoCompleto`):
    - Alterar a query para buscar `Prazo` diretamente vinculado ao `processo` (remover aninhamento em `Publicacao`).
- [ ] **Task 2.3**: Atualizar `src/services/conciliacaoService.js` (`confirmarAnaliseSimilaridade`):
    - Ajustar query de inserção em `Prazo` para usar `processoid` e incluir `status_id`.
- [ ] **Task 2.4**: Refatorar `src/services/dashboardService.js` (`getPrazosDetalhes`):
    - Simplificar busca de prazos para usar vínculo direto com processos.
- [ ] **Task 2.5**: Atualizar `src/services/n8nService.js` se houver referências a `publicacaoid` na atualização de prazos.

## 3. Frontend e Integração
- [ ] **Task 3.1**: Atualizar `public/js/fichaProcesso.js` (`renderizarPrazos`):
    - Alterar lógica para ler prazos diretamente do objeto `processo` (não mais de dentro de `Publicacao`).
    - Atualizar a exibição para considerar o novo `status_id` vindo do banco.
- [ ] **Task 3.2**: Atualizar `public/js/fichaProcesso.js` (`salvarPrazoManual`):
    - Ajustar payload enviado para a API (enviar `processoId` em vez de depender da criação de publicação no backend).
- [ ] **Task 3.3**: Ajustar visualização de prazos no Dashboard para exibir o status real.

## 4. Testes e Validação
- [ ] **Task 4.1**: Atualizar testes unitários (`tests/unit/conciliacaoService.test.js`, etc).
- [ ] **Task 4.2**: Validar migração com dados reais em ambiente de teste.
