# Tech Spec – Amarração de Andamentos Processuais com Providências Jurídicas e Modelos de Petição

## 1. Visão técnica e objetivos
- Implementar o motor de regras no Node.js para normalizar andamentos processuais (vidos do N8N ou extração manual) em eventos jurídicos.
- Sugerir automaticamente providências, prazos e modelos de petição baseados em mapeamentos pré-configurados.
- Disponibilizar uma interface (Modal de Análise) para que o advogado valide ou altere as sugestões antes de efetivá-las.
- Registrar auditoria completa das sugestões versus decisões tomadas.

## 2. Arquitetura e componentes
- **Backend (Node.js/Express)**:
  - `src/routes/eventoProvidenciaRoute.js`: Endpoints para consulta de regras e confirmação de análises.
  - `src/controllers/eventoProvidenciaController.js`: Lógica de orquestração do modal de análise.
  - `src/services/eventoProvidenciaService.js`: Motor de busca de match (exato/contém) e cálculo de sugestões.
  - `src/services/prazoService.js`: (Novo ou estendido) Lógica para cálculo de datas de vencimento com base em dias úteis/corridos.
- **Banco de Dados (Supabase/PostgreSQL)**:
  - Novas tabelas para armazenamento de regras e auditoria.
  - Integração com a tabela existente `similaridade_itens` (campo `tipo_andamento`) e `Publicacao`.
- **Frontend (Vanilla JS/HTML)**:
  - `public/js/analisePublicacao.js`: Gerencia a lógica do Modal de Análise.
  - Inclusão do botão "Analisar" em `public/html/upload.html`.

## 3. Modelo de dados (Supabase)
As tabelas seguirão o padrão `snake_case` e estarão no esquema `public`.

### 3.1 `evento_processual`
Classificação jurídica normalizada.
- `id`: uuid PK
- `nome`: text (ex: "INTIMAÇÃO", "SENTENÇA")
- `descricao`: text
- `ativo`: boolean (default true)
- `tenant_id`: uuid FK tenants(id)

### 3.2 `andamento_evento`
Mapeia o `tipo_andamento` (bruto/IA) para um `evento_processual`.
- `id`: uuid PK
- `andamento_descricao`: text (o valor vindo do campo `tipo_andamento`)
- `evento_id`: uuid FK evento_processual(id)
- `tipo_match`: text (check 'exato', 'contem')
- `tenant_id`: uuid FK tenants(id)

### 3.3 `providencia_juridica`
Ações que o advogado pode tomar.
- `id`: uuid PK
- `nome`: text
- `descricao`: text
- `exige_peticao`: boolean (default false)
- `ativo`: boolean (default true)
- `tenant_id`: uuid FK tenants(id)

### 3.4 `evento_providencia`
Regras de negócio que ligam Eventos a Providências.
- `id`: uuid PK
- `evento_id`: uuid FK evento_processual(id)
- `providencia_id`: uuid FK providencia_juridica(id)
- `prioridade`: int
- `gera_prazo`: boolean
- `prazo_dias`: int
- `tipo_prazo`: text (check 'util', 'corrido', 'data_fixa')
- `padrao`: boolean (apenas uma por evento)
- `observacao_juridica`: text
- `tenant_id`: uuid FK tenants(id)

### 3.5 `modelo_peticao`
- `id`: uuid PK
- `nome`: text
- `providencia_id`: uuid FK providencia_juridica(id)
- `texto_template`: text
- `variaveis`: jsonb
- `ativo`: boolean
- `tenant_id`: uuid FK tenants(id)

### 3.6 `auditoria_sugestao`
- `id`: uuid PK
- `publicacao_id`: uuid (ID da tabela Publicacao ou similaridade_itens)
- `evento_sugerido_id`: uuid FK evento_processual(id)
- `providencia_sugerida_id`: uuid FK providencia_juridica(id)
- `prazo_sugerido`: jsonb (dias, tipo)
- `decisao_final_json`: jsonb (o que o usuário salvou)
- `usuario_id`: uuid FK users(id)
- `created_at`: timestamp

