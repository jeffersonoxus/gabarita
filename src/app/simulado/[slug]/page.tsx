"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, BookOpen, GraduationCap } from "lucide-react";

const surl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const skey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function SimuladoFilterPage() {
  const params = useParams();
  const router = useRouter();
  const slugParam = params.slug as string;

  const [concursoId, setConcursoId] = useState("");
  const [basicas, setBasicas] = useState<any[]>([]);
  const [especificas, setEspecificas] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [temEspecificas, setTemEspecificas] = useState(true);
  const [selectedDisc, setSelectedDisc] = useState<string[]>([]);
  const [selectedCont, setSelectedCont] = useState<string[]>([]);
  const [conteudos, setConteudos] = useState<Record<string, any[]>>({});
  const [qtd, setQtd] = useState(10);
  const [loading, setLoading] = useState(true);
  const [expandedDisc, setExpandedDisc] = useState<Set<string>>(new Set());
  const [questCounts, setQuestCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const sup = createBrowserClient(surl, skey);
    load(sup, slugParam);
  }, [slugParam]);

  async function load(sup: any, slug: string) {
    let con = null;
    // Try slug first
    let res = await sup.from("concursos").select("id, nome, tem_especificas").eq("slug", slug).maybeSingle();
    if (!res.data) {
      res = await sup.from("concursos").select("id, nome, tem_especificas").eq("id", slug).maybeSingle();
    }
    con = res.data;
    if (!con) { setLoading(false); return; }

    setConcursoId(con.id);
    setNome(con.nome);
    setTemEspecificas(con.tem_especificas !== false);

    const { data: d } = await sup.from("disciplinas").select("*").eq("concurso_id", con.id).order("tipo").order("nome");
    if (d) {
      setBasicas(d.filter((x: any) => x.tipo === "basica"));
      setEspecificas(d.filter((x: any) => x.tipo === "especifica"));
      const ids = d.map((x: any) => x.id);
      if (ids.length) {
        const { data: cont } = await sup.from("conteudos").select("id, nome, disciplina_id, parent_id").in("disciplina_id", ids).order("ordem").order("nome");
        if (cont) {
          const m: Record<string, any[]> = {};
          (cont as any[]).forEach((ct: any) => { if (!m[ct.disciplina_id]) m[ct.disciplina_id] = []; m[ct.disciplina_id].push(ct); });
          setConteudos(m);
        }
      }
      // Fetch question counts
      const allDiscIds = d.map((x: any) => x.id);
      const { data: counts } = await sup.from("questoes").select("disciplina_id, conteudo_id").eq("concurso_id", con.id).in("disciplina_id", allDiscIds);
      if (counts) {
        const qc: Record<string, number> = {};
        (counts as any[]).forEach((q: any) => {
          qc[q.disciplina_id] = (qc[q.disciplina_id] || 0) + 1;
          if (q.conteudo_id) qc[q.conteudo_id] = (qc[q.conteudo_id] || 0) + 1;
        });
        setQuestCounts(qc);
      }
    }
    setLoading(false);
  }

  const toggleExpand = (id: string) => { const container = document.getElementById("simulado-scroll"); const y = container?.scrollTop || window.scrollY; const s = new Set(expandedDisc); s.has(id) ? s.delete(id) : s.add(id); setExpandedDisc(s); requestAnimationFrame(() => { if (container) container.scrollTop = y; else window.scrollTo(0, y); }); };
  const toggleDisc = (id: string) => { const container = document.getElementById("simulado-scroll"); const y = container?.scrollTop || window.scrollY; setSelectedDisc(prev => { const n = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]; if (!n.includes(id)) { const cids = (conteudos[id] || []).map((c: any) => c.id); setSelectedCont(p => p.filter(x => !cids.includes(x))); } return n; }); requestAnimationFrame(() => { if (container) container.scrollTop = y; else window.scrollTo(0, y); }); };
  const childrenMap = new Map<string, string[]>();
  Object.values(conteudos).flat().filter((ct: any) => ct.parent_id).forEach((ct: any) => {
    if (!childrenMap.has(ct.parent_id)) childrenMap.set(ct.parent_id, []);
    childrenMap.get(ct.parent_id)!.push(ct.id);
  });

  const toggleCont = (id: string, isParent?: boolean) => {
    const container = document.getElementById("simulado-scroll");
    const y = container?.scrollTop || window.scrollY;
    setSelectedCont(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (isParent) {
        const kids = childrenMap.get(id) || [];
        return prev.includes(id) ? next.filter(x => !kids.includes(x)) : [...new Set([...next, ...kids])];
      }
      return next;
    });
    requestAnimationFrame(() => {
      if (container) container.scrollTop = y;
      else window.scrollTo(0, y);
    });
  };
  const start = () => {
    const f = new URLSearchParams(); f.set("qtd", String(qtd));
    if (selectedDisc.length) f.set("disc", selectedDisc.join(",")); if (selectedCont.length) f.set("cont", selectedCont.join(","));
    router.push(`/simulado/${slugParam}/exame?${f.toString()}`);
  };

  if (loading) return <AppShell><div className="flex items-center justify-center h-96 text-muted-foreground text-sm">Carregando...</div></AppShell>;

  const DiscSection = ({ title, icon: Icon, data, color }: { title: string; icon: any; data: any[]; color: string }) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <h2 className="font-semibold text-sm">{title}</h2>
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{data.length}</Badge>
        <button onClick={() => setSelectedDisc(prev => { const ids = data.map((d: any) => d.id); return ids.every(i => prev.includes(i)) ? prev.filter(x => !ids.includes(x)) : [...new Set([...prev, ...ids])]; })} className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
          {data.every((d: any) => selectedDisc.includes(d.id)) ? "Limpar" : "Todas"}
        </button>
      </div>
      <div className="space-y-2">
        {data.map((d: any) => {
          const dConts = conteudos[d.id] || [];
          const isOpen = expandedDisc.has(d.id);
          const sel = selectedDisc.includes(d.id);
          return (
            <Card key={d.id} className={sel ? "border-primary/50" : ""}>
              <CardContent className="p-0">
                <button onClick={() => toggleExpand(d.id)} onMouseDown={(e) => e.preventDefault()} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg">
                  <Checkbox checked={sel} onCheckedChange={() => toggleDisc(d.id)} onClick={e => e.stopPropagation()} />
                  <span className="text-sm flex-1">{d.nome} {questCounts[d.id] !== undefined ? <span className="text-[10px] text-muted-foreground ml-1 font-mono">({questCounts[d.id]})</span> : null}</span>
                  {dConts.length > 0 ? <span className="text-xs text-muted-foreground">{dConts.length} topicos</span> : <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">Em breve</Badge>}
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
                {isOpen && dConts.length > 0 && (
                  <div className="border-t px-4 py-3">
                    <div className="max-h-52 overflow-y-auto grid gap-2">
                      {dConts.map((ct: any) => (
                        <label key={ct.id} className="flex items-start gap-2.5 cursor-pointer py-1">
                          <Checkbox checked={selectedCont.includes(ct.id)} onCheckedChange={() => toggleCont(ct.id, !!(ct as any).isChild === false && childrenMap.has(ct.id))} className="mt-0.5" />
                          {(ct as any).isChild ? <span className="text-xs text-muted-foreground leading-relaxed ml-3">└ {ct.nome} {questCounts[ct.id] !== undefined ? <span className="text-[10px] font-medium ml-1 font-mono">({questCounts[ct.id]})</span> : null}</span> : <span className="text-xs text-muted-foreground leading-relaxed">{ct.nome} {questCounts[ct.id] !== undefined ? <span className="text-[10px] font-medium ml-1 font-mono">({questCounts[ct.id]})</span> : null}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {isOpen && dConts.length === 0 && <div className="border-t px-4 py-3 flex items-center gap-2"><Badge variant="secondary" className="text-[10px]">Em breve</Badge><span className="text-xs text-muted-foreground">Conteudos sendo preparados</span></div>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  return (
    <AppShell>
      <div id="simulado-scroll" className="max-w-2xl mx-auto" style={{ scrollBehavior: "auto" }}>
        <h1 className="text-xl font-bold mb-6">{nome}</h1>
        <DiscSection title="Conhecimentos Basicos" icon={BookOpen} data={basicas} color="text-blue-500" />
        {temEspecificas && <DiscSection title="Conhecimentos Especificos" icon={GraduationCap} data={especificas} color="text-purple-500" />}

        <Card className="sticky bottom-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-xs text-muted-foreground">Questoes</span>
              <input type="range" min={5} max={50} step={5} value={qtd} onChange={e => setQtd(Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="text-lg font-bold tabular-nums w-10 text-right">{qtd}</span>
            </div>
            <Button onClick={start} disabled={!selectedDisc.length && !selectedCont.length} size="lg" className="w-full">Iniciar Simulado</Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
