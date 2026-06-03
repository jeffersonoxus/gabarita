ALTER TABLE public.concursos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pronto' CHECK (status IN ('pronto', 'manutencao', 'breve'));