## 4. Fluxo de normalização e sugestão (Node.js)
1. **Entrada**: Recebe o `id` do item em `similaridade_itens`.
2. **Busca de Evento**:
   - Pega o `tipo_andamento` do item.
   - Busca em `andamento_evento` onde `tipo_match='exato'` e `andamento_descricao = tipo_andamento`.
   - Se não achar, busca onde `tipo_match='contem'` e `tipo_andamento` contém `andamento_descricao`.
   - Se não achar, retorna `EVENTO_NAO_CLASSIFICADO`.
3. **Busca de Providências**:
   - Lista todas as `providencia_juridica` ligadas ao `evento_id` via `evento_providencia`.
   - Marca como principal a que tiver `padrao=true`.
4. **Cálculo de Sugestões**:
   - **Prazo**: Se `gera_prazo=true`, calcula a data sugerida usando a `data_publicacao` e `prazo_dias` (utilizando `addBusinessDays` para prazos úteis).
   - **Modelo**: Se `providencia.exige_peticao=true`, busca o primeiro `modelo_peticao` ativo.

## 5. Endpoints e contratos

### `GET /api/analise/sugestao/:idItem`
Retorna as sugestões para o item de publicação.
- **Response**:
```json
{
  "evento": { "id": "...", "nome": "INTIMACAO" },
  "providencia_padrao": { 
    "id": "...", 
    "nome": "Apresentar Contestação",
    "prazo_sugerido": { "dias": 15, "tipo": "util", "data_vencimento": "2026-02-10" },
    "modelo_sugerido": { "id": "...", "nome": "Modelo Base" }
  },
  "alternativas": [ ... ]
}
```

### `POST /api/analise/confirmar`
Salva a decisão do advogado.
- **Payload**: `{ idItem, evento_id, providencia_id, prazo_final, modelo_id, observacao }`
- **Ações**: 
  1. Cria registro em `auditoria_sugestao`.
  2. Atualiza status em `similaridade_itens` para 'analisado'.
  3. (Opcional) Cria registro na tabela `Prazo` e `Andamento` do processo.

## 6. Frontend (Modal de Análise)
- **Interface**:
  - Cabeçalho com Número do Processo e Data.
  - Área de texto scrollable com o `texto_integral` da publicação.
  - Formulário lateral/inferior:
    - Select de **Evento** (pré-selecionado).
    - Select de **Providência** (ao trocar, atualiza dinamicamente prazos e modelos).
    - Input de **Data de Prazo** (com calendário).
    - Select de **Modelo de Petição**.
- **UX**: Botão "Salvar e Próximo" para agilizar a triagem de múltiplos itens.

## 7. Regras de negócio e segurança
- **Isolamento e Segurança**: Toda a lógica de segurança e isolamento por `tenant_id` deve ser implementada no **Backend (Node.js)**. O Supabase será utilizado apenas como persistência de dados, sem o uso de RLS (Row Level Security).
- **Consultas**: Todas as queries enviadas ao banco de dados devem incluir explicitamente o filtro por `tenant_id`.
- **Flexibilidade**: O usuário sempre pode trocar o evento e a providência, ignorando a sugestão da IA/Regras.
- **Prazos**: O sistema deve alertar se uma data de prazo for retroativa, mas permitir salvar.

## 8. Observabilidade e logs
- Log de "Miss" de normalização: quando um `tipo_andamento` não encontra match, logar para que o Admin possa criar novas regras.
- Auditoria: `auditoria_sugestao` é a fonte primária para medir a assertividade das sugestões.

## 9. Migração e seed
- Criar script SQL para as tabelas mencionadas na seção 3.
- Script de Seed inicial com regras básicas (ex: "Intimação" -> "Analisar Intimação", 15 dias úteis).

## 10. Estratégia de testes
- **Unitários**: Testar a lógica de match em `eventoProvidenciaService.js` com diferentes strings de `tipo_andamento`.
- **Integração**: Validar o cálculo de prazos úteis vs corridos.
- **Manual**: Testar o fluxo completo desde o upload até o salvamento no modal.

## 11. Riscos e mitigação
- **Ambiguidade**: Diferentes tribunais podem usar termos similares para eventos distintos. *Mitigação*: Permitir que o mapeamento considere o tribunal (fase pós-MVP).
- **Prazos**: Falha no cálculo de feriados. *Mitigação*: Exibir claramente que a data é uma sugestão e deve ser conferida.
