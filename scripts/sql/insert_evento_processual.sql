INSERT INTO evento_processual (nome, descricao, ativo, tenant_id) VALUES
('CITACAO', 'Ato pelo qual a parte ré é chamada ao processo para apresentar defesa.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('INTIMACAO', 'Comunicação oficial para que a parte, advogado ou terceiro tome ciência ou cumpra determinação judicial.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('NOTIFICACAO', 'Comunicação formal utilizada principalmente no processo do trabalho.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('CIENCIA', 'Publicação destinada apenas a dar ciência de ato processual, sem comando expresso.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),

('DESPACHO', 'Ato judicial que impulsiona o processo sem conteúdo decisório relevante.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('DECISAO_INTERLOCUTORIA', 'Decisão judicial que resolve questão incidental no curso do processo.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('SENTENCA', 'Ato judicial que põe fim à fase cognitiva ou extingue a execução.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('ACORDAO', 'Decisão proferida por órgão colegiado de Tribunal.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('DECISAO_MONOCRATICA', 'Decisão proferida individualmente por relator em Tribunal.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),

('AUDIENCIA_CONCILIACAO', 'Audiência destinada à tentativa de conciliação entre as partes.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('AUDIENCIA_INSTRUCAO', 'Audiência destinada à produção de provas.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('AUDIENCIA_INSTRUCAO_E_JULGAMENTO', 'Audiência que reúne instrução probatória e julgamento no mesmo ato.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('AUDIENCIA_JULGAMENTO', 'Audiência destinada exclusivamente ao julgamento do feito.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('AUDIENCIA_CANCELADA', 'Comunicação de cancelamento de audiência anteriormente designada.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('AUDIENCIA_REDESIGNADA', 'Audiência remarcada para nova data.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),

('DISTRIBUICAO', 'Ato de distribuição do processo ao juízo competente.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('EMENDA_INICIAL', 'Determinação judicial para correção ou complementação da petição inicial.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('INDEFERIMENTO_INICIAL', 'Decisão judicial que indefere a petição inicial.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('RECEBIMENTO_INICIAL', 'Ato judicial que confirma o recebimento da petição inicial.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),

('ABERTURA_PRAZO_MANIFESTACAO', 'Ato que concede prazo para manifestação de uma das partes.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('CONTESTACAO', 'Peça apresentada pela parte ré em resposta à ação.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('REPLICA', 'Manifestação da parte autora em resposta à contestação.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('IMPUGNACAO', 'Manifestação destinada a impugnar ato, documento ou cálculo.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('MANIFESTACAO_GENERICA', 'Manifestação das partes sem tipificação específica.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),

('JUNTADA_DOCUMENTOS', 'Ato de juntada de documentos aos autos do processo.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('PRODUCAO_PROVA_PERICIAL', 'Ato relacionado à produção de prova pericial.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('NOMEACAO_PERITO', 'Ato judicial que nomeia perito.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('LAUDO_PERICIAL', 'Juntada do laudo elaborado pelo perito.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('INDICACAO_ASSISTENTE_TECNICO', 'Indicação de assistente técnico pela parte.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),

('INTERPOSICAO_RECURSO', 'Protocolo de recurso contra decisão judicial.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('CONTRARRAZOES_RECURSO', 'Manifestação da parte contrária ao recurso interposto.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('JUÍZO_ADMISSIBILIDADE', 'Análise dos requisitos de admissibilidade do recurso.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('REMESSA_TRIBUNAL', 'Remessa dos autos para julgamento em instância superior.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),

('INICIO_CUMPRIMENTO_SENTENCA', 'Início da fase de cumprimento de sentença.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('INTIMACAO_PAGAMENTO', 'Intimação da parte para realizar pagamento.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('PENHORA', 'Ato de constrição judicial de bens do devedor.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('BLOQUEIO_VALORES', 'Bloqueio de valores por meio de sistemas judiciais.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('LIBERACAO_VALORES', 'Liberação de valores bloqueados ou depositados.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),

('SUSPENSAO_PROCESSO', 'Suspensão do andamento do processo.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('ARQUIVAMENTO', 'Arquivamento do processo.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('EXTINCAO_PROCESSO', 'Extinção do processo com ou sem resolução do mérito.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('TRANSITO_EM_JULGADO', 'Certificação de que não cabem mais recursos.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),

('REDISTRIBUICAO', 'Redistribuição do processo para outro juízo.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('ALTERACAO_POLO_PROCESSUAL', 'Inclusão ou exclusão de parte no processo.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),
('SEGREDO_JUSTICA', 'Decretação ou levantamento de segredo de justiça.', true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597');
ON CONFLICT (nome) DO NOTHING;
