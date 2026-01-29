---
name: Reestruturar prazos
overview: Reestruturar a tabela Prazo para vínculo por processo, migrar dados existentes via Publicacao.processoid e atualizar criação/consulta de prazos para usar processoid em todo o fluxo.
---

# Plano de reestruturação de Prazo

## Objetivo

Migrar o vínculo de prazos de publicação para processo, removendo `publicacaoid` da tabela `Prazo`, adicionando `processoid` obrigatório e atualizando todos os fluxos de criação/consulta para usar processo.

## Escopo principal

- **Schema do banco**: alterar tabela `Prazo` (remover `publicacaoid`, adicionar `processoid` obrigatório, índices e FK), com migração de dados legados via `Publicacao.processoid`.
- **Status de prazo**: adicionar coluna `status_id` em `Prazo` e seed de status no `aux_status` com domínio de prazo.
- **Serviços/Controllers**: atualizar criação e leitura de prazos em serviços e rotas para usar `processoid`.
- **Dashboard e consultas**: ajustar contagens e listagens que hoje dependem de `publicacaoid`.

## Passos propostos

1) **Confirmar estrutura atual de `Prazo` e relações**

- Localizar DDL/SQL da tabela `Prazo` e suas FKs atuais.
- Identificar todas as referências a `publicacaoid` no backend e no frontend.

2) **Planejar status de prazo**

- Definir domínio no `aux_status` para prazo (ex.: `prazo`).
- Criar script de seed com valores mínimos (`pendente`, `concluido`) para o domínio.
- Adicionar `status_id` em `Prazo` com FK para `aux_status`.

3) **Planejar a migração de dados**

- Script SQL para:
 - adicionar coluna `processoid` (temporária para backfill),
 - preencher `processoid` via join `Prazo.publicacaoid -> Publicacao.processoid`,
 - validar nulos e inconsistências,
 - preencher `status_id` default (ex.: `pendente`) para prazos existentes,
 - tornar `processoid` NOT NULL,
 - tornar `status_id` NOT NULL (após seed),
 - remover `publicacaoid` e índices relacionados,
 - criar índice/fk em `processoid`.
- Definir comportamento para prazos sem publicação válida (log e fallback/manual).

4) **Atualizar criação de prazos**

- Fluxo de prazo manual: trocar criação de `Publicacao` manual por criação direta do `Prazo` com `processoid`.
- Fluxo de conciliação/análise: inserir `Prazo` com `processoid` (derivado do processo da publicação) e remover dependência do `publicacaoid`.
- Fluxo N8N: localizar ou ajustar para buscar `Prazo` por `processoid` (ou outro identificador) em vez de `publicacaoid`.
- Definir `status_id` inicial como `pendente`.

5) **Atualizar consultas/listagens de prazos**

- Dashboard de prazos: buscar prazos pelo processo, sem `publicacaoid`, e montar o número do processo via join direto.
- Outras listagens/queries que usam `publicacaoid` para resolver processo.
- Opcional: filtrar/ordenar prazos por status conforme necessidade.

6) **Atualizar modelos e payloads de API**

- Atualizar contratos de API que recebem/enviam `publicacaoid` para usar `processoid`.
- Ajustar validações e testes unitários relevantes.

7) **Validação final**

- Verificar criação de prazo manual, conciliação e dashboard com dados reais/seed.
- Conferir integridade: não existem prazos sem `processoid` após migração.
- Conferir status padrão aplicado e transições possíveis.

## Arquivos candidatos a ajuste

- Schema/migração SQL (localizar DDL de `Prazo` em `scripts/sql/**/*.sql`)
- Seed de status em `aux_status` (script SQL novo ou existente em `scripts/sql/**/*.sql`)
- Criação de prazo manual: [`C:/Users/Usuario/Documents/Desenvolvimento/nexon/projetos/JurisTrack_CloudBrasil/JurisTrack/src/services/processosService.js`](C:/Users/Usuario/Documents/Desenvolvimento/nexon/projetos/JurisTrack_CloudBrasil/JurisTrack/src/services/processosService.js)
- Controller da rota de prazo: [`C:/Users/Usuario/Documents/Desenvolvimento/nexon/projetos/JurisTrack_CloudBrasil/JurisTrack/src/controllers/processosController.js`](C:/Users/Usuario/Documents/Desenvolvimento/nexon/projetos/JurisTrack_CloudBrasil/JurisTrack/src/controllers/processosController.js)
- Fluxo de conciliação/criação de tarefas: [`C:/Users/Usuario/Documents/Desenvolvimento/nexon/projetos/JurisTrack_CloudBrasil/JurisTrack/src/services/conciliacaoService.js`](C:/Users/Usuario/Documents/Desenvolvimento/nexon/projetos/JurisTrack_CloudBrasil/JurisTrack/src/services/conciliacaoService.js)
- Dashboard de prazos: [`C:/Users/Usuario/Documents/Desenvolvimento/nexon/projetos/JurisTrack_CloudBrasil/JurisTrack/src/services/dashboardService.js`](C:/Users/Usuario/Documents/Desenvolvimento/nexon/projetos/JurisTrack_CloudBrasil/JurisTrack/src/services/dashboardService.js)
- N8N: [`C:/Users/Usuario/Documents/Desenvolvimento/nexon/projetos/JurisTrack_CloudBrasil/JurisTrack/src/services/n8nService.js`](C:/Users/Usuario/Documents/Desenvolvimento/nexon/projetos/JurisTrack_CloudBrasil/JurisTrack/src/services/n8nService.js)

## Observações importantes

- A migração vai remover o vínculo por publicação conforme sua decisão. Precisamos validar se algum fluxo externo (ex.: integrações) depende desse campo antes de remover.
- Após a migração, todos os fluxos devem enviar/usar `processoid` para criação e consulta de prazos.
