"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, BookOpen, GraduationCap, Layers, ScrollText } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase-browser";

const GRUPO_ICONS = [BookOpen, GraduationCap, Layers, ScrollText];
const GRUPO_COLORS = ["text-blue-500", "text-purple-500", "text-emerald-500", "text-amber-500"];

export default function SimuladoFilterPage() {
  const params = useParams();
  const router = useRouter();
  const slugParam = params.slug as string;

  const [concursoId, setConcursoId] = useState("");
  const [grupos, setGrupos] = useState<any[]>([]);
  const [disciplinasByGrupo, setDisciplinasByGrupo] = useState<Record<string, any[]>>({});
  const [unidadesByDisc, setUnidadesByDisc] = useState<Record<string, any[]>>({});
  const [nome, setNome] = useState("");
  const [selectedDisc, setSelectedDisc] = useState<string[]>([]);
  const [selectedCont, setSelectedCont] = useState<string[]>([]);
  const [conteudos, setConteudos] = useState<Record<string, any[]>>({});
  const QTD_QUESTOES = 5; // fixo por enquanto — escolher outras quantidades (10, 20...) fica pra versão paga
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDisc, setExpandedDisc] = useState<Set<string>>(new Set());
  const [questCounts, setQuestCounts] = useState<Record<string, number>>({});
  const [instrucoes, setInstrucoes] = useState<any>(null);
  const [showInstrucoes, setShowInstrucoes] = useState(false);

  useEffect(() => {
    load(slugParam);
  }, [slugParam]);

  async function load(slug: string) {
    setError(null);
    setLoading(true);
    const sup = getBrowserClient();

    let con = null;
    let res = await sup.from("concursos").select("id, nome, instrucoes").eq("slug", slug).maybeSingle();
    if (!res.data) {
      res = await sup.from("concursos").select("id, nome, instrucoes").eq("id", slug).maybeSingle();
    }
    con = res.data;
    if (!con) {
      setError("Concurso não encontrado");
      setLoading(false);
      return;
    }

    setConcursoId(con.id);
    setNome(con.nome);

    const inst = con.instrucoes;
    if (inst?.edital || inst?.selecao || inst?.estatisticas) {
      setInstrucoes(inst);
      setShowInstrucoes(true);
    }

    const { data: gps } = await sup.from("grupos").select("id, nome, ordem").eq("concurso_id", con.id).order("ordem").order("nome");
    const gruposList = gps || [];
    setGrupos(gruposList);
    const grupoIds = gruposList.map((g: any) => g.id);
    if (!grupoIds.length) { setLoading(false); return; }

    const { data: d } = await sup.from("disciplinas").select("*").in("grupo_id", grupoIds).order("nome");
    if (d) {
      const byGrupo: Record<string, any[]> = {};
      d.forEach((disc: any) => { if (!byGrupo[disc.grupo_id]) byGrupo[disc.grupo_id] = []; byGrupo[disc.grupo_id].push(disc); });
      setDisciplinasByGrupo(byGrupo);

      const discIds = d.map((x: any) => x.id);
      if (discIds.length) {
        const { data: unis } = await sup.from("unidades").select("id, nome, ordem, disciplina_id").in("disciplina_id", discIds).order("ordem").order("nome");
        if (unis) {
          const um: Record<string, any[]> = {};
          (unis as any[]).forEach((u: any) => { if (!um[u.disciplina_id]) um[u.disciplina_id] = []; um[u.disciplina_id].push(u); });
          setUnidadesByDisc(um);
        }

        const { data: cont } = await sup.from("conteudos").select("id, nome, disciplina_id, unidade_id, ordem").in("disciplina_id", discIds).order("ordem").order("nome");
        if (cont) {
          const m: Record<string, any[]> = {};
          (cont as any[]).forEach((ct: any) => { if (!m[ct.disciplina_id]) m[ct.disciplina_id] = []; m[ct.disciplina_id].push(ct); });
          setConteudos(m);
        }
      }
      const { data: counts } = await sup.rpc("questoes_counts_por_topico", { p_concurso_id: con.id });
      if (counts) {
        const qc: Record<string, number> = {};
        (counts as { disciplina_id: string; conteudo_id: string | null; total: number }[]).forEach((q) => {
          qc[q.disciplina_id] = (qc[q.disciplina_id] || 0) + q.total;
          if (q.conteudo_id) qc[q.conteudo_id] = (qc[q.conteudo_id] || 0) + q.total;
        });
        setQuestCounts(qc);
      }
    }
    setLoading(false);
  }

  const toggleExpand = (id: string) => {
    const container = document.getElementById("simulado-scroll");
    const y = container?.scrollTop || window.scrollY;
    const s = new Set(expandedDisc);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedDisc(s);
    requestAnimationFrame(() => { if (container) container.scrollTop = y; else window.scrollTo(0, y); });
  };

  const toggleDisc = (id: string) => {
    const container = document.getElementById("simulado-scroll");
    const y = container?.scrollTop || window.scrollY;
    setSelectedDisc(prev => {
      const n = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (!n.includes(id)) {
        const cids = (conteudos[id] || []).map((c: any) => c.id);
        setSelectedCont(p => p.filter(x => !cids.includes(x)));
      }
      return n;
    });
    requestAnimationFrame(() => { if (container) container.scrollTop = y; else window.scrollTo(0, y); });
  };

  const toggleCont = (id: string) => {
    const container = document.getElementById("simulado-scroll");
    const y = container?.scrollTop || window.scrollY;
    setSelectedCont(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    requestAnimationFrame(() => {
      if (container) container.scrollTop = y;
      else window.scrollTo(0, y);
    });
  };

  const start = () => {
    const f = new URLSearchParams();
    f.set("qtd", String(QTD_QUESTOES));
    if (selectedDisc.length) f.set("disc", selectedDisc.join(","));
    if (selectedCont.length) f.set("cont", selectedCont.join(","));
    router.push(`/simulado/${slugParam}/exame?${f.toString()}`);
  };

  if (error) {
    return (
      <AppShell>
        <ErrorState message={error} />
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <LoadingScreen message="Carregando concurso..." />
      </AppShell>
    );
  }

  const DiscSection = ({ title, icon: Icon, data, color }: { title: string; icon: any; data: any[]; color: string }) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-6 h-6 ${color}`} aria-hidden="true" />
        <h2 className="font-semibold text-md">{title}</h2>
        <Badge variant="secondary" className="text-md h-4 px-1.5">{data.length}</Badge>
        <button
          onClick={() =>
            setSelectedDisc(prev => {
              const ids = data.map((d: any) => d.id);
              return ids.every(i => prev.includes(i))
                ? prev.filter(x => !ids.includes(x))
                : [...new Set([...prev, ...ids])];
            })
          }
          className="ml-auto text-md text-muted-foreground hover:text-foreground transition-colors"
          aria-label={data.every((d: any) => selectedDisc.includes(d.id)) ? `Limpar ${title}` : `Selecionar todas ${title}`}
        >
          {data.every((d: any) => selectedDisc.includes(d.id)) ? "Limpar" : "Todas"}
        </button>
      </div>
      <div className="space-y-2">
        {data.map((d: any) => {
          const dConts = conteudos[d.id] || [];
          const dUnidades = unidadesByDisc[d.id] || [];
          const isOpen = expandedDisc.has(d.id);
          const sel = selectedDisc.includes(d.id);
          const itensOrdenados = [
            ...dUnidades.map((u: any) => ({ tipo: "unidade" as const, ordem: u.ordem ?? 0, unidade: u, topicos: dConts.filter((ct: any) => ct.unidade_id === u.id) })),
            ...dConts.filter((ct: any) => !ct.unidade_id).map((ct: any) => ({ tipo: "topico" as const, ordem: ct.ordem ?? 0, topico: ct })),
          ]
            .filter((it: any) => it.tipo === "topico" || it.topicos.length > 0)
            .sort((a: any, b: any) => a.ordem - b.ordem);
          return (
            <Card key={d.id} className={sel ? "border-primary/50" : ""}>
              <CardContent className="p-0">
                <button
                  onClick={() => toggleExpand(d.id)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="w-full flex items-center gap-3 px-3 py-1 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
                  aria-expanded={isOpen}
                  aria-label={`${d.nome}${sel ? " (selecionada)" : ""}`}
                >
                  <Checkbox
                    checked={sel}
                    onCheckedChange={() => toggleDisc(d.id)}
                    onClick={e => e.stopPropagation()}
                    aria-label={`Selecionar ${d.nome}`}
                  />
                  <span className="text-md flex-1">
                    {d.nome}
                    {questCounts[d.id] !== undefined && (
                      <span className="text-[12px] text-blue-500 ml-1 font-mono">({questCounts[d.id]})</span>
                    )}
                  </span>
                  {dConts.length > 0 ? (
                    <span className="text-xs text-muted-foreground">{dConts.length} tópicos</span>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">Em breve</Badge>
                  )}
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </button>
                {isOpen && dConts.length > 0 && (
                  <div className="border-t px-4 py-3">
                    <div className="max-h-64 overflow-y-auto space-y-3">
                      {itensOrdenados.map((it: any) =>
                        it.tipo === "unidade" ? (
                          <div key={`u-${it.unidade.id}`}>
                            <p className="text-md font-medium text-muted-foreground mb-1.5">{it.unidade.nome}</p>
                            <div className="grid gap-2 pl-1">
                              {it.topicos.map((ct: any) => (
                                <label key={ct.id} className="flex text-md items-start gap-2.5 cursor-pointer py-1">
                                  <Checkbox
                                    checked={selectedCont.includes(ct.id)}
                                    onCheckedChange={() => toggleCont(ct.id)}
                                    className="mt-0.5"
                                    aria-label={`Selecionar conteúdo ${ct.nome}`}
                                  />
                                  <span className="text-md text-muted-foreground leading-relaxed">
                                    {ct.nome}
                                    {questCounts[ct.id] !== undefined && (
                                      <span className="text-md font-medium text-blue-500 ml-1 font-mono">({questCounts[ct.id]})</span>
                                    )}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div key={`t-${it.topico.id}`} className="grid gap-2">
                            <label className="flex items-start gap-2.5 cursor-pointer py-1">
                              <Checkbox
                                checked={selectedCont.includes(it.topico.id)}
                                onCheckedChange={() => toggleCont(it.topico.id)}
                                className="mt-0.5"
                                aria-label={`Selecionar conteúdo ${it.topico.nome}`}
                              />
                              <span className="text-md text-muted-foreground leading-relaxed">
                                {it.topico.nome}
                                {questCounts[it.topico.id] !== undefined && (
                                  <span className="text-md font-medium ml-1 text-blue-500 font-mono">({questCounts[it.topico.id]})</span>
                                )}
                              </span>
                            </label>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
                {isOpen && dConts.length === 0 && (
                  <div className="border-t px-4 py-3 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">Em breve</Badge>
                    <span className="text-xs text-muted-foreground">Conteúdos sendo preparados</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  function dismissInst() {
    setShowInstrucoes(false);
    if (concursoId) localStorage.setItem(`instrucoes_${concursoId}`, "1");
  }

  return (
    <>
      {showInstrucoes && instrucoes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold">{nome}</h2>
              {instrucoes.edital && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">📋 Sobre o edital</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{instrucoes.edital}</p>
                </div>
              )}
              {instrucoes.selecao && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">🎯 Como selecionar as perguntas</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{instrucoes.selecao}</p>
                </div>
              )}
              {instrucoes.estatisticas && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">📊 Como verificar seu desempenho</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{instrucoes.estatisticas}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={dismissInst} size="lg" className="flex-1">Entendi, vamos começar!</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { localStorage.setItem(`instrucoes_${concursoId}`, "1"); setShowInstrucoes(false); }}
                  className="text-xs text-muted-foreground"
                >
                  Não mostrar novamente
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <AppShell>
        <div id="simulado-scroll" className="max-w-2xl mx-auto" style={{ scrollBehavior: "auto" }}>
          <h1 className="text-xl font-bold mb-6">{nome}</h1>
          {grupos.map((g: any, i: number) => (
            <DiscSection
              key={g.id}
              title={g.nome}
              icon={GRUPO_ICONS[i % GRUPO_ICONS.length]}
              color={GRUPO_COLORS[i % GRUPO_COLORS.length]}
              data={disciplinasByGrupo[g.id] || []}
            />
          ))}

          <Card className="sticky bottom-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">
                  {QTD_QUESTOES} questões por simulado
                </span>
                <span className="text-lg font-bold tabular-nums">{QTD_QUESTOES}</span>
              </div>
              <Button
                onClick={start}
                disabled={!selectedDisc.length && !selectedCont.length}
                size="lg"
                className="w-full"
                aria-label="Iniciar simulado"
              >
                Iniciar Simulado
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </>
  );
}
