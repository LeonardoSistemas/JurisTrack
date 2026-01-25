# Tech Spec - Gerenciamento de Eventos, Providências e Checklists Jurídicos

## 1. Visão Geral
Esta especificação técnica detalha a implementação das interfaces administrativas e da lógica de persistência para o gerenciamento de eventos processuais, providências jurídicas e seus respectivos checklists e modelos de petição. O objetivo é permitir que os administradores de cada tenant configurem regras de automação e padronização operacional.

## 2. Arquitetura e Componentes

### 2.1 Backend (Node.js/Express)
Para manter o desacoplamento solicitado, serão criados novos arquivos de rotas, controladores e serviços:

- **Rotas**: 
  - `src/routes/configuracaoEventoRoute.js`: Endpoints para CRUD de `evento_processual` e `andamento_evento`.
  - `src/routes/configuracaoProvidenciaRoute.js`: Endpoints para CRUD de `providencia_juridica`, `providencia_checklist` e vínculos com modelos.
- **Controllers**:
  - `src/controllers/configuracaoEventoController.js`
  - `src/controllers/configuracaoProvidenciaController.js`
- **Services**:
  - `src/services/configuracaoEventoService.js`
  - `src/services/configuracaoProvidenciaService.js`

### 2.2 Frontend (Vanilla JS/Bootstrap)
- **Páginas (HTML)**:
  - `public/html/eventos.html`: Gestão de eventos e mapeamento de andamentos.
  - `public/html/providencias.html`: Gestão de providências, checklists e modelos.
- **Scripts (JS)**:
  - `public/js/eventos.js`
  - `public/js/providencias.js`
- **Componentes**:
  - Atualização do `public/js/components/sidebar.js` para incluir o novo menu "Configurações Jurídicas" com submenus.

## 3. Modelo de Dados (PostgreSQL/Supabase)

### 3.1 Novas Tabelas e Alterações

#### `providencia_checklist` (Conforme PRD)
```sql
create table if not exists public.providencia_checklist (
  id uuid primary key default gen_random_uuid(),
  providencia_id uuid not null references public.providencia_juridica(id) on delete cascade,
  ordem int not null,
  titulo text not null,
  descricao text,
  obrigatorio boolean not null default true,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

#### `providencia_modelo` (Tabela Intermediária para Múltiplos Modelos)
```sql
create table if not exists public.providencia_modelo (
  id uuid primary key default gen_random_uuid(),
  providencia_id uuid not null references public.providencia_juridica(id) on delete cascade,
  modelo_id uuid not null references public."Modelos_Peticao"(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(providencia_id, modelo_id, tenant_id)
);
```

### 3.2 Tabelas Existentes (Reutilizadas)
- `evento_processual`: Cadastro de tipos de eventos (ex: SENTENÇA).
- `andamento_evento`: Mapeamento de strings de tribunais para eventos internos.
- `providencia_juridica`: Cadastro de ações (ex: Interpor Recurso).
- `evento_providencia`: Regras de ligação entre Evento e Providência.
- `Modelos_Peticao`: Tabela de templates de documentos.

## 4. Endpoints e Contratos

### 4.1 Eventos e Mapeamentos
- `GET /api/config/eventos`: Lista eventos do tenant.
- `POST /api/config/eventos`: Cria novo evento.
- `PUT /api/config/eventos/:id`: Atualiza evento.
- `GET /api/config/eventos/mapeamentos`: Lista regras de `andamento_evento`.
- `POST /api/config/eventos/mapeamentos`: Cria novo mapeamento.

### 4.2 Providências e Checklists
- `GET /api/config/providencias`: Lista providências.
- `POST /api/config/providencias`: Cria providência.
- `GET /api/config/providencias/:id/checklist`: Lista itens do checklist.
- `POST /api/config/providencias/:id/checklist`: Adiciona item ao checklist.
- `PUT /api/config/providencias/checklist/:itemId`: Atualiza item (incluindo `ordem`).
- `DELETE /api/config/providencias/checklist/:itemId`: Remove item.

### 4.3 Vínculo de Modelos
- `GET /api/config/providencias/:id/modelos`: Lista modelos vinculados.
- `POST /api/config/providencias/:id/modelos`: Vincula um modelo (`modelo_id`).
- `DELETE /api/config/providencias/:id/modelos/:modeloId`: Remove vínculo.

## 5. Fluxos de Trabalho Técnicos

### 5.1 Reordenação de Checklist
A reordenação será feita via campo numérico `ordem`. O frontend enviará o novo valor e o backend garantirá a integridade dentro do `tenant_id`.

### 5.2 Isolamento por Tenant
Todas as queries utilizarão o middleware `ensureTenantAuthorization` e o helper `withTenantFilter` ou `injectTenant` para garantir que um usuário só acesse/modifique dados do seu próprio `tenant_id`.

## 6. Estratégia de Testes
- **Unitários**: Validar lógica de CRUD nos serviços.
- **Integração**: Testar endpoints com diferentes `tenant_id` para garantir isolamento.
- **Interface**: Validar dinamismo dos formulários de checklist e busca de modelos.

## 7. Observabilidade
- Logs de erro detalhados em cada operação de escrita.
- Monitoramento de "Miss" em mapeamentos de andamentos para sugerir novas regras ao administrador.
