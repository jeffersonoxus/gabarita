-- 1. Adiciona coluna
ALTER TABLE public.conteudos ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.conteudos(id);

-- 2. Atualiza ordem (recalcula se necessário)
ALTER TABLE public.conteudos ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;
UPDATE public.conteudos SET ordem = CASE
  WHEN nome ~ '^(\d+)\.(\d+)' THEN CAST(regexp_replace(nome, '^(\d+)\.(\d+).*', '\1') AS INTEGER) * 10 + CAST(regexp_replace(nome, '^(\d+)\.(\d+).*', '\2') AS INTEGER)
  WHEN nome ~ '^(\d+)' THEN CAST(regexp_replace(nome, '^(\d+).*', '\1') AS INTEGER) * 10
  WHEN nome ~ '^I Fundamentos' THEN 201
  WHEN nome ~ '^II Temas' THEN 202
  WHEN nome ~ '^III Legislação' THEN 203
  ELSE 999
END;

-- 3. Seta parent_id: um conteúdo é pai se tiver filhos (ordem entre pai e pai+10)
UPDATE public.conteudos c
SET parent_id = p.id
FROM public.conteudos p
WHERE c.disciplina_id = p.disciplina_id
  AND c.id != p.id
  AND p.ordem % 10 = 0              -- pai tem ordem redonda (40, 230, etc)
  AND c.ordem > p.ordem              -- filho vem depois
  AND c.ordem < p.ordem + 10         -- e antes do próximo pai
  AND NOT EXISTS (                    -- sem outro pai no meio
    SELECT 1 FROM public.conteudos pp
    WHERE pp.disciplina_id = c.disciplina_id
      AND pp.id != p.id AND pp.id != c.id
      AND pp.ordem % 10 = 0
      AND pp.ordem > p.ordem
      AND pp.ordem < c.ordem
  );

-- 4. Verifica
SELECT c.nome, c.ordem, p.nome AS pai
FROM public.conteudos c
LEFT JOIN public.conteudos p ON c.parent_id = p.id
WHERE c.disciplina_id IN (SELECT id FROM public.disciplinas WHERE tipo='basica')
ORDER BY c.ordem
LIMIT 30;
