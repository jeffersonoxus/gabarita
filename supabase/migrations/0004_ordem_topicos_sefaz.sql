-- Preenche unidades.ordem e conteudos.ordem a partir do número do edital
-- já embutido no início do nome (ex: "6.2 SAC" -> ordem 2 dentro da
-- unidade "6 Planos de amortização..."). Sem isso a listagem cai pra
-- ordem alfabética (1, 10, 11, 12, 2, 3...), que é o que o usuário notou.
--
-- JÁ APLICADO no banco em produção em 2026-08-30.

BEGIN;

UPDATE unidades
SET ordem = (regexp_match(nome, '^(\d+)'))[1]::int
WHERE disciplina_id IN (
  SELECT d.id FROM disciplinas d JOIN grupos g ON g.id=d.grupo_id JOIN concursos c ON c.id=g.concurso_id WHERE c.slug='sefaz-al'
);

UPDATE conteudos
SET ordem = COALESCE((regexp_match(nome, '^\d+\.(\d+)'))[1]::int, 0)
WHERE unidade_id IS NOT NULL
  AND disciplina_id IN (
    SELECT d.id FROM disciplinas d JOIN grupos g ON g.id=d.grupo_id JOIN concursos c ON c.id=g.concurso_id WHERE c.slug='sefaz-al'
  );

UPDATE conteudos
SET ordem = (regexp_match(nome, '^(\d+)'))[1]::int
WHERE unidade_id IS NULL
  AND disciplina_id IN (
    SELECT d.id FROM disciplinas d JOIN grupos g ON g.id=d.grupo_id JOIN concursos c ON c.id=g.concurso_id WHERE c.slug='sefaz-al'
  );

COMMIT;
