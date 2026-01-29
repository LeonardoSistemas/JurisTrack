# 📄 Documento de Requisitos  
## MVP – Amarração de Andamentos Processuais com Providências Jurídicas e Modelos de Petição

---

## 1. Objetivo

Definir os requisitos funcionais e estruturais para permitir que o sistema:

- Interprete andamentos processuais capturados dos tribunais
- Normalize esses andamentos em eventos processuais
- Sugira providências jurídicas ao advogado
- Sugira prazos processuais
- Sugira modelos de petição (texto fixo com variáveis)
- Permita validação e ajuste manual pelo usuário

O MVP é direcionado a **pequenos e médios escritórios de advocacia**, com foco em **processos cíveis**.

---

## 2. Escopo do MVP

### 2.1 Incluído
- Normalização de andamentos processuais
- Sugestão de providência jurídica
- Sugestão de prazo
- Sugestão de modelo de petição
- Edição manual pelo advogado

### 2.2 Fora do escopo (neste momento)
- Segmentação por tribunal
- Segmentação por procedimento
- IA generativa para decisão jurídica
- Protocolo automático de petições
- Cálculo avançado de prazos com feriados locais

---

## 3. Conceitos Fundamentais (Glossário)

### 3.1 Andamento Processual
Registro bruto publicado pelo tribunal, sem interpretação jurídica.

**Exemplos:**
- Intimação eletrônica  
- Despacho proferido  
- Sentença de mérito  

> Essa camada já existe no sistema.

---

### 3.2 Evento Processual
Classificação jurídica normalizada de um ou mais andamentos processuais que possuem o mesmo efeito prático.

**Exemplos:**
- INTIMAÇÃO  
- SENTENÇA  
- DESPACHO  
- AUDIÊNCIA DESIGNADA  
- EMENDA DA INICIAL  

---

### 3.3 Providência Jurídica
Ação esperada do advogado ou do escritório diante de um evento processual.

**Exemplos:**
- Analisar intimação  
- Apresentar contestação  
- Interpor recurso  
- Comparecer à audiência  
- Cumprir decisão  
- Apenas acompanhar  

---

### 3.4 Modelo de Petição
Documento padronizado (texto fixo com variáveis) associado a uma providência jurídica.

**Exemplos:**
- Contestação  
- Manifestação simples  
- Emenda à inicial  
- Apelação  

---

## 4. Modelagem de Dados (Requisitos Estruturais)

### 4.1 andamento_processual (existente)

Tabela que armazena os dados brutos capturados do tribunal.

**Campos mínimos:**
- id  
- descricao  
- data_publicacao  
- processo_id  

---

### 4.2 evento_processual

Tabela responsável pela normalização jurídica dos andamentos.

**Campos:**
- id  
- nome  
- descricao  
- ativo (boolean)  

**Exemplos de registros:**
- INTIMACAO  
- SENTENCA  
- DESPACHO  
- AUDIENCIA  
- EMENDA_INICIAL  

---

### 4.3 andamento_evento

Tabela de mapeamento entre andamentos processuais e eventos processuais.

**Campos:**
- andamento_descricao (string)  
- evento_id (FK → evento_processual)  
- tipo_match (exato | contem)  

---

### 4.4 providencia_juridica

Tabela que representa as ações jurídicas possíveis.

**Campos:**
- id  
- nome  
- descricao  
- exige_peticao (boolean)  
- ativo (boolean)  

---

### 4.5 evento_providencia

Tabela central de regras de negócio (relacionamento muitos-para-muitos).

**Campos obrigatórios:**
- evento_id (FK)  
- providencia_id (FK)  
- prioridade (int)  
- gera_prazo (boolean)  
- prazo_dias (int, opcional)  
- tipo_prazo (util | corrido | data_fixa)  
- exige_peticao (boolean)  
- padrao (boolean)  
- observacao_juridica (text, opcional)  

---

### 4.6 modelo_peticao

Tabela que armazena os modelos de petição.

**Campos:**
- id  
- nome  
- providencia_id (FK → providencia_juridica)  
- texto_template  
- variaveis (json)  
- ativo (boolean)  

---

## 5. Regras de Negócio

### 5.1 Normalização de Andamento
- Todo andamento processual deve ser associado a um evento processual
- Caso não haja correspondência, classificar como `EVENTO_NAO_CLASSIFICADO`

---

### 5.2 Sugestão de Providência
- Um evento processual pode ter múltiplas providências
- Apenas uma providência deve ser marcada como padrão
- As demais devem ser exibidas como alternativas ao usuário

---

### 5.3 Sugestão de Prazo
- O prazo deve ser sugerido com base na tabela `evento_providencia`
- O prazo deve ser sempre editável pelo usuário
- Caso não haja prazo, indicar explicitamente “Sem prazo identificado”

---

### 5.4 Sugestão de Petição
- Apenas se `exige_peticao = true`
- O modelo sugerido deve ser o primeiro modelo ativo da providência
- O usuário pode alterar o modelo antes da geração

---

## 6. Fluxo Funcional do Sistema

1. Sistema captura a publicação
2. Identifica o andamento processual
3. Mapeia o andamento para um evento processual
4. Busca as providências jurídicas relacionadas
5. Sugere ao usuário:
   - Providência padrão
   - Prazo (se aplicável)
   - Modelo de petição (se aplicável)
6. Usuário confirma ou altera as sugestões
7. Sistema registra o andamento interno do processo

---

## 7. Princípios de UX (Obrigatórios)

- Nenhuma petição deve ser gerada automaticamente
- Nenhum prazo deve ser imposto sem possibilidade de edição
- O sistema deve deixar claro que se trata de uma sugestão
- A troca de providência deve ser simples e rápida

---

## 8. Critérios de Sucesso do MVP

- Advogado entende facilmente a sugestão do sistema
- Advogado consegue corrigir sugestões com poucos cliques
- Redução significativa do tempo de triagem de publicações
- Nenhuma perda de prazo causada por automação rígida

---

## 9. Próximos Passos (Pós-MVP)

- Segmentação por tribunal
- Segmentação por procedimento
- Regras condicionais por tipo de ação
- Uso de IA para refinamento das sugestões jurídicas

---

## 10. Conclusão

Este MVP cria uma base jurídica sólida, confiável e escalável, evitando decisões automáticas arriscadas e permitindo evolução futura sem refatoração estrutural.
