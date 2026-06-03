-- Limpa politicas do schema public
DROP POLICY IF EXISTS all_concursos ON public.concursos;
DROP POLICY IF EXISTS all_disciplinas ON public.disciplinas;
DROP POLICY IF EXISTS all_conteudos ON public.conteudos;
DROP POLICY IF EXISTS all_questoes ON public.questoes;
DROP POLICY IF EXISTS all_simulados ON public.simulados;
DROP POLICY IF EXISTS all_respostas ON public.respostas;
DROP POLICY IF EXISTS all_comentarios ON public.comentarios;
DROP POLICY IF EXISTS all_assinaturas ON public.assinaturas;
DROP POLICY IF EXISTS read_concursos ON public.concursos;
DROP POLICY IF EXISTS read_disciplinas ON public.disciplinas;
DROP POLICY IF EXISTS read_conteudos ON public.conteudos;
DROP POLICY IF EXISTS read_questoes ON public.questoes;
DROP POLICY IF EXISTS own_simulados ON public.simulados;
DROP POLICY IF EXISTS own_respostas ON public.respostas;
DROP POLICY IF EXISTS admin_concursos ON public.concursos;
DROP POLICY IF EXISTS admin_disciplinas ON public.disciplinas;
DROP POLICY IF EXISTS admin_conteudos ON public.conteudos;
DROP POLICY IF EXISTS admin_questoes ON public.questoes;
DROP POLICY IF EXISTS all_denuncias ON public.denuncias;
DROP POLICY IF EXISTS all_votos ON public.comentario_votos;
DROP POLICY IF EXISTS insert_any ON public.notificacoes;
DROP POLICY IF EXISTS select_own ON public.notificacoes;
DROP POLICY IF EXISTS update_own ON public.notificacoes;
DROP POLICY IF EXISTS admin_access ON public.notificacoes;
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_trigger ON public.profiles;
DROP POLICY IF EXISTS select_own ON public.profiles;
DROP POLICY IF EXISTS admin_select ON public.profiles;
DROP POLICY IF EXISTS admin_update ON public.profiles;
DROP POLICY IF EXISTS allow_all_insert ON public.profiles;

-- Admin: CRUD total
CREATE POLICY admin_concursos ON public.concursos FOR ALL USING ((SELECT role FROM public.profiles WHERE id=auth.uid())='admin') WITH CHECK(true);
CREATE POLICY admin_disciplinas ON public.disciplinas FOR ALL USING ((SELECT role FROM public.profiles WHERE id=auth.uid())='admin') WITH CHECK(true);
CREATE POLICY admin_conteudos ON public.conteudos FOR ALL USING ((SELECT role FROM public.profiles WHERE id=auth.uid())='admin') WITH CHECK(true);
CREATE POLICY admin_questoes ON public.questoes FOR ALL USING ((SELECT role FROM public.profiles WHERE id=auth.uid())='admin') WITH CHECK(true);

-- Todos leem
CREATE POLICY read_concursos ON public.concursos FOR SELECT USING(true);
CREATE POLICY read_disciplinas ON public.disciplinas FOR SELECT USING(true);
CREATE POLICY read_conteudos ON public.conteudos FOR SELECT USING(true);
CREATE POLICY read_questoes ON public.questoes FOR SELECT USING(true);

-- Profiles: todos leem nome/foto, admin CRUD
CREATE POLICY read_profiles ON public.profiles FOR SELECT USING(true);

-- Simulados: usuario le/cria os proprios
CREATE POLICY own_simulados ON public.simulados FOR ALL USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);

-- Respostas: via simulado
CREATE POLICY own_respostas ON public.respostas FOR ALL USING((SELECT user_id FROM public.simulados WHERE id=respostas.simulado_id)=auth.uid()) WITH CHECK(true);

-- Comentarios, denuncias, votos: qualquer logado
CREATE POLICY all_comentarios ON public.comentarios FOR ALL USING(true) WITH CHECK(auth.role()='authenticated');
CREATE POLICY all_denuncias ON public.denuncias FOR ALL USING(true) WITH CHECK(auth.role()='authenticated');
CREATE POLICY all_votos ON public.comentario_votos FOR ALL USING(true) WITH CHECK(true);

-- Notificacoes: admin le
CREATE POLICY admin_notificacoes ON public.notificacoes FOR ALL USING ((SELECT role FROM public.profiles WHERE id=auth.uid())='admin') WITH CHECK(true);
