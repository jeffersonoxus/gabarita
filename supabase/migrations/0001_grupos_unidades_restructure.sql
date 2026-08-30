-- Reformulação da hierarquia de conteúdo:
--   Concurso -> Grupo -> Disciplina -> Unidade (opcional) -> Tópico
-- e reestruturação de textos_apoio (titulo/corpo/fonte).
--
-- JÁ APLICADO no banco em produção (sjmzlqkqabjpybksmgys) em 2026-08-29.
-- Este arquivo é reconstituído após uma exclusão acidental da pasta
-- supabase/ no disco local — mantido aqui só para referência/histórico,
-- não precisa ser rodado de novo.
--
-- É destrutivo: apaga TODOS os concursos/disciplinas/conteudos/questoes/
-- textos_apoio existentes, e em cascata simulados/respostas/comentarios/
-- comentario_votos/denuncias que dependem deles. profiles NÃO é tocado.

BEGIN;

-- ============================================================
-- STEP 1: wipe destrutivo
-- ============================================================
TRUNCATE TABLE
  denuncias,
  comentario_votos,
  comentarios,
  respostas,
  simulados,
  questoes,
  textos_apoio,
  conteudos,
  disciplinas,
  concursos
CASCADE;

-- ============================================================
-- STEP 2: nova tabela grupos (Concurso -> Grupo -> Disciplina)
-- ============================================================
CREATE TABLE grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurso_id uuid NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_grupos_concurso_id ON grupos(concurso_id);
-- Se gen_random_uuid() falhar: CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- STEP 3: concursos perde tem_especificas (substituído pelos grupos)
-- ============================================================
ALTER TABLE concursos DROP COLUMN IF EXISTS tem_especificas;

-- ============================================================
-- STEP 4: disciplinas passa a pertencer a um grupo, não a concurso+tipo
-- ============================================================
ALTER TABLE disciplinas DROP COLUMN IF EXISTS tipo;
ALTER TABLE disciplinas DROP COLUMN IF EXISTS concurso_id;
ALTER TABLE disciplinas ADD COLUMN grupo_id uuid NOT NULL REFERENCES grupos(id) ON DELETE CASCADE;
CREATE INDEX idx_disciplinas_grupo_id ON disciplinas(grupo_id);

-- ============================================================
-- STEP 5: nova tabela unidades (Disciplina -> Unidade opcional -> Tópico)
-- ============================================================
CREATE TABLE unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disciplina_id uuid NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_unidades_disciplina_id ON unidades(disciplina_id);

-- STEP 5b: tópicos perdem a hierarquia recursiva pai/filho (parent_id)
-- e ganham unidade_id opcional (nullable) — continuam sempre presos
-- direto à disciplina também, unidade é só um agrupamento a mais.
ALTER TABLE conteudos DROP COLUMN IF EXISTS parent_id;
ALTER TABLE conteudos ADD COLUMN unidade_id uuid REFERENCES unidades(id) ON DELETE SET NULL;
CREATE INDEX idx_conteudos_unidade_id ON conteudos(unidade_id);

-- ============================================================
-- STEP 6: textos_apoio ganha titulo/corpo/fonte
-- (a coluna "hash" text NOT NULL UNIQUE já existia nesta tabela antes
-- desta migração, usada para deduplicar texto_apoio por conteúdo — o
-- app calcula um SHA-256 do corpo no client antes de inserir/upsertar)
-- ============================================================
ALTER TABLE textos_apoio DROP COLUMN IF EXISTS texto;
ALTER TABLE textos_apoio ADD COLUMN titulo text;
ALTER TABLE textos_apoio ADD COLUMN corpo text NOT NULL;
ALTER TABLE textos_apoio ADD COLUMN fonte text;
-- Recriação de referência, caso a tabela seja criada do zero num projeto novo:
-- ALTER TABLE textos_apoio ADD COLUMN IF NOT EXISTS hash text;
-- ALTER TABLE textos_apoio ALTER COLUMN hash SET NOT NULL;
-- ALTER TABLE textos_apoio ADD CONSTRAINT textos_apoio_hash_key UNIQUE (hash);

-- ============================================================
-- STEP 7: remove a coluna legada questoes.texto_apoio (string solta,
-- nunca lida pela prova/revisão — só texto_apoio_id importa)
-- ============================================================
ALTER TABLE questoes DROP COLUMN IF EXISTS texto_apoio;

-- ============================================================
-- STEP 8: garante que texto_apoio_id nunca quebra uma questão se o
-- texto de apoio compartilhado for removido no futuro
-- ============================================================
ALTER TABLE questoes DROP CONSTRAINT IF EXISTS questoes_texto_apoio_id_fkey;
ALTER TABLE questoes ADD CONSTRAINT questoes_texto_apoio_id_fkey
  FOREIGN KEY (texto_apoio_id) REFERENCES textos_apoio(id) ON DELETE SET NULL;
-- (nome da constraint pode variar — confira com \d questoes se o ALTER falhar)

COMMIT;

-- ============================================================
-- VERIFICAÇÃO MANUAL PÓS-SCRIPT (rodar separadamente)
-- ============================================================
-- 1) Confirme as policies de RLS existentes em disciplinas/conteudos/concursos
--    e replique o mesmo padrão (leitura liberada, escrita só para
--    profiles.role = 'admin') nas novas tabelas grupos e unidades:
--
--    SELECT * FROM pg_policies WHERE tablename IN ('disciplinas','conteudos','concursos');
--
--    Sem policy explícita, RLS nega tudo por padrão e o CRUD de
--    grupos/unidades no admin falha silenciosamente.
--    (JÁ FEITO em produção: policies admin_grupos/read_grupos e
--    admin_unidades/read_unidades criadas em 2026-08-29.)
