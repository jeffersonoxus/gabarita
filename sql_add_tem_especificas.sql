ALTER TABLE public.concursos ADD COLUMN IF NOT EXISTS tem_especificas BOOLEAN DEFAULT true;
ALTER TABLE public.disciplinas ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- ENEM: apenas basicas
UPDATE public.concursos SET tem_especificas = false WHERE nome ILIKE '%enem%';
