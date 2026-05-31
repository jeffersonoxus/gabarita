-- Adiciona politica de DELETE para simulados
DROP POLICY IF EXISTS own_delete ON public.simulados;
CREATE POLICY own_delete ON public.simulados FOR DELETE USING (auth.uid() = user_id);

-- Adiciona politica de DELETE para respostas (cascade)
DROP POLICY IF EXISTS own_delete ON public.respostas;
CREATE POLICY own_delete ON public.respostas FOR DELETE USING (
  (SELECT user_id FROM public.simulados WHERE id = respostas.simulado_id) = auth.uid()
);
