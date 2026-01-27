# Tech Spec - Reestruturação de Prazos e Vínculo por Processo

## 1. Visão Geral
Esta especificação técnica detalha a reestruturação da tabela `Prazo` para remover a dependência direta da tabela `Publicacao` e estabelecer um vínculo obrigatório com a tabela `processos`. Além disso, introduz o controle de status para prazos via tabela `aux_status`.

## 2. Arquitetura e Design de Componentes

### 2.1 Modelo de Dados (Banco de Dados)
A principal mudança ocorre no schema do banco de dados (PostgreSQL/Supabase).

#### Tabela `Prazo` (Alterações)
- **Remoção**: Coluna `publicacaoid` (e seus índices/FKs associados).
- **Adição**: Coluna `processoid` (UUID ou Integer, conforme padrão da tabela `processos`), obrigatória (NOT NULL).
- **Adição**: Coluna `status_id` (UUID), obrigatória, referenciando `aux_status(id)`.
- **Índices**: Novo índice em `(tenant_id, processoid)` para otimização de consultas por processo.

#### Tabela `aux_status` (Novos Dados)
- Novo domínio: `prazo`.
- Status iniciais: `pendente` (default), `concluido`, `cancelado`.

### 2.2 Camada de Serviço (Backend)
Os serviços serão atualizados para refletir a nova estrutura de dados e garantir a integridade do vínculo com o processo.

- **`src/services/processosService.js`**:
    - Atualizar `criarPrazoManual`: Remover a criação automática de uma `Publicacao` fictícia. Inserir diretamente na tabela `Prazo` usando o `processoid`.
    - Atualizar `obterProcessoCompleto`: Alterar a query do Supabase para buscar `Prazo` na raiz do objeto `processos` (vínculo direto), removendo o aninhamento dentro de `Publicacao`.
- **`src/services/conciliacaoService.js`**:
    - Atualizar `confirmarAnaliseSimilaridade`: Ao criar o prazo após a análise, usar o `processoId` (já resolvido no fluxo) em vez de apenas o `publicacaoId`.
- **`src/services/dashboardService.js`**:
    - Refatorar `getPrazosDetalhes`: Simplificar a query para buscar prazos diretamente pelo `processoid`. Remover o join complexo via `Publicacao` para resolver o número do processo.

## 3. Interfaces e Endpoints

### 3.1 Atualização de Payloads e Consultas (API)
- **`POST /api/processos/prazo`**:
    - Alterar payload de `{ publicacaoId, ... }` para `{ processoId, ... }`.
- **`GET /api/processos/:id`**:
    - A resposta deve retornar a lista de prazos na raiz do objeto do processo, permitindo a visualização unificada de prazos manuais e automáticos.
- **`GET /api/dashboard/prazos-detalhes`**:
    - A resposta agora incluirá o `status` do prazo e o vínculo direto com o processo.

## 4. Estratégia de Migração de Dados

A migração será realizada em fases para garantir a segurança dos dados existentes:

1. **Fase 1 (Estrutura)**: Adicionar `processoid` e `status_id` como colunas anuláveis.
2. **Fase 2 (Backfill)**:
    - Preencher `processoid` em `Prazo` através de um JOIN com `Publicacao` (`Prazo.publicacaoid = Publicacao.id`).
    - Preencher `status_id` com o ID do status 'pendente' (recém-criado).
3. **Fase 3 (Limpeza)**:
    - Validar se todos os registros possuem `processoid`.
    - Tornar `processoid` e `status_id` NOT NULL.
    - Remover a coluna `publicacaoid`.

## 5. Análise de Impacto e Riscos

- **Impacto**: Melhora significativa na performance de consultas de prazos e flexibilidade para criar prazos que não se originam de publicações (ex: prazos administrativos).
- **Risco**: Prazos órfãos (sem publicação válida) durante a migração. 
    - *Mitigação*: O script de migração deve identificar e logar prazos que não possuem vínculo com processo antes de aplicar a restrição NOT NULL.

## 6. Estratégia de Testes

- **Unitários**: Atualizar `tests/unit/prazoService.test.js` e `tests/unit/conciliacaoService.test.js` para validar a criação de prazos sem `publicacaoid`.
- **Integração**: Validar o fluxo completo de criação de prazo manual via interface e conferir a persistência correta no banco.
- **Migração**: Testar o script de SQL em ambiente de staging antes da execução em produção.

## 7. Observabilidade
- Logs de erro no `conciliacaoService` e `processosService` devem capturar falhas de integridade referencial (FK de processo inexistente).

---
**Documento gerado em: `tasks/prd-reestrutura-prazo/techspec.md`**
