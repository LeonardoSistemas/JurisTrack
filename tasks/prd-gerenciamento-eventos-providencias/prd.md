# PRD - Gerenciamento de Eventos e Providências Jurídicas

## 1. Objetivo
Formalizar a estrutura de dados e as interfaces administrativas para que o escritório possa configurar o mapeamento de eventos processuais para providências jurídicas, incluindo modelos de petição e checklists padronizados. Isso visa garantir a padronização operacional e reduzir erros no cumprimento de prazos.

## 2. Contexto e Problema
Atualmente, o sistema permite sugerir providências, mas não oferece um guia detalhado (checklist) do que deve ser feito para executá-las, nem permite uma gestão centralizada e flexível das regras de automação de prazos e vínculos de modelos de petição.

## 3. Usuários e Histórias de Usuário
- **Administrador/Usuário Geral:** "Como usuário do sistema, desejo cadastrar eventos e vinculá-los a providências com checklists e modelos de petição, para que a equipe operacional siga um padrão de execução."

## 4. Requisitos Funcionais

### 4.1 Gestão de Eventos e Andamentos
1. **RF01 - CRUD de Eventos Processuais:** O sistema deve permitir cadastrar, editar, ativar/desativar e consultar eventos (ex: INTIMAÇÃO, SENTENÇA).
2. **RF02 - Mapeamento de Andamentos:** O sistema deve permitir mapear textos de andamentos vindos dos tribunais para os eventos internos cadastrados.

### 4.2 Gestão de Providências e Regras
3. **RF03 - CRUD de Providências Jurídicas:** Cadastro de ações a serem tomadas (ex: Cumprir Decisão, Interpor Recurso).
4. **RF04 - Configuração de Regras (Evento -> Providência):** Interface para vincular um Evento a uma Providência, definindo:
   - Prioridade.
   - Se gera prazo.
   - Quantidade de dias e tipo de prazo (Útil/Corrido).
   - Se é a providência padrão para aquele evento.

### 4.3 Modelos e Checklists
5. **RF05 - Vínculo de Modelos de Petição:** Permitir associar modelos de documentos a uma providência jurídica.
6. **RF06 - Checklist por Providência:** Para cada providência, permitir cadastrar itens de checklist:
   - Campos: Título, Descrição, Ordem (numérica), Obrigatório (Sim/Não).
   - Formato: Apenas texto com checkbox para marcação.

## 5. Requisitos Não Funcionais
1. **RNF01 - Interface:** Utilizar Bootstrap para os componentes de interface.
2. **RNF02 - Segurança:** Todas as tabelas devem respeitar o isolamento por `tenant_id`.
3. **RNF03 - Performance:** Índices nas chaves estrangeiras e campos de busca frequente (ex: `tenant_id`, `providencia_id`).

## 4. Definição de Dados (DDL)

```sql
create table if not exists public.providencia_checklist (
  id uuid primary key default gen_random_uuid(),
  providencia_id uuid not null 
    references public.providencia_juridica(id) on delete cascade,
  ordem int not null,
  titulo text not null,
  descricao text,
  obrigatorio boolean not null default true,
  tenant_id uuid not null 
    references public.tenants(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists providencia_checklist_providencia_idx
  on public.providencia_checklist (tenant_id, providencia_id);
```

## 5. Fora de Escopo
- Automação de workflows de execução (baixa de checklist no processo).
- Edição dinâmica de variáveis nos modelos de petição.
- Drag & Drop para reordenação (será via campo numérico).

## 6. Critérios de Aceite
- [ ] É possível criar uma regra onde o evento "SENTENÇA" gera a providência "INTERPOR RECURSO" com 15 dias úteis.
- [ ] É possível adicionar 5 itens de checklist a uma providência e visualizar a ordem correta.
- [ ] O sistema impede a visualização de dados de outros tenants.
