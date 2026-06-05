-- Adiciona coluna de pontuação nos concursos
ALTER TABLE public.concursos ADD COLUMN IF NOT EXISTS pontuacao_tipo TEXT DEFAULT 'tradicional' CHECK (pontuacao_tipo IN ('tradicional', 'cebraspe'));

-- Tradicional: (acertos / total) * 100
-- Cebraspe: ((acertos - erros) / total) * 100  -- erro anula acerto, branco não conta
