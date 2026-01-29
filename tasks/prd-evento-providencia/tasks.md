# Plano de Tarefas - Amarração de Andamentos Processuais com Providências Jurídicas e Modelos de Petição

## Contexto
- Objetivo: Otimizar a triagem de publicações judiciais sugerindo automaticamente providências, prazos e modelos de petição, mantendo o controle final com o advogado.
- PRD: tasks/prd-evento-providencia/prd.md
- Tech Spec: tasks/prd-evento-providencia/techspec.md

## Premissas e Escopo
- Inclusões: Normalização de eventos, sugestão de providência/prazo/modelo, modal de análise e log de auditoria.
- Exclusões: IA generativa para decisão, protocolo automático, feriados locais.
- Riscos conhecidos: Qualidade da extração do PDF, dependência de regras bem configuradas no banco.

## Fases sugeridas
- Fase 1: Infraestrutura de Dados e Motor de Regras (Backend)
- Fase 2: APIs e Interface de Revisão (Frontend)
- Fase 3: Integração Final, Auditoria e Validação

## Dependências globais
- Acesso ao Supabase para criação de tabelas.
- Ambiente Node.js/Express configurado.

## Lista de tarefas
| ID | Título | Depende de | Paralelizável | Entregáveis principais |
| --- | --- | --- | --- | --- |
| 1.0 | Infraestrutura de Banco de Dados | - | Sim | Tabelas e seeds no Supabase |
| 2.0 | Serviço de Motor de Regras e Prazos | 1.0 | Não | Serviços Node.js (Regras e Prazos) |
| 3.0 | Endpoints da API | 2.0 | Sim | Endpoints de sugestão e confirmação |
| 4.0 | Modal de Análise e Lógica Frontend | 3.0 | Sim | Interface do Modal e lógica JS |
| 5.0 | Integração, Auditoria e Testes | 4.0 | Não | Fluxo completo, log de auditoria e testes |

## Notas
- Critérios de numeração: X.0 tarefas principais, X.Y subtarefas.
- Sempre incluir testes como subtarefas nas tarefas relevantes.
