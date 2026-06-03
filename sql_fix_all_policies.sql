-- RLS: todas as operacoes para usuarios autenticados
DROP POLICY IF EXISTS all_concursos ON public.concursos;
DROP POLICY IF EXISTS all_disciplinas ON public.disciplinas;
DROP POLICY IF EXISTS all_conteudos ON public.conteudos;
DROP POLICY IF EXISTS all_questoes ON public.questoes;
DROP POLICY IF EXISTS all_simulados ON public.simulados;
DROP POLICY IF EXISTS all_respostas ON public.respostas;
DROP POLICY IF EXISTS all_comentarios ON public.comentarios;
DROP POLICY IF EXISTS all_assinaturas ON public.assinaturas;

CREATE POLICY all_concursos ON public.concursos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY all_disciplinas ON public.disciplinas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY all_conteudos ON public.conteudos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY all_questoes ON public.questoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY all_simulados ON public.simulados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY all_respostas ON public.respostas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY all_comentarios ON public.comentarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY all_assinaturas ON public.assinaturas FOR ALL USING (true) WITH CHECK (true);
