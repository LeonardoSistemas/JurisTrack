# PRD – Amarração de Andamentos Processuais com Providências Jurídicas e Modelos de Petição

## 1. Visão Geral e Objetivos
O objetivo deste projeto é otimizar a triagem de publicações judiciais para pequenos e médios escritórios de advocacia. O sistema deve interpretar andamentos brutos, normalizá-los em eventos jurídicos e sugerir automaticamente a providência a ser tomada, o prazo processual e o modelo de petição adequado, mantendo sempre o controle final nas mãos do advogado.

## 2. Escopo
### 2.1 Incluso
- **Normalização**: Mapeamento de descrições brutas de andamentos para eventos processuais normalizados.
- **Sugestão de Providência**: Recomendação de ação jurídica baseada no evento identificado.
- **Sugestão de Prazo**: Cálculo sugerido de dias e tipo de prazo (útil/corrido).
- **Sugestão de Modelo**: Indicação de template de petição para providências que exijam protocolo.
- **Interface de Análise**: Botão "Analisar" na tela de upload e modal para revisão/edição das sugestões.
- **Auditoria**: Log completo das sugestões feitas vs. decisões tomadas pelo usuário.
- **Tratamento de Exceções**: Classificação de eventos não identificados como "Pendente - Alta Prioridade".

### 2.2 Fora de Escopo
- IA Generativa para tomada de decisão jurídica.
- Protocolo automático de petições nos tribunais.
- Cálculo de feriados locais/municipais (apenas feriados nacionais/padrão).
- Segmentação específica por tribunal ou tipo de procedimento neste MVP.

## 3. Usuários e Perfis
- **Advogado**: Usuário único no MVP que realiza o upload das publicações, revisa as sugestões no modal e confirma as ações no sistema.

## 4. Fluxo Principal (Página de Upload)
1. O advogado acessa a página `upload.html` e envia um PDF de publicações.
2. O backend processa o arquivo e identifica as publicações.
3. Para cada publicação identificada, o sistema:
    - Busca correspondência na tabela `andamento_evento`.
    - Identifica o `evento_processual`.
    - Busca a `providencia_juridica` padrão e alternativas na tabela `evento_providencia`.
4. Na lista de publicações extraídas, cada card exibe um botão **"Analisar"**.
5. Ao clicar em "Analisar", abre-se um **Modal de Análise**:
    - Exibe o texto original da publicação.
    - Exibe a Providência Sugerida (editável).
    - Exibe o Prazo Sugerido (editável).
    - Exibe o Modelo de Petição Sugerido (se aplicável, editável).
6. O advogado confirma ou altera as informações.
7. Ao salvar, o sistema registra o log de auditoria e vincula a providência ao processo.

## 5. Requisitos Funcionais (RF)
1. **RF1 - Normalização de Andamentos**: O sistema deve comparar o tipo_andamento da publicação com padrões cadastrados (exato ou contém) para classificar o evento.
2. **RF2 - Evento Não Classificado**: Caso não haja match, o evento deve ser definido como `EVENTO_NAO_CLASSIFICADO` e marcado com alta prioridade para o usuário.
3. **RF3 - Sugestão de Providência**: O sistema deve sugerir a providência marcada como `padrao` para o evento identificado.
4. **RF4 - Sugestão de Prazo**: O sistema deve sugerir o prazo (dias e tipo) configurado na regra `evento_providencia`.
5. **RF5 - Sugestão de Modelo**: Se a providência exigir petição, o sistema deve sugerir o primeiro modelo ativo vinculado a ela.
6. **RF6 - Modal de Revisão**: Deve permitir ao usuário alterar qualquer campo sugerido antes da confirmação final.
7. **RF7 - Log de Auditoria**: O sistema deve salvar: `id_publicacao`, `sugestao_original` (evento, providência, prazo), `decisao_usuario` e `timestamp`.
8. **RF8 - Gestão de Regras (Admin)**: (Backend/Seed) Tabelas de mapeamento devem ser populadas inicialmente via seed.

## 6. Requisitos Não Funcionais (RNF)
1. **RNF1 - Performance**: A busca de sugestões deve ser instantânea após a extração da publicação.
2. **RNF2 - Usabilidade**: O modal de análise deve permitir a troca de providência de forma rápida, atualizando automaticamente prazo e modelo.
3. **RNF3 - Persistência**: As decisões do usuário devem ser salvas de forma atômica com o log de auditoria.

## 7. Modelo de Dados
- `evento_processual`: (id, nome, descricao, ativo)
- `andamento_evento`: (andamento_descricao, evento_id, tipo_match)
- `providencia_juridica`: (id, nome, descricao, exige_peticao, ativo)
- `evento_providencia`: (evento_id, providencia_id, prioridade, gera_prazo, prazo_dias, tipo_prazo, exige_peticao, padrao)
- `modelo_peticao`: (id, nome, providencia_id, texto_template, variaveis, ativo)
- `auditoria_sugestao`: (id, publicacao_id, evento_sugerido_id, providencia_sugerida_id, prazo_sugerido, decisao_final_json, usuario_id, created_at)

## 8. UX/UI
- **Botão Analisar**: Ícone de lupa ou check no card da publicação na `upload.html`.
- **Modal**: Dividido em "Texto da Publicação" (esquerda/topo) e "Sugestões de Ação" (direita/baixo).
- **Badges**: Uso de cores (vermelho para pendente, azul para classificado).

## 9. Métricas de Sucesso
- **Taxa de Assertividade**: % de vezes que o advogado aceitou a providência sugerida sem alterações.
- **Tempo de Triagem**: Redução no tempo entre o upload do PDF e a definição de providências para todos os processos.

## 10. Riscos e Dependências
- Dependência da qualidade da extração de texto do PDF.
- Risco de prazos incorretos se a base de regras `evento_providencia` não estiver bem curada.
- Premissa: O sistema não deve impor prazos bloqueantes sem revisão humana.
