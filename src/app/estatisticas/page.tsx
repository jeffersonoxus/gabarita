"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, AlertTriangle, TrendingUp, Calendar, Clock, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const surl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const skey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function EstatisticasPage() {
  const [allConcursos, setAllConcursos] = useState<any[]>([]);
  const [concursoId, setConcursoId] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetLevel, setResetLevel] = useState("tudo");
  const [resetTarget, setResetTarget] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const sup = createBrowserClient(surl, skey);
    const { data: { user } } = await sup.auth.getUser();
    if (!user) return setLoading(false);
    const { data: sims } = await sup.from("simulados").select("id, concurso_id, total_questoes, acertos, created_at").eq("user_id", user.id).eq("finalizado", true).order("created_at", { ascending: false });
    if (!sims || sims.length === 0) return setLoading(false);

    const concursoIds = [...new Set(sims.map((s: any) => s.concurso_id))];
    const { data: concs } = await sup.from("concursos").select("id, nome").in("id", concursoIds);
    if (concs) setAllConcursos(concs);

    const activeCid = concs?.[0]?.id || "";
    setConcursoId(activeCid);
    await buildStats(sims, activeCid);
    setLoading(false);
  }

  async function handleConcursoChange(v: string) {
    setConcursoId(v);
    const sup = createBrowserClient(surl, skey);
    const { data: { user } } = await sup.auth.getUser();
    if (!user) return;
    const { data: sims } = await sup.from("simulados").select("id, concurso_id, total_questoes, acertos, created_at").eq("user_id", user.id).eq("finalizado", true);
    if (sims) await buildStats(sims, v);
  }

  async function buildStats(sims: any[], cid: string) {
    const sup = createBrowserClient(surl, skey);
    const filteredSims = cid ? sims.filter((s: any) => s.concurso_id === cid) : sims;
    const simIds = filteredSims.map((s: any) => s.id);
    const { data: resps } = await sup.from("respostas").select("*, questoes(disciplina_id, conteudo_id)").in("simulado_id", simIds);
    if (!resps) return;

    const discIds = new Set<string>(); const contIds = new Set<string>();
    resps.forEach((r: any) => { if (r.questoes?.disciplina_id) discIds.add(r.questoes.disciplina_id); if (r.questoes?.conteudo_id) contIds.add(r.questoes.conteudo_id); });

    const [{ data: discs }, { data: conts }] = await Promise.all([
      sup.from("disciplinas").select("id, nome, tipo").in("id", [...discIds]),
      sup.from("conteudos").select("id, nome").in("id", [...contIds]),
    ]);
    const discMap: Record<string, any> = {}; if (discs) discs.forEach(d => discMap[d.id] = d);
    const contMap: Record<string, string> = {}; if (conts) conts.forEach(c => contMap[c.id] = c.nome);

    const dStats: Record<string, { t: number; a: number; tipo: string; nome: string }> = {};
    const cStats: Record<string, { t: number; a: number; nome: string; dNome: string }> = {};
    const porDia: Record<string, number> = {};
    const porSemana: Record<string, number> = {};
    let totalG = 0, acertosG = 0;

    for (const r of resps) {
      const q = (r as any).questoes; if (!q) continue;
      totalG++; if (r.correta) acertosG++;
      if (q.disciplina_id) { if (!dStats[q.disciplina_id]) dStats[q.disciplina_id] = { t: 0, a: 0, tipo: discMap[q.disciplina_id]?.tipo || "especifica", nome: discMap[q.disciplina_id]?.nome || "" }; dStats[q.disciplina_id].t++; if (r.correta) dStats[q.disciplina_id].a++; }
      if (q.conteudo_id) { if (!cStats[q.conteudo_id]) cStats[q.conteudo_id] = { t: 0, a: 0, nome: contMap[q.conteudo_id] || "", dNome: discMap[q.disciplina_id]?.nome || "" }; cStats[q.conteudo_id].t++; if (r.correta) cStats[q.conteudo_id].a++; }
    }

    filteredSims.forEach((s: any) => {
      const d = new Date(s.created_at);
      porDia[d.toLocaleDateString("pt-BR")] = (porDia[d.toLocaleDateString("pt-BR")] || 0) + s.total_questoes;
      const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
      porSemana[ws.toLocaleDateString("pt-BR")] = (porSemana[ws.toLocaleDateString("pt-BR")] || 0) + s.total_questoes;
    });

    setStats({
      geral: { total: totalG, acertos: acertosG, pct: totalG > 0 ? Math.round((acertosG / totalG) * 100) : 0 },
      disciplinas: Object.entries(dStats).map(([id, v]) => ({ id, ...v, pct: Math.round((v.a / v.t) * 100) })).sort((a, b) => b.t - a.t),
      conteudos: Object.entries(cStats).map(([id, v]) => ({ id, ...v, pct: Math.round((v.a / v.t) * 100) })).sort((a, b) => b.t - a.t),
      dia: Object.values(porDia).pop() || 0,
      semana: Object.values(porSemana).pop() || 0,
    });
  }

  function startCountdown() {
    setResetting(true);
    setCountdown(10);
    let cd = 10;
    const interval = setInterval(() => {
      cd--; setCountdown(cd);
      if (cd <= 0) clearInterval(interval);
    }, 1000);
  }

  async function doReset() {
    const sup = createBrowserClient(surl, skey);
    const { data: { user } } = await sup.auth.getUser();
    if (!user) return;

    let query = sup.from("simulados").delete().eq("user_id", user.id);

    if (resetLevel === "concurso" && resetTarget) {
      query = query.eq("concurso_id", resetTarget);
    }

    await query;
    setResetting(false); setResetOpen(false); setCountdown(0);
    // Reload stats
    loadData();
  }

  const colorPct = (p: number) => p >= 80 ? "text-emerald-500" : p >= 60 ? "text-amber-500" : "text-red-500";
  const bgPct = (p: number) => p >= 80 ? "bg-emerald-500" : p >= 60 ? "bg-amber-500" : "bg-red-500";

  if (loading) return <AppShell><div className="flex items-center justify-center h-96 text-muted-foreground">Carregando...</div></AppShell>;
  if (!stats) return <AppShell><div className="max-w-5xl mx-auto py-16 text-center text-muted-foreground"><p className="font-medium">Nenhum simulado finalizado</p></div></AppShell>;

  const g = stats.geral;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Estatisticas</h1>
          <Button variant="outline" size="sm" onClick={() => setResetOpen(true)} className="text-xs gap-1.5"><Trash2 className="w-3.5 h-3.5" />Resetar</Button>
          {allConcursos.length > 0 && (
            <select value={concursoId} onChange={e => handleConcursoChange(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-background w-[220px]">
                {allConcursos.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
          )}
        </div>

        {/* Stat cards - inline horizontal */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-3 bg-card border rounded-xl px-5 py-3 flex-1 min-w-[140px]">
            <Trophy className={`w-5 h-5 shrink-0 ${colorPct(g.pct)}`} />
            <div><div className="text-lg font-bold">{g.pct}%</div><div className="text-xs text-muted-foreground">Aproveitamento</div></div>
          </div>
          <div className="flex items-center gap-3 bg-card border rounded-xl px-5 py-3 flex-1 min-w-[140px]">
            <Target className="w-5 h-5 shrink-0 text-emerald-500" />
            <div><div className="text-lg font-bold">{g.acertos}</div><div className="text-xs text-muted-foreground">Acertos</div></div>
          </div>
          <div className="flex items-center gap-3 bg-card border rounded-xl px-5 py-3 flex-1 min-w-[140px]">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <div><div className="text-lg font-bold">{g.total - g.acertos}</div><div className="text-xs text-muted-foreground">Erros</div></div>
          </div>
          <div className="flex items-center gap-3 bg-card border rounded-xl px-5 py-3 flex-1 min-w-[140px]">
            <TrendingUp className="w-5 h-5 shrink-0 text-blue-500" />
            <div><div className="text-lg font-bold">{g.total}</div><div className="text-xs text-muted-foreground">Questoes</div></div>
          </div>
        </div>

        {/* Daily/Weekly counters */}
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-card border rounded-xl px-4 py-2.5">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm">{stats.dia}<span className="text-xs text-muted-foreground ml-1.5">hoje</span></span>
          </div>
          <div className="flex items-center gap-2 bg-card border rounded-xl px-4 py-2.5">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm">{stats.semana}<span className="text-xs text-muted-foreground ml-1.5">esta semana</span></span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="disciplinas">
          <TabsList>
            <TabsTrigger value="disciplinas">Disciplinas ({stats.disciplinas.length})</TabsTrigger>
            <TabsTrigger value="conteudos">Conteudos ({stats.conteudos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="disciplinas" className="mt-4 space-y-3">
            {stats.disciplinas.map((d: any) => (
              <Card key={d.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${d.tipo === "basica" ? "bg-blue-500" : "bg-purple-500"}`} />
                      <span className="text-sm font-medium truncate">{d.nome}</span>
                    </div>
                    <span className={`text-sm font-bold ml-3 tabular-nums ${colorPct(d.pct)}`}>{d.pct}%</span>
                  </div>
                  <Progress value={d.pct} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                    <span>{d.a} acertos</span><span>{d.t} questoes</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="conteudos" className="mt-4">
            <Card>
              <CardContent className="p-0 max-h-[65vh] overflow-y-auto">
                {stats.conteudos.map((c: any, i: number) => (
                  <div key={c.id || i} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0 mr-3"><p className="text-sm truncate">{c.nome}</p><p className="text-xs text-muted-foreground">{c.dNome}</p></div>
                    <span className="text-xs text-muted-foreground tabular-nums mr-4">{c.a}/{c.t}</span>
                    <span className={`text-sm font-bold tabular-nums w-12 text-right ${colorPct(c.pct)}`}>{c.pct}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {/* Reset Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Resetar Estatisticas</DialogTitle><DialogDescription>Isso apagara seu progresso permanentemente.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-3">
            {!resetting ? (<>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Escopo</label>
                <select value={resetLevel} onChange={e => setResetLevel(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="tudo">Tudo (todos os concursos)</option>
                  <option value="concurso">Por concurso especifico</option>
                </select>
              </div>
              {resetLevel === "concurso" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">Concurso</label>
                  <select value={resetTarget} onChange={e => setResetTarget(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-background">
                    <option value="">Selecione...</option>
                    {allConcursos.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full" onClick={startCountdown} disabled={resetLevel === "concurso" && !resetTarget}>
                Iniciar contagem
              </Button>
            </>) : (
              <div className="text-center py-4 space-y-3">
                <div className="text-4xl font-bold text-destructive">{countdown}</div>
                <p className="text-xs text-muted-foreground">Aguarde {countdown}s para liberar a exclusao.</p>
                <Button variant="destructive" size="sm" className="w-full" onClick={doReset} disabled={countdown > 0}>
                  {countdown > 0 ? `Aguarde ${countdown}s` : "Confirmar exclusao"}
                </Button>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setResetting(false); setCountdown(0); }}>Cancelar</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
