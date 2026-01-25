# PRD - Tipo de andamento em similaridade de publicações

## 1. Visão geral e objetivo
Expor e destacar o campo `tipo_andamento` nas publicações processadas por similaridade, garantindo que o dado seja persistido e retornado pela API e mostrado com destaque na interface de conciliação (cards). O objetivo é apoiar a decisão jurídica (ex.: gerar ou não uma petição) com mais contexto, sem aumentar a complexidade da tela.

## 2. Escopo
- **Incluso**
  - Persistir `tipo_andamento` (string, opcional) nos itens de similaridade.
  - Retornar `tipo_andamento` nos endpoints que servem os itens para a conciliação.
  - Ajustar os cards de conciliação para exibir `tipo_andamento` com destaque, mantendo status, descrição do status e score.
  - Trocar o texto longo do card para `details/summary` (nativo) para deixar a tela mais limpa.
  - Renomear o item do menu principal “Upload / Início” para “Análise de publicações” (ou rótulo final escolhido).
  - Remover o item “Similaridade” do menu principal e retirar a página estática correspondente (HTML/CSS/JS).
  - Transformar a seção “Cadastros” do menu em um accordion colapsável, mantendo todos os links existentes.
- **Não incluso**
  - Validação obrigatória de `tipo_andamento`.
  - Filtros, ordenações ou buscas por `tipo_andamento`.
  - Backfill de dados históricos.
  - Alterações nas rotas de API de similaridade (mantém-se a funcionalidade atual); mudanças são visuais no menu e remoção da página estática.

## 3. Usuários e histórias
- **Operador jurídico/advogado/paralegal**: “Preciso ver o tipo de andamento junto do status de similaridade para decidir rápido se geramos petição ou descartamos, sem abrir outras telas.”

## 4. Requisitos funcionais (RF)
1. **RF1 - Persistência**: Armazenar `tipo_andamento` (string opcional) em `similaridade_itens`; valor ausente deve ser salvo como nulo, mantendo compatibilidade com payloads antigos.
2. **RF2 - Entrada API**: O endpoint `/api/publicacoes/similaridade` deve aceitar `tipo_andamento` (camelCase ou snake_case) em cada item e repassar para a persistência.
3. **RF3 - Saída API**: O endpoint de listagem de itens de similaridade por upload deve retornar `tipo_andamento` junto aos demais campos.
4. **RF4 - UI cards**: Cada card de conciliação deve exibir badge de `tipo_andamento` em destaque, além de status + descrição, score e processo/número do processo.
5. **RF5 - Texto colapsável**: O texto da publicação no card deve ser exibido via `details/summary` nativo, preservando leitura e mantendo a tela limpa.
6. **RF6 - Fallback**: Quando `tipo_andamento` não for enviado, exibir “—” no card; nenhum bloqueio de fluxo deve ocorrer.
7. **RF7 - Compatibilidade**: Payloads antigos sem o campo devem continuar funcionando sem erro, tanto no backend quanto no frontend.
8. **RF8 - Menu principal**: O item “Upload / Início” deve ser exibido como “Análise de publicações” (ou rótulo final validado) e continuar apontando para a rota atual.
9. **RF9 - Menu similaridade**: O item “Similaridade” não deve aparecer no menu; a página estática correspondente (HTML/CSS/JS) deve ser removida para evitar links órfãos.
10. **RF10 - Accordion Cadastros**: A seção “Cadastros” deve ser um accordion colapsável (fecha/abre), mantendo todos os links atuais e abrindo automaticamente quando algum link dessa seção estiver ativo.

## 5. Requisitos não funcionais (RNF)
1. **RNF1 - Performance**: Nenhuma regressão perceptível no tempo de resposta do endpoint nem no render dos cards (campo adicional é leve).
2. **RNF2 - Acessibilidade**: Uso de `details/summary` nativo; texto legível, contraste mantendo padrões atuais da UI.
3. **RNF3 - Segurança/privacidade**: Campo tratado como texto simples; não armazenar conteúdo sensível além do que já é processado nas publicações.
4. **RNF4 - Compatibilidade**: Suportar schemas já existentes; migrations idempotentes para adicionar a coluna se ausente.

## 6. Modelo de dados
- Tabela `similaridade_itens`: adicionar coluna `tipo_andamento text` (nullable). Campo também pode permanecer em `dados_originais` para rastreabilidade.
- Sem limite de tamanho configurado; espera-se strings curtas usadas pelos fluxos atuais (ex.: “Despacho”, “Sentença”, “Publicação de intimação”).

## 7. Fluxos
- **Processamento/persistência**
  1) Receber lote em `/api/publicacoes/similaridade` com itens contendo `tipo_andamento` opcional.
  2) Normalização aceita `tipo_andamento` ou `tipoAndamento`.
  3) Persistir em `similaridade_itens.tipo_andamento`; manter restante do comportamento atual.
  4) `resultado_json` e `dados_originais` permanecem para auditoria.
- **Exibição (conciliação)**
  1) UI consome `/api/similaridade/itens/:uploadId`.
  2) Cada card mostra badge de `tipo_andamento`, status + descrição, score, processo/número do processo.
  3) Texto da publicação apresentado em `details/summary`; conteúdo preserva formatação com `white-space: pre-wrap`.

## 8. Critérios de aceite
- O endpoint de similaridade aceita e não falha se `tipo_andamento` vier ou não vier no payload.
- Os itens retornados para conciliação incluem `tipo_andamento` quando presente no upload; quando ausente, UI exibe “—”.
- Cards exibem badge de `tipo_andamento` destacado sem quebrar layout em desktop; `details/summary` funciona (abre/fecha) e mantém o texto íntegro.
- Não há regressão no fluxo de conciliação (cadastro/cancelamento de itens segue funcionando).
- O menu principal mostra “Análise de publicações”, não exibe “Similaridade”, e não há links quebrados após a remoção da página estática.
- O accordion de “Cadastros” abre/fecha corretamente e permanece aberto quando o usuário está em qualquer página de cadastros.

## 9. Riscos e mitigação
- **Payloads heterogêneos**: Alguns itens podem vir sem o campo; mitigado por fallback “—”.
- **Layout em textos grandes**: Mesmo com `details/summary`, textos muito extensos podem alongar o card; mitigado por altura máxima e overflow controlado.
- **Migrations em produção**: Adição de coluna deve ser idempotente; aplicar em janela segura e monitorar.
- **Navegação**: Remoção do item/página “Similaridade” pode gerar links quebrados; validar navegação e rotas estáticas após a remoção.

## 10. Fora de escopo
- Backfill de `tipo_andamento` em itens históricos.
- Filtros/ordenadores por `tipo_andamento`.
- Tornar o campo obrigatório ou validar vocabulário fechado.

## 11. Entregáveis e rollout sugerido
1) Migration para adicionar `tipo_andamento` em `similaridade_itens`.
2) Ajuste no serviço de similaridade para persistir/retornar o campo.
3) Ajuste no front de conciliação para exibir badge e `details/summary`.
4) Ajuste do menu: renomear “Upload / Início”, remover item/página “Similaridade”, implementar accordion em “Cadastros”.
5) Smoke test: envio de lote com e sem `tipo_andamento`; inspeção dos cards e endpoints; validação da navegação no menu e do accordion de cadastros.
6) Deploy padrão (sem feature flag) após validação em staging.
