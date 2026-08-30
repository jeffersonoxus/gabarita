"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { getBrowserClient } from "@/lib/supabase-browser";
import { sha256Hex } from "@/lib/utils";

interface RevisaoTabProps {
  onMsg?: (m: string) => void;
}

export default function RevisaoTab({ onMsg }: RevisaoTabProps) {
  const [concursos, setConcursos] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [conteudos, setConteudos] = useState<any[]>([]);
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [filterConcurso, setFilterConcurso] = useState("");
  const [filterDisciplina, setFilterDisciplina] = useState("");
  const [filterConteudo, setFilterConteudo] = useState("");
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<Record<string, boolean>>({});
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const sup = getBrowserClient;

  useEffect(() => {
    sup().from("concursos").select("id,nome").order("nome").then((res: any) => {
      if (res.data) setConcursos(res.data);
    });
  }, []);

  const loadDisciplinas = useCallback(async (cid: string) => {
    const { data } = await sup().from("disciplinas").select("id,nome,grupos!inner(concurso_id)").eq("grupos.concurso_id", cid).order("nome");
    if (data) setDisciplinas(data);
  }, []);

  const loadConteudos = useCallback(async (did: string) => {
    const { data } = await sup().from("conteudos").select("id,nome").eq("disciplina_id", did).order("nome");
    if (data) setConteudos(data);
  }, []);

  const loadQuestoes = useCallback(async () => {
    if (!filterConcurso) return;
    setLoading(true);
    let q = sup()
      .from("questoes")
      .select("*, textos_apoio(titulo, corpo, fonte), disciplinas!inner(nome), conteudos(nome)")
      .eq("concurso_id", filterConcurso)
      .order("created_at", { ascending: false })
      .limit(200);
    if (filterDisciplina) q = q.eq("disciplina_id", filterDisciplina);
    if (filterConteudo) q = q.eq("conteudo_id", filterConteudo);
    const { data } = await q;
    if (data) setQuestoes(data);
    setLoading(false);
  }, [filterConcurso, filterDisciplina, filterConteudo]);

  useEffect(() => {
    if (filterConcurso) loadQuestoes();
  }, [filterConcurso, filterDisciplina, filterConteudo, loadQuestoes]);

  function iniciarEdicao(q: any) {
    setEditando((prev) => ({ ...prev, [q.id]: true }));
    setEditForm((prev) => ({
      ...prev,
      [q.id]: {
        enunciado: q.enunciado || "",
        alternativa_a: q.alternativa_a || "",
        alternativa_b: q.alternativa_b || "",
        alternativa_c: q.alternativa_c || "",
        alternativa_d: q.alternativa_d || "",
        alternativa_e: q.alternativa_e || "",
        gabarito: q.gabarito || "A",
        tipo: q.tipo || "certo_errado",
        texto_apoio_titulo: q.textos_apoio?.titulo || "",
        texto_apoio_corpo: q.textos_apoio?.corpo || "",
        texto_apoio_fonte: q.textos_apoio?.fonte || "",
        texto_apoio_id: q.texto_apoio_id || null,
      },
    }));
  }

  function cancelarEdicao(id: string) {
    setEditando((prev) => ({ ...prev, [id]: false }));
    setEditForm((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function salvarQuestao(id: string) {
    const form = editForm[id];
    if (!form) return;

    const corpo = (form.texto_apoio_corpo || "").trim();
    const titulo = (form.texto_apoio_titulo || "").trim();
    const fonte = (form.texto_apoio_fonte || "").trim();
    if (!corpo && (titulo || fonte)) {
      onMsg?.("Texto de apoio precisa de um corpo se título ou fonte forem preenchidos");
      return;
    }

    let textoApoioId = form.texto_apoio_id;

    if (corpo) {
      const hash = await sha256Hex(corpo);
      if (textoApoioId) {
        const { error: taError } = await sup().from("textos_apoio").update({ titulo: titulo || null, corpo, fonte: fonte || null, hash }).eq("id", textoApoioId);
        if (taError) { onMsg?.("Erro no texto de apoio: " + taError.message); return; }
      } else {
        // upsert por hash: reaproveita um texto de apoio já existente com o mesmo corpo
        const { data: upserted, error: taError } = await sup()
          .from("textos_apoio")
          .upsert({ titulo: titulo || null, corpo, fonte: fonte || null, hash }, { onConflict: "hash" })
          .select("id")
          .single();
        if (taError) { onMsg?.("Erro no texto de apoio: " + taError.message); return; }
        if (upserted) textoApoioId = upserted.id;
      }
    } else {
      textoApoioId = null;
    }

    const { error } = await sup()
      .from("questoes")
      .update({
        enunciado: form.enunciado.trim(),
        alternativa_a: form.alternativa_a?.trim() || "",
        alternativa_b: form.alternativa_b?.trim() || "",
        alternativa_c: form.alternativa_c?.trim() || "",
        alternativa_d: form.alternativa_d?.trim() || "",
        alternativa_e: form.alternativa_e?.trim() || "",
        gabarito: form.gabarito,
        tipo: form.tipo,
        texto_apoio_id: textoApoioId,
      })
      .eq("id", id);

    if (error) {
      onMsg?.("Erro: " + error.message);
    } else {
      onMsg?.("Salva");
      cancelarEdicao(id);
      loadQuestoes();
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-card p-4">
        <h3 className="font-bold mb-3 text-sm">Filtrar questões</h3>
        <div className="flex flex-wrap gap-3">
          <select
            value={filterConcurso}
            onChange={(e) => {
              setFilterConcurso(e.target.value);
              setFilterDisciplina("");
              setFilterConteudo("");
              setDisciplinas([]);
              setConteudos([]);
              if (e.target.value) loadDisciplinas(e.target.value);
            }}
            className="border rounded px-3 py-2 text-sm bg-background flex-1 min-w-[200px]"
            aria-label="Concurso"
          >
            <option value="">Selecione um concurso</option>
            {concursos.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <select
            value={filterDisciplina}
            onChange={(e) => {
              setFilterDisciplina(e.target.value);
              setFilterConteudo("");
              setConteudos([]);
              if (e.target.value) loadConteudos(e.target.value);
            }}
            className="border rounded px-3 py-2 text-sm bg-background flex-1 min-w-[200px]"
            disabled={!filterConcurso}
            aria-label="Disciplina"
          >
            <option value="">Todas as disciplinas</option>
            {disciplinas.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>

          <select
            value={filterConteudo}
            onChange={(e) => setFilterConteudo(e.target.value)}
            className="border rounded px-3 py-2 text-sm bg-background flex-1 min-w-[200px]"
            disabled={!filterDisciplina}
            aria-label="Conteúdo"
          >
            <option value="">Todos os conteúdos</option>
            {conteudos.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="text-center text-muted-foreground py-8 text-sm">Carregando...</div>}

      {!loading && questoes.length === 0 && filterConcurso && (
        <div className="bg-card border rounded-card p-8 text-center text-muted-foreground text-sm">
          Nenhuma questão encontrada.
        </div>
      )}

      {!loading && questoes.length > 0 && (
        <div className="text-xs text-muted-foreground mb-2">
          {questoes.length} {questoes.length === 1 ? "questão" : "questões"} encontrada{questoes.length !== 1 ? "s" : ""}
        </div>
      )}

      <div className="space-y-3">
        {questoes.map((q: any) => {
          const editandoQ = editando[q.id];
          const form = editForm[q.id];
          return (
            <div key={q.id} className="bg-card border rounded-card overflow-hidden">
              {editandoQ ? (
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1 block">
                      Enunciado
                    </label>
                    <textarea
                      value={form?.enunciado || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          [q.id]: { ...prev[q.id], enunciado: e.target.value },
                        }))
                      }
                      className="w-full border rounded px-3 py-2 text-sm bg-background resize-y min-h-[80px] font-mono"
                      aria-label="Enunciado"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-medium block">
                      Texto de apoio
                    </label>
                    <input
                      value={form?.texto_apoio_titulo || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          [q.id]: { ...prev[q.id], texto_apoio_titulo: e.target.value },
                        }))
                      }
                      placeholder="Título (opcional)"
                      className="w-full border rounded px-3 py-2 text-sm bg-background"
                      aria-label="Título do texto de apoio"
                    />
                    <textarea
                      value={form?.texto_apoio_corpo || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          [q.id]: { ...prev[q.id], texto_apoio_corpo: e.target.value },
                        }))
                      }
                      placeholder="Corpo (obrigatório se houver texto de apoio)"
                      className="w-full border rounded px-3 py-2 text-sm bg-background resize-y min-h-[160px] font-mono"
                      aria-label="Corpo do texto de apoio"
                    />
                    <input
                      value={form?.texto_apoio_fonte || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          [q.id]: { ...prev[q.id], texto_apoio_fonte: e.target.value },
                        }))
                      }
                      placeholder="Fonte (opcional)"
                      className="w-full border rounded px-3 py-2 text-sm bg-background"
                      aria-label="Fonte do texto de apoio"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {["alternativa_a", "alternativa_b", "alternativa_c", "alternativa_d", "alternativa_e"].map((alt, i) => {
                      const letra = String.fromCharCode(65 + i);
                      const val = form?.[alt] || "";
                      if (!val && i >= 2 && form?.tipo === "certo_errado") return null;
                      return (
                        <div key={alt} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{letra}</span>
                          <input
                            value={val}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                [q.id]: { ...prev[q.id], [alt]: e.target.value },
                              }))
                            }
                            className="flex-1 border rounded px-2 py-1.5 text-xs bg-background"
                            aria-label={`Alternativa ${letra}`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground font-medium mb-1 block">
                        Gabarito
                      </label>
                      <select
                        value={form?.gabarito || "A"}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            [q.id]: { ...prev[q.id], gabarito: e.target.value },
                          }))
                        }
                        className="border rounded px-3 py-2 text-sm bg-background"
                        aria-label="Gabarito"
                      >
                        {["A", "B", "C", "D", "E"].map((l) => {
                          const altVal = form?.["alternativa_" + l.toLowerCase()] || "";
                          const label = altVal ? `${l} — ${altVal.substring(0, 40)}` : l;
                          return (
                            <option key={l} value={l}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="flex gap-2 self-end ml-auto">
                      <Button size="sm" variant="outline" onClick={() => cancelarEdicao(q.id)}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={() => salvarQuestao(q.id)}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="text-sm leading-relaxed">{q.enunciado}</div>
                      {q.textos_apoio?.corpo && (
                        <details className="border rounded bg-muted/20">
                          <summary className="text-xs text-muted-foreground cursor-pointer px-3 py-1.5 hover:text-foreground select-none">
                            Texto de apoio{q.textos_apoio.titulo ? ` — ${q.textos_apoio.titulo}` : ""}
                          </summary>
                          <div className="px-3 pb-2 pt-1 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono">
                            {q.textos_apoio.corpo}
                            {q.textos_apoio.fonte && <div className="mt-1 not-italic text-[11px] text-muted-foreground/70">Fonte: {q.textos_apoio.fonte}</div>}
                          </div>
                        </details>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {["alternativa_a", "alternativa_b", "alternativa_c", "alternativa_d", "alternativa_e"].map((alt, i) => {
                          const val = q[alt];
                          if (!val) return null;
                          const letra = String.fromCharCode(65 + i);
                          const isGab = q.gabarito === letra;
                          return (
                            <span key={alt} className={isGab ? "font-bold text-emerald-600" : ""}>
                              {letra}) {val.substring(0, 30)}{val.length > 30 ? "…" : ""}
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Gabarito:{" "}
                          <span className="font-bold text-foreground">{q.gabarito}</span>
                        </span>
                        <span>|</span>
                        <span>
                          {q.disciplinas?.nome}
                          {q.conteudos?.nome ? ` > ${q.conteudos.nome}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => iniciarEdicao(q)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (!confirm("Excluir esta questão?")) return;
                          await sup().from("questoes").delete().eq("id", q.id);
                          onMsg?.("Excluída");
                          loadQuestoes();
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
