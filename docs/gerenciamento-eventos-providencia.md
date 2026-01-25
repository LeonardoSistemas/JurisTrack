# Especificação de Requisitos — Gestão de Regras Jurídicas e Checklists

## 1. Objetivo do Documento

Este documento tem como finalidade:

- Formalizar a inclusão de uma nova tabela de **checklist por providência jurídica** no modelo de dados existente.
- Definir **como o usuário (administrador do escritório)** irá gerenciar:
  - Eventos processuais  
  - Mapeamento de andamentos  
  - Providências jurídicas  
  - Regras evento → providência  
  - Modelos de petição  
  - Checklists vinculados às providências  


---

## 2. Escopo

### 2.1 Incluso

- Nova tabela de checklist vinculada à `providencia_juridica`
- Definição de telas administrativas (CRUD) para:
  - `evento_processual`
  - `andamento_evento`
  - `providencia_juridica`
  - `evento_providencia`
  - `Modelos_Peticao`
  - `providencia_checklist`
- Definição de regras de validação e governança dos dados

### 2.2 Fora de Escopo (neste momento)

- Automação completa de workflows de execução do checklist por processo  
- Integração direta com tribunais  
- Edição avançada de templates com variáveis dinâmicas no MVP  

---

## 3. Nova Tabela a Ser Adicionada — Checklist por Providência

### 3.1 Justificativa

Atualmente o modelo permite sugerir **providências jurídicas**, mas não detalha **o que exatamente deve ser feito para executá-las**.

Para resolver isso, será criada uma tabela dedicada de checklist padrão por providência.

### 3.2 DDL Proposto

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
## 4. Interfaces Administrativas Necessárias (UI)
Interfaces Administrativas Necessárias (UI)

### 4.1 Tela: Eventos Processuais (CRUD)
Permitir:

- Cadastrar novos eventos (ex: INTIMAÇÃO, SENTENÇA, DESPACHO)
- Editar descrição
- Ativar/desativar eventos
- Consultar

### 4.2 Tela: Mapeamento de Andamentos → Evento
Permitir:

- Cadastrar
- Editar descrição
- Ativar/desativar
- Consultar

### 4.3 Tela: Providências Jurídicas (CRUD)
Permitir:

- Cadastrar
- Editar descrição
- Ativar/desativar
- Consultar

### 4.4 Tela: Regras Evento → Providência
Interface em formato de tabela:

Para cada evento, o usuário pode configurar:
- Providência vinculada
- Prioridade
- Gera prazo?
- Dias de prazo
- Tipo de prazo (útil/corrido/data fixa)
- Padrão (sim/não)

### 4.5 Tela: Modelos de Petição
Permitir vincular modelos a providências:

- Cadastrar
- Editar descrição
- Ativar/desativar
- Consultar

### 4.6 Tela: Checklist por Providência
Permitir vincular modelos a providências:

Para cada providência cadastrada, o usuário poderá:
- Adicionar itens de checklist
- Definir ordem
- Definir se é obrigatório
- Editar descrição

Interface sugerida:
Providência: Cumprir decisão judicial
Checklist:
- [1] Ler decisão
- [2] Separar documentos
- [3] Redigir petição
- [4] Protocolar

Botões:
- Novo item
- Editar
- Excluir
- Reordenar