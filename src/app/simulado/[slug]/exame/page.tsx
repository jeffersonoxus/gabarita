"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, ChevronLeft, ChevronRight, Flag, MessageCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

const surl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const skey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface Questao { id: string; enunciado: string; alternativa_a: string; alternativa_b: string; alternativa_c: string; alternativa_d: string; alternativa_e: string; gabarito: string; tipo: string; }
interface Resp { questao_id: string; resposta: string; }

export default function ExamPageWrapper() { return <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>}><ExamPage /></Suspense>; }

function ExamPage() {
  const p = useParams(); const sp = useSearchParams(); const router = useRouter();
  const slugParam = p.slug as string;
  const qtd = Number(sp.get("qtd")) || 10; const disc = sp.get("disc"); const cont = sp.get("cont"); const [cid, setCid] = useState("");

  const [qs, setQs] = useState<Questao[]>([]);
  const [idx, setIdx] = useState(0);
  const [ans, setAns] = useState<Resp[]>([]);
  const [timer, setTimer] = useState(0);
  const [done, setDone] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [showGab, setShowGab] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [novoTexto, setNovoTexto] = useState("");
  const [userId, setUserId] = useState("");
  const [userProfile, setUserProfile] = useState<{ nome: string; avatar_url: string | null } | null>(null);
  const tr = useRef<any>(null);
  const t0 = useRef(Date.now());

  useEffect(() => {
    const sup = createBrowserClient(surl, skey);
    sup.auth.getUser().then(({ data }) => { if (data.user) { setUserId(data.user.id); sup.from("profiles").select("nome, avatar_url").eq("id", data.user.id).maybeSingle().then(({ data: p }) => { if (p) setUserProfile(p); }); } });
    sup.from("concursos").select("id").eq("slug", slugParam).maybeSingle().then(async ({ data: con }) => { if (!con) { const res = await sup.from("concursos").select("id").eq("id", slugParam).maybeSingle(); con = res.data; }
      if (!con) return setLoading(false);
      const concursoId = con.id;
      setCid(concursoId);
      let q = sup.from("questoes").select("*").eq("concurso_id", concursoId);
    if (disc?.length) q = q.in("disciplina_id", disc.split(","));
    if (cont?.length) q = q.in("conteudo_id", cont.split(","));
    q.limit(qtd).then(({ data }: any) => { if (data) { const sh = [...data].sort(() => Math.random() - 0.5); setQs(sh); setAns(sh.map((q: Questao) => ({ questao_id: q.id, resposta: "" }))); setTimer(qtd * 180); } setLoading(false); }); });
  }, [cid, qtd, disc, cont]);

  useEffect(() => { if (loading || done) return; tr.current = setInterval(() => setTimer((t: number) => t <= 1 ? (clearInterval(tr.current), finalizar(), 0) : t - 1), 1000); return () => clearInterval(tr.current); }, [loading, done]);

  useEffect(() => { if (!qs.length || done) return; createBrowserClient(surl, skey).from("comentarios").select("*").eq("questao_id", qs[idx]?.id).order("created_at", { ascending: true }).then(({ data }: any) => setComentarios(data || [])); }, [idx, qs]);

  const finalizar = useCallback(async () => {
    if (done || tr.current) clearInterval(tr.current); if (done) return;
    const t = Math.floor((Date.now() - t0.current) / 1000);
    const fin = ans.map(r => ({ ...r, correta: r.resposta === qs.find(q => q.id === r.questao_id)?.gabarito }));
    const a = fin.filter(r => r.correta).length; const e = qs.length - a; const n = parseFloat(((a / qs.length) * 100).toFixed(1));
    setResultado({ acertos: a, erros: e, nota: n }); setDone(true);
    const sup = createBrowserClient(surl, skey); const { data: { user } } = await sup.auth.getUser(); if (!user) return;
    const { data: sim } = await sup.from("simulados").insert({ user_id: user.id, concurso_id: cid, total_questoes: qs.length, acertos: a, erros: e, nota: n, tempo_gasto_segundos: t, finalizado: true }).select("id").single();
    if (sim) await sup.from("respostas").insert(fin.map(r => ({ simulado_id: sim.id, questao_id: r.questao_id, resposta: r.resposta, correta: r.correta })));
  }, [done, ans, qs, cid]);

  const respond = (qid: string, alt: string) => setAns(prev => prev.map(r => r.questao_id === qid ? { ...r, resposta: alt } : r));
  const sendComment = async () => { if (!novoTexto.trim() || !userId) return; const sup = createBrowserClient(surl, skey); const { data } = await sup.from("comentarios").insert({ questao_id: qs[idx].id, user_id: userId, texto: novoTexto }).select("*").single(); if (data) { data.user_id = userId; setComentarios(prev => [...prev, data]); } setNovoTexto(""); };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Carregando questões...</div>;
  if (!qs.length) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p className="text-muted-foreground mb-4">Sem questões.</p><Link href={`/simulado/${slugParam}`} className="text-sm text-primary">&larr; Voltar</Link></div></div>;

  if (done && resultado) return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto">
        <Card className="mb-4">
          <CardContent className="p-8 text-center">
            <Badge variant="outline" className="mb-3">Resultado</Badge>
            <div className="text-7xl font-bold mb-2" style={{ color: resultado.nota >= 70 ? "hsl(var(--success))" : resultado.nota >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>{resultado.nota}%</div>
            <p className="text-sm text-muted-foreground mb-6">{resultado.nota >= 70 ? "Excelente!" : resultado.nota >= 50 ? "Continue estudando" : "Estude mais"}</p>
            <div className="grid grid-cols-3 gap-3">
              <StatBox value={resultado.acertos} label="Acertos" color="text-emerald-500" />
              <StatBox value={resultado.erros} label="Erros" color="text-red-500" />
              <StatBox value={qs.length} label="Total" color="text-foreground" />
            </div>
          </CardContent>
        </Card>
        {showGab && qs.map((q, i) => {
          const r = ans.find(x => x.questao_id === q.id); const ok = r?.resposta === q.gabarito;
          return <Card key={q.id} className={`mb-2 border-l-4 ${ok ? "border-l-emerald-500" : "border-l-destructive"}`}><CardContent className="p-3 text-sm"><p className="text-muted-foreground text-xs mb-1">Questão {i+1}</p><p className="mb-2">{q.enunciado.substring(0, 150)}{q.enunciado.length>150?"...":""}</p><p className="text-xs">Sua: <b className={ok?"text-emerald-500":"text-destructive"}>{r?.resposta||"-"}</b> | Gabarito: <b>{q.gabarito}</b></p></CardContent></Card>;
        })}
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          <Button variant="outline" size="sm" onClick={() => setShowGab(!showGab)}>{showGab ? "Ocultar" : "Ver Gabarito"}</Button>
          <Link href={`/simulado/${slugParam}`}><Button size="sm">Novo Simulado</Button></Link>
          <Link href="/estatisticas"><Button variant="ghost" size="sm">Estatísticas</Button></Link>
          <Link href="/hub"><Button variant="ghost" size="sm">Hub</Button></Link>
        </div>
      </div>
    </div>
  );

  const q = qs[idx]; const r = ans[idx]; const respondidas = ans.filter(x => x.resposta !== "").length;
  const pctDone = Math.round((respondidas / qs.length) * 100);
  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto h-12 flex items-center justify-between px-3 gap-2">
          <Link href={`/simulado/${slugParam}`} className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1 mx-3"><Progress value={pctDone} className="h-1.5" /></div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono tabular-nums">{idx+1}/{qs.length}</span>
            <span className={`flex items-center gap-1 text-xs font-mono tabular-nums ${timer<60?"text-destructive font-bold":"text-muted-foreground"}`}><Clock className="w-3 h-3" />{fmt(timer)}</span>
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => { if (confirm("Finalizar simulado?")) finalizar(); }}><Flag className="w-3 h-3 mr-1" />Finalizar</Button>
          </div>
        </div>
      </header>

      <div className="bg-muted/50 border-b px-3 py-1.5 overflow-x-auto">
        <div className="max-w-2xl mx-auto flex gap-1">
          {qs.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`w-7 h-7 rounded text-[10px] font-medium flex-shrink-0 transition-all ${
              i===idx?"bg-primary text-primary-foreground":ans[i]?.resposta?"bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/50":"bg-muted text-muted-foreground hover:bg-muted-foreground/20"}`}>{i+1}</button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full p-3">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm leading-relaxed font-medium mb-5">{q.enunciado}</h3>
            <div className="space-y-2">
              {["A","B","C","D","E"].map(alt => {
                const sel = r?.resposta === alt;
                const txt = q[("alternativa_"+alt.toLowerCase()) as keyof Questao] as string;
                if (!txt) return null;
                return (
                  <button key={alt} onClick={() => respond(q.id, alt)}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-all active:scale-[0.99] ${
                      sel?"bg-primary text-primary-foreground border-primary":"hover:bg-muted border-border"}`}>
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2.5 ${sel?"bg-primary-foreground/20":"bg-muted-foreground/10 text-muted-foreground"}`}>{alt}</span>{txt}
                  </button>
                );
              })}
            </div>

            <Separator className="my-4" />
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> Comentários ({comentarios.length})
            </button>
            {showComments && (
              <div className="mt-3 space-y-2">
                {comentarios.map((c: any) => (
                  <div key={c.id} className="bg-muted/50 rounded-lg p-2.5 text-xs">
                    <div className="flex items-center gap-2 mb-1">{c.user_id === userId && userProfile ? (<span className="font-medium flex items-center gap-1.5">{userProfile.avatar_url ? <img src={userProfile.avatar_url} className="w-4 h-4 rounded-full" alt="" /> : null}{userProfile.nome}</span>) : <span className="font-medium">Usuário</span>}<span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span></div>
                    <p className="text-muted-foreground">{c.texto}</p>
                  </div>
                ))}
                {userId && <div className="flex gap-2"><input value={novoTexto} onChange={e => setNovoTexto(e.target.value)} onKeyDown={e => e.key==="Enter"&&sendComment()} placeholder="Comentar..." className="flex-1 text-xs border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring" /><Button size="sm" onClick={sendComment}>Enviar</Button></div>}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-4 pb-4">
          <Button variant="outline" size="sm" onClick={() => setIdx(i => Math.max(0, i-1))} disabled={idx===0}><ChevronLeft className="w-4 h-4 mr-1" />Anterior</Button>
          <Button size="sm" onClick={() => idx===qs.length-1 ? (confirm("Finalizar?")?finalizar():null) : setIdx(i => i+1)}>
            {idx===qs.length-1 ? <><Flag className="w-4 h-4 mr-1" />Finalizar</> : <>Próxima<ChevronRight className="w-4 h-4 ml-1" /></>}
          </Button>
        </div>
      </main>
    </div>
  );
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return <div className="bg-muted rounded-lg p-3"><div className={`text-xl font-bold ${color}`}>{value}</div><div className="text-[10px] text-muted-foreground">{label}</div></div>;
}
