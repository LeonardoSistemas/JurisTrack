-- Seed inicial para amarracao de eventos e providencias
-- Requer ao menos um tenant cadastrado.

with tenant as (
  select id as tenant_id
  from public.tenants
  order by created_at
  limit 1
),
eventos as (
  insert into public.evento_processual (nome, descricao, tenant_id)
  select e.nome, e.descricao, tenant.tenant_id
  from (
    values
      ('INTIMACAO', 'Evento de intimacao ao advogado ou parte.'),
      ('SENTENCA', 'Sentenca proferida no processo.'),
      ('DESPACHO', 'Despacho judicial com determinacoes.'),
      ('AUDIENCIA', 'Audiencia designada ou realizada.'),
      ('EMENDA_INICIAL', 'Determinacao de emenda a inicial.')
  ) as e(nome, descricao)
  cross join tenant
  on conflict (tenant_id, nome) do update
    set descricao = excluded.descricao,
        ativo = true,
        updated_at = now()
  returning id, nome, tenant_id
),
providencias as (
  insert into public.providencia_juridica (nome, descricao, exige_peticao, tenant_id)
  select p.nome, p.descricao, p.exige_peticao, tenant.tenant_id
  from (
    values
      ('Analisar intimacao', 'Analise da intimacao recebida.', false),
      ('Interpor recurso', 'Preparar e protocolar recurso cabivel.', true),
      ('Cumprir decisao', 'Cumprir determinacoes do despacho.', false),
      ('Comparecer a audiencia', 'Providenciar comparecimento e preparo.', false),
      ('Emendar inicial', 'Preparar emenda a peticao inicial.', true)
  ) as p(nome, descricao, exige_peticao)
  cross join tenant
  on conflict (tenant_id, nome) do update
    set descricao = excluded.descricao,
        exige_peticao = excluded.exige_peticao,
        ativo = true,
        updated_at = now()
  returning id, nome, tenant_id
),
andamentos as (
  insert into public.andamento_evento (andamento_descricao, evento_id, tipo_match, tenant_id)
  select a.andamento_descricao, e.id, a.tipo_match, tenant.tenant_id
  from (
    values
      ('Intimacao', 'INTIMACAO', 'contem'),
      ('Sentenca', 'SENTENCA', 'contem'),
      ('Despacho', 'DESPACHO', 'contem'),
      ('Audiencia', 'AUDIENCIA', 'contem'),
      ('Emenda a inicial', 'EMENDA_INICIAL', 'contem')
  ) as a(andamento_descricao, evento_nome, tipo_match)
  join eventos e on e.nome = a.evento_nome
  cross join tenant
  on conflict (tenant_id, andamento_descricao, tipo_match) do update
    set evento_id = excluded.evento_id,
        updated_at = now()
  returning id
),
evento_providencias as (
  insert into public.evento_providencia (
    evento_id,
    providencia_id,
    prioridade,
    gera_prazo,
    prazo_dias,
    tipo_prazo,
    padrao,
    observacao_juridica,
    tenant_id
  )
  select
    e.id,
    p.id,
    ep.prioridade,
    ep.gera_prazo,
    ep.prazo_dias,
    ep.tipo_prazo,
    ep.padrao,
    ep.observacao_juridica,
    tenant.tenant_id
  from (
    values
      ('INTIMACAO', 'Analisar intimacao', 1, false, null, null, true, 'Revisar intimacao e registrar providencia.'),
      ('SENTENCA', 'Interpor recurso', 1, true, 15, 'util', true, 'Avaliar cabimento de recurso e providenciar protocolo.'),
      ('DESPACHO', 'Cumprir decisao', 1, true, 5, 'corrido', true, 'Cumprir determinacoes do despacho.'),
      ('AUDIENCIA', 'Comparecer a audiencia', 1, false, null, null, true, 'Preparar participacao na audiencia.'),
      ('EMENDA_INICIAL', 'Emendar inicial', 1, true, 15, 'corrido', true, 'Providenciar emenda solicitada.')
  ) as ep(evento_nome, providencia_nome, prioridade, gera_prazo, prazo_dias, tipo_prazo, padrao, observacao_juridica)
  join eventos e on e.nome = ep.evento_nome
  join providencias p on p.nome = ep.providencia_nome
  cross join tenant
  on conflict (tenant_id, evento_id, providencia_id) do update
    set prioridade = excluded.prioridade,
        gera_prazo = excluded.gera_prazo,
        prazo_dias = excluded.prazo_dias,
        tipo_prazo = excluded.tipo_prazo,
        padrao = excluded.padrao,
        observacao_juridica = excluded.observacao_juridica,
        updated_at = now()
  returning id
)
select 1;
/*insert into public."Modelos_Peticao" (
  titulo,
  descricao,
  tags,
  conteudo,
  variaveis,
  ativo,
  providencia_id,
  tenant_id
)
select
  mp.titulo,
  mp.descricao,
  mp.tags::jsonb,
  mp.conteudo,
  mp.variaveis::jsonb,
  true,
  p.id,
  tenant.tenant_id
from (
  values
    (
      'Modelo recurso basico',
      'Modelo base para recurso.',
      '["recurso","processual"]',
      'Interpor recurso',
      'Excelentissimo(a) Senhor(a) Juiz(a), ... (texto base do recurso).',
      '{"numero_processo":"","parte":"","data_publicacao":""}'
    ),
    (
      'Modelo emenda inicial',
      'Modelo base para emenda a inicial.',
      '["emenda","inicial"]',
      'Emendar inicial',
      'Excelentissimo(a) Senhor(a) Juiz(a), ... (texto base da emenda).',
      '{"numero_processo":"","parte":"","data_publicacao":""}'
    )
) as mp(titulo, descricao, tags, providencia_nome, conteudo, variaveis)
join providencias p on p.nome = mp.providencia_nome
cross join tenant
on conflict (tenant_id, providencia_id, titulo) do update
  set descricao = excluded.descricao,
      tags = excluded.tags,
      conteudo = excluded.conteudo,
      variaveis = excluded.variaveis,
      ativo = true,
      updated_at = now();
*/