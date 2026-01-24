INSERT INTO providencia_juridica
(nome, descricao, exige_peticao, ativo, tenant_id)
VALUES
('ANALISAR_PUBLICACAO',
 'Analisar o conteúdo da publicação e identificar providências e prazos.',
 false, true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),

('APRESENTAR_PETICAO',
 'Elaborar e protocolar petição nos autos.',
 true, true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),

('COMPARECER_AUDIENCIA',
 'Comparecer à audiência designada pelo juízo.',
 false, true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),

('CUMPRIR_DETERMINACAO',
 'Cumprir determinação judicial específica.',
 true, true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597'),

('CIENCIA_SEM_PROVIDENCIA',
 'Registrar ciência da publicação, sem necessidade de atuação.',
 false, true, '43f89b9e-7f0f-4ffc-87eb-4e5cf42a8597');