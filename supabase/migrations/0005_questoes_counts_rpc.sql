-- Corrige a contagem de questões por disciplina/tópico na tela de filtro do
-- simulado (src/app/simulado/[slug]/page.tsx), que buscava TODAS as linhas
-- de `questoes` do concurso e contava no cliente. Com o banco de questões
-- crescendo (SEFAZ-AL já passa de 1000 linhas), isso esbarrava no limite
-- padrão de 1000 linhas por requisição do PostgREST, cortando os últimos
-- tópicos inseridos da contagem — sem afetar os dados em si, só a exibição.
--
-- Substitui o fetch-e-conta-no-cliente por uma agregação feita no banco:
-- em vez de transferir uma linha por questão, transferimos uma linha por
-- combinação (disciplina_id, conteudo_id), que escala bem mesmo com
-- dezenas de milhares de questões e centenas de usuários simultâneos,
-- já que o COUNT roda no Postgres (uma única query, sem paginação) em vez
-- de no navegador de cada usuário.
--
-- security invoker (padrão): a função roda com os mesmos privilégios do
-- usuário que a chama, respeitando as mesmas RLS policies que já valem
-- para o SELECT direto em `questoes` usado pelo app hoje.

CREATE OR REPLACE FUNCTION public.questoes_counts_por_topico(p_concurso_id uuid)
RETURNS TABLE(disciplina_id uuid, conteudo_id uuid, total bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT q.disciplina_id, q.conteudo_id, count(*) AS total
  FROM questoes q
  WHERE q.concurso_id = p_concurso_id
  GROUP BY q.disciplina_id, q.conteudo_id;
$$;

GRANT EXECUTE ON FUNCTION public.questoes_counts_por_topico(uuid) TO anon, authenticated;
