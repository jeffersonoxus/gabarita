-- Adiciona colunas para imagens e texto de apoio nas questoes
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS texto_apoio TEXT;
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS imagem_url TEXT;

-- Criar bucket de imagens (execute no SQL Editor OU via Supabase Dashboard > Storage)
-- Ou execute pelo dashboard: Storage > New Bucket > nome: "questoes" > public
