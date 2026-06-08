"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { Button } from "@/components/ui/button";
import LatexRenderer from "@/components/latex-renderer";
import "katex/dist/katex.min.css";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, ChevronLeft, ChevronRight, Flag, MessageCircle, ArrowLeft, ThumbsUp, ThumbsDown, Eye } from "lucide-react";
import Link from "next/link";

const surl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const skey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface Questao { id: string; enunciado: string; alternativa_a: string; alternativa_b: string; alternativa_c: string; alternativa_d: string; alternativa_e: string; gabarito: string; tipo: string; texto_apoio_id?: string; texto_apoio?: string; imagem_url?: string; disciplina_id?: string; conteudo_id?: string; }
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
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCid, setReportCid] = useState("");
  const [reportMotivo, setReportMotivo] = useState("");
  const [showApoio, setShowApoio] = useState(false);
  const [showImagem, setShowImagem] = useState(false);
  const [concursoNome, setConcursoNome] = useState("");
  const [pontuacaoTipo, setPontuacaoTipo] = useState("tradicional");
  const [discMap, setDiscMap] = useState<Record<string,string>>({});
  const [contMap, setContMap] = useState<Record<string,string>>({});
  const [textoApoioMap, setTextoApoioMap] = useState<Record<string,string>>({});
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [novoTexto, setNovoTexto] = useState("");
  const [votos, setVotos] = useState<Record<string, number>>({});
  const [userVotos, setUserVotos] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState("");
  const [userProfile, setUserProfile] = useState<{ nome: string; avatar_url: string | null; role: string } | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const tr = useRef<any>(null);
  const t0 = useRef(Date.now());

  useEffect(() => {
    const sup = createBrowserClient(surl, skey);
    (async () => {
      const { data: { user } } = await sup.auth.getUser();
      if (user) { setUserId(user.id); const { data: p } = await sup.from("profiles").select("nome, avatar_url, role").eq("id", user.id).maybeSingle(); if (p) setUserProfile(p); }

      let con = (await sup.from("concursos").select("id, nome, pontuacao_tipo").eq("slug", slugParam).maybeSingle()).data;
      if (!con) con = (await sup.from("concursos").select("id, nome, pontuacao_tipo").eq("id", slugParam).maybeSingle()).data;
      if (!con) { setLoading(false); return; }
      const concursoId = con.id;
      setCid(concursoId); setConcursoNome(con.nome); setPontuacaoTipo(con.pontuacao_tipo || "tradicional");

      let q = sup.from("questoes").select("id, concurso_id, disciplina_id, conteudo_id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, gabarito, tipo, texto_apoio_id, imagem_url, created_at").eq("concurso_id", concursoId);
      if (disc?.length) q = q.in("disciplina_id", disc.split(","));
      if (cont?.length) q = q.in("conteudo_id", cont.split(","));
      const { data, error } = await q;
      if (error || !data || data.length === 0) { setQs([]); setLoading(false); return; }

      // Group by content, shuffle, round-robin
      const groups = new Map<string, any[]>();
      data.forEach((q: any) => {
        const key = q.conteudo_id || q.disciplina_id || "geral";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(q);
      });
      for (const g of groups.values()) {
        for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
      }
      const keys = Array.from(groups.keys());
      const selected: any[] = []; let round = 0;
      while (selected.length < qtd) {
        let added = false;
        for (const key of keys) {
          if (selected.length >= qtd) break;
          const g = groups.get(key)!;
          if (round < g.length) { selected.push(g[round]); added = true; }
        }
        if (!added) break; round++;
      }
      const sh = selected.length > 0 ? [...selected].sort(() => Math.random() - 0.5) : [...data].sort(() => Math.random() - 0.5).slice(0, qtd);
      setQs(sh); setAns(sh.map((q: Questao) => ({ questao_id: q.id, resposta: "" }))); setTimer(sh.length * 180);

      if (sh.length) {
        const discIds = [...new Set(sh.map((q: any) => q.disciplina_id).filter(Boolean))];
        const contIds = [...new Set(sh.map((q: any) => q.conteudo_id).filter(Boolean))];
        if (discIds.length) { const { data: dd } = await sup.from("disciplinas").select("id,nome").in("id", discIds); if (dd) { const m: Record<string, string> = {}; dd.forEach((d: any) => { m[d.id] = d.nome; }); setDiscMap(m); } }
        if (contIds.length) { const { data: cc } = await sup.from("conteudos").select("id,nome").in("id", contIds); if (cc) { const m: Record<string, string> = {}; cc.forEach((d: any) => { m[d.id] = d.nome; }); setContMap(m); } }
        const taIds = [...new Set(sh.map((q: any) => q.texto_apoio_id).filter(Boolean))];
        if (taIds.length) { const { data: tt } = await sup.from("textos_apoio").select("id,texto").in("id", taIds); if (tt) { const m: Record<string, string> = {}; tt.forEach((t: any) => { m[t.id] = t.texto; }); setTextoApoioMap(m); } }
      }
      setLoading(false);
    })();
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
  const votar = async (cid: string, v: number) => {
    if (!userId) return;
    const sup = createBrowserClient(surl, skey);
    const existing = userVotos[cid];
    if (existing === v) { await sup.from("comentario_votos").delete().eq("comentario_id", cid).eq("user_id", userId); setVotos(prev => ({ ...prev, [cid]: (prev[cid]||0) - v })); setUserVotos(prev => { const n = {...prev}; delete n[cid]; return n; }); }
    else { await sup.from("comentario_votos").upsert({ comentario_id: cid, user_id: userId, voto: v }, { onConflict: "comentario_id,user_id" }); setVotos(prev => ({ ...prev, [cid]: (prev[cid]||0) + v - (existing||0) })); setUserVotos(prev => ({ ...prev, [cid]: v })); }
  };

  const abrirDenuncia = (cid: string) => { setReportCid(cid); setReportMotivo(""); setReportOpen(true); };

  const enviarDenuncia = async () => {
    if (!userId || !reportCid || !reportMotivo.trim()) return;
    const sup = createBrowserClient(surl, skey);
    await sup.from("denuncias").insert({ comentario_id: reportCid, user_id: userId, motivo: reportMotivo });
    setReportOpen(false); setReportMotivo("");
    toast.success("Comentário denunciado. O admin foi notificado.");
  };

  const deletarComentario = async (cid: string) => {
    if (!confirm("Apagar este comentario?")) return;
    const sup = createBrowserClient(surl, skey);
    await sup.from("comentarios").delete().eq("id", cid);
    setComentarios(prev => prev.filter(c => c.id !== cid));
  };

  const sendComment = async () => { if (!novoTexto.trim() || !userId) return; const sup = createBrowserClient(surl, skey); const { data } = await sup.from("comentarios").insert({ questao_id: qs[idx].id, user_id: userId, user_name: userProfile?.nome || "Usuário", user_avatar: userProfile?.avatar_url || null, texto: novoTexto }).select("id, questao_id, user_id, user_name, user_avatar, texto, created_at").single(); if (data) { data.user_id = userId; setComentarios(prev => [...prev, data]); } setNovoTexto(""); };

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
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={finalizar}><Flag className="w-3 h-3 mr-1" />Finalizar</Button>
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

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-3 overflow-hidden">
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Questao {idx + 1}</span>
                <span className="text-[10px] text-muted-foreground truncate ml-2 hidden sm:inline">{concursoNome}</span>
                {(textoApoioMap[q.texto_apoio_id || ""] || q.imagem_url) && (
                  <div className="flex gap-1">
                    {textoApoioMap[q.texto_apoio_id || ""] && <Button variant="outline" size="sm" onClick={() => setShowApoio(true)} className="h-7 text-xs gap-1 border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 transition-all group">
                      <Eye className="w-3 h-3 group-hover:scale-110 transition-transform" />Ver o texto
                    </Button>}
                    {q.imagem_url && <Button variant="outline" size="sm" onClick={() => setShowImagem(true)} className="h-7 text-xs gap-1 border-sky-500/50 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950 transition-all group">
                      <Eye className="w-3 h-3 group-hover:scale-110 transition-transform" />Ver a imagem
                    </Button>}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {discMap[q.disciplina_id || ""] && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary font-medium">{discMap[q.disciplina_id || ""]}</span>}
                {q.conteudo_id && contMap[q.conteudo_id] && (
                  <>
                    <span className="text-[10px] text-muted-foreground">&gt;</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{contMap[q.conteudo_id]}</span>
                  </>
                )}
              </div>
              <h3 className="text-base leading-relaxed font-medium text-justify"><LatexRenderer text={q.enunciado} /></h3>
            </CardContent>
          </Card>

          

          <div className="mt-4 px-1">
            <Separator className="my-3" />
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> Comentários ({comentarios.length})
            </button>
            {showComments && (
              <div className="mt-3 space-y-2 pb-2">
                {comentarios.map((c: any) => (
                  <div key={c.id} className="bg-muted/50 rounded-lg p-2.5 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium flex items-center gap-1.5">
                        {c.user_avatar || userAvatars[c.user_id] || (c.user_id === userId && userProfile?.avatar_url) ? (
                          <img src={c.user_avatar || userAvatars[c.user_id] || userProfile?.avatar_url} className="w-5 h-5 rounded-full" alt="" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium">{(c.user_name || userNames[c.user_id] || "U")[0]}</span>
                        )}
                        {c.user_name || userNames[c.user_id] || "Usuario"}
                      </span>
                      <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                      <div className="ml-auto flex items-center gap-1">
                        <button onClick={() => votar(c.id, 1)} className={`p-1 rounded hover:bg-muted transition-colors ${userVotos[c.id] === 1 ? "text-emerald-500" : "text-muted-foreground"}`} title="Util"><ThumbsUp className="w-4 h-4" fill={userVotos[c.id] === 1 ? "currentColor" : "none"} /></button>
                        <span className="text-[11px] min-w-[16px] text-center tabular-nums">{votos[c.id] || 0}</span>
                        <button onClick={() => votar(c.id, -1)} className={`p-1 rounded hover:bg-muted transition-colors ${userVotos[c.id] === -1 ? "text-red-500" : "text-muted-foreground"}`} title="Nao util"><ThumbsDown className="w-4 h-4" fill={userVotos[c.id] === -1 ? "currentColor" : "none"} /></button>
                        <button onClick={() => abrirDenuncia(c.id)} className="p-0.5 rounded hover:bg-muted text-muted-foreground" title="Denunciar"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/></svg></button>
                        {(c.user_id === userId || (userProfile && userProfile.role === "admin")) && (
                          <button onClick={() => deletarComentario(c.id)} className="p-0.5 rounded hover:bg-muted text-muted-foreground" title="Apagar"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                        )}
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">{c.texto}</p>
                  </div>
                ))}
                {userId && <div className="flex gap-2"><input value={novoTexto} onChange={e => setNovoTexto(e.target.value)} onKeyDown={e => e.key==="Enter"&&sendComment()} placeholder="Comentar..." className="flex-1 text-xs border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring" /><Button size="sm" onClick={sendComment}>Enviar</Button></div>}
              </div>
            )}
          </div>
        </div>

        {/* Sticky bottom: alternatives + nav */}
        <div className="py-2 px-2 border-t bg-background space-y-2 pb-safe">
          <div className="flex gap-2">
            {["A","B"].map(alt => {
              const sel = r?.resposta === alt;
              const txt = q[("alternativa_"+alt.toLowerCase()) as keyof Questao] as string;
              if (!txt) return null;
              return (
                <button key={alt} onClick={() => respond(q.id, alt)}
                  className={`flex-1 text-center p-3 rounded-lg border text-base font-medium transition-all active:scale-[0.98] ${
                    sel?"bg-primary text-primary-foreground border-primary":"hover:bg-muted border-border bg-card"}`}>
                  {alt === "A" ? "✓ Certo" : "✗ Errado"}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" size="sm" onClick={() => setIdx(i => Math.max(0, i-1))} disabled={idx===0}><ChevronLeft className="w-4 h-4 mr-1" /><span className="text-sm">Anterior</span></Button>
            <Button size="sm" onClick={() => idx===qs.length-1 ? finalizar() : setIdx(i => i+1)}>
              {idx===qs.length-1 ? <><Flag className="w-4 h-4 mr-1" /><span className="text-sm">Finalizar</span></> : <><span className="text-sm">Próxima</span><ChevronRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        </div>
      </main>

      {showApoio && q && textoApoioMap[q.texto_apoio_id || ""] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowApoio(false)}>
          <div className="bg-card border rounded-card p-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-sm">Texto de apoio — Questão {idx + 1}</h3><Button variant="ghost" size="sm" onClick={() => setShowApoio(false)}>✕</Button></div>
            <div className="text-base text-muted-foreground whitespace-pre-wrap border-l-2 border-muted pl-3 italic leading-relaxed text-justify">{textoApoioMap[q.texto_apoio_id || ""]}</div>
          </div>
        </div>
      )}

      {showImagem && q && q.imagem_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImagem(false)}>
          <div className="max-w-[90vw] max-h-[90vh] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2"><span className="text-xs text-white/70">Questão {idx + 1}</span><Button variant="ghost" size="sm" className="text-white" onClick={() => setShowImagem(false)}>✕</Button></div>
            <img src={q.imagem_url} className="max-w-full max-h-[85vh] rounded-lg" alt="" />
          </div>
        </div>
      )}

      {reportOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setReportOpen(false)}>
          <div className="bg-card border rounded-card p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-2">Denunciar comentário</h3>
            <p className="text-xs text-muted-foreground mb-3">Descreva o motivo da denúncia:</p>
            <textarea value={reportMotivo} onChange={e => setReportMotivo(e.target.value)} rows={3} placeholder="Ex: Spam, ofensa, conteúdo impróprio..." className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring mb-3" autoFocus />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setReportOpen(false)}>Cancelar</Button>
              <Button variant="destructive" size="sm" onClick={enviarDenuncia} disabled={!reportMotivo.trim()}>Enviar denúncia</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return <div className="bg-muted rounded-lg p-3"><div className={`text-xl font-bold ${color}`}>{value}</div><div className="text-[10px] text-muted-foreground">{label}</div></div>;
}
