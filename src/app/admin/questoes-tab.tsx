"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const surl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const skey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
function s() { return createBrowserClient(surl, skey); }

export default function QuestoesTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [concursos, setConcursos] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [conteudos, setConteudos] = useState<any[]>([]);
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [filterConcurso, setFilterConcurso] = useState("");
  const [filterDisciplina, setFilterDisciplina] = useState("");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState({ concurso_id:"", disciplina_id:"", conteudo_id:"", enunciado:"", alternativa_a:"", alternativa_b:"", alternativa_c:"", alternativa_d:"", alternativa_e:"", gabarito:"A", tipo:"certo_errado" });
  // Bulk state
  const [bulkDisc, setBulkDisc] = useState("");
  const [bulkCont, setBulkCont] = useState("");
  const [bulkTipo, setBulkTipo] = useState("certo_errado");
  const [bulkText, setBulkText] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  useEffect(() => { s().from("concursos").select("id,nome").order("nome").then(({data})=>{if(data)setConcursos(data);}); loadQuestoes(); }, []);
  useEffect(() => { if(filterConcurso) loadDisciplinas(filterConcurso); }, [filterConcurso]);
  useEffect(() => { loadQuestoes(); }, [filterDisciplina, filterConcurso]);

  async function loadDisciplinas(cid: string) {
    const { data } = await s().from("disciplinas").select("id,nome,tipo").eq("concurso_id", cid).order("nome");
    if(data) setDisciplinas(data);
  }
  async function loadConteudos(did: string) {
    const { data } = await s().from("conteudos").select("id,nome").eq("disciplina_id", did).order("nome");
    if(data) setConteudos(data);
  }
  async function loadQuestoes() {
    let q = s().from("questoes").select("*, disciplinas(nome)").order("created_at",{ascending:false}).limit(100);
    if(filterConcurso) q = q.eq("concurso_id", filterConcurso);
    if(filterDisciplina) q = q.eq("disciplina_id", filterDisciplina);
    if(search) q = q.ilike("enunciado", `%${search}%`);
    const { data } = await q; if(data) setQuestoes(data);
  }

  // When form disciplina changes, load conteudos
  useEffect(() => { if(form.disciplina_id) loadConteudos(form.disciplina_id); else setConteudos([]); }, [form.disciplina_id]);
  // When bulk disciplina changes, load conteudos
  useEffect(() => { if(bulkDisc) loadConteudos(bulkDisc); }, [bulkDisc]);

  function newQ() {
    const cid = filterConcurso || concursos[0]?.id || "";
    setForm({ concurso_id: cid, disciplina_id:"", conteudo_id:"", enunciado:"", alternativa_a:"", alternativa_b:"", alternativa_c:"", alternativa_d:"", alternativa_e:"", gabarito:"A", tipo:"certo_errado" });
    setEditId(null); setShowForm(true); setConteudos([]);
    if(cid) loadDisciplinas(cid);
  }
  function edit(q: any) {
    setForm({ concurso_id: q.concurso_id, disciplina_id: q.disciplina_id, conteudo_id: q.conteudo_id||"", enunciado: q.enunciado, alternativa_a: q.alternativa_a, alternativa_b: q.alternativa_b, alternativa_c: q.alternativa_c||"", alternativa_d: q.alternativa_d||"", alternativa_e: q.alternativa_e||"", gabarito: q.gabarito, tipo: q.tipo });
    loadDisciplinas(q.concurso_id);
    if(q.disciplina_id) loadConteudos(q.disciplina_id);
    setEditId(q.id); setShowForm(true);
  }

  async function save() {
    if(!form.concurso_id||!form.disciplina_id||!form.enunciado) return;
    const payload = { ...form, conteudo_id: form.conteudo_id||null };
    if(editId) await s().from("questoes").update(payload).eq("id",editId);
    else await s().from("questoes").insert(payload);
    onMsg(editId?"Atualizada":"Criada");
    setShowForm(false); setEditId(null); loadQuestoes();
  }
  async function remove(id:string) { if(!confirm("Remover?"))return; await s().from("questoes").delete().eq("id",id); onMsg("Removida"); loadQuestoes(); }

  // ===== BULK =====
  function downloadCSV() {
    if(!bulkDisc) { onMsg("Selecione uma disciplina primeiro"); return; }
    const hdr = bulkTipo==="certo_errado"
      ? "enunciado|Certo|Errado|A"
      : "enunciado|Alt A|Alt B|Alt C|Alt D|Alt E|Gabarito";
    const ex = bulkTipo==="certo_errado"
      ? "A leitura e um processo de interacao entre leitor e texto|Certo|Errado|A"
      : "Capital do Brasil?|Brasilia|Sao Paulo|Rio de Janeiro|Salvador|Curitiba|A";
    const blob = new Blob([hdr+"\n"+ex+"\n"], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`modelo_${bulkTipo}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if(!file) return;
    setBulkFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l=>l.trim()&&!l.startsWith("enunciado|"));
      setBulkText(lines.join("\n"));
    };
    reader.readAsText(file);
  }

  async function bulkInsert() {
    if(!filterConcurso||!bulkDisc) { onMsg("Selecione concurso e disciplina"); return; }
    const lines = bulkText.split("\n").filter(l=>l.trim());
    const items = [];
    for(let i=0;i<lines.length;i++) {
      const parts = lines[i].split("|").map(s=>s.trim());
      if(bulkTipo==="certo_errado" && parts.length<3) continue;
      if(bulkTipo==="multipla_escolha" && parts.length<7) continue;
      let gab;
      if(bulkTipo==="certo_errado") {
        const last = parts[parts.length-1];
        gab = ["A","B","C","D","E"].includes(last?.toUpperCase()) ? last.toUpperCase() : (parts[2]==="Certo"?"A":"B");
      } else {
        gab = parts[6]?.toUpperCase();
      }
      if(!["A","B","C","D","E"].includes(gab)) continue;
      items.push({
        concurso_id: filterConcurso, disciplina_id: bulkDisc, conteudo_id: bulkCont||null,
        enunciado: parts[0], alternativa_a: parts[1]||"", alternativa_b: parts[2]||"",
        alternativa_c: parts[3]||"", alternativa_d: parts[4]||"", alternativa_e: parts[5]||"",
        gabarito: gab, tipo: bulkTipo,
      });
    }
    if(items.length) {
      const { error } = await s().from("questoes").insert(items);
      onMsg(error ? `Erro: ${error.message}` : `${items.length} questoes inseridas!`);
    } else onMsg("Nenhuma questao valida");
    setBulkText(""); setBulkFile(null); loadQuestoes();
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-card border rounded-card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">Concurso</label>
          <select value={filterConcurso} onChange={e=>{setFilterConcurso(e.target.value);setFilterDisciplina("");}} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Todos</option>{concursos.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">Disciplina</label>
          <select value={filterDisciplina} onChange={e=>setFilterDisciplina(e.target.value)} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Todas</option>{disciplinas.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
        <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">Buscar</label>
          <input placeholder="Texto..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&loadQuestoes()} className="border rounded px-3 py-2 text-sm bg-background w-40" /></div>
        <Button variant="outline" size="sm" onClick={loadQuestoes}>Filtrar</Button>
        <div className="ml-auto flex gap-2"><Button size="sm" onClick={newQ}>+ Nova</Button><Button size="sm" variant="outline" onClick={()=>setShowBulk(!showBulk)}>+ Lote</Button></div>
      </div>

      {/* Single Form */}
      {showForm && (<Card><CardContent className="p-6">
        <h3 className="font-bold mb-4">{editId?"Editar":"Nova"} Questao</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <select value={form.concurso_id} onChange={e=>{setForm({...form,concurso_id:e.target.value,disciplina_id:"",conteudo_id:""});loadDisciplinas(e.target.value);}} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Concurso *</option>{concursos.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          <select value={form.disciplina_id} onChange={e=>{setForm({...form,disciplina_id:e.target.value,conteudo_id:""});}} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Disciplina *</option>{disciplinas.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}</select>
          <select value={form.conteudo_id} onChange={e=>setForm({...form,conteudo_id:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Conteudo (opcional)</option>{conteudos.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
        </div>
        <textarea rows={4} placeholder="Enunciado *" value={form.enunciado} onChange={e=>setForm({...form,enunciado:e.target.value})} className="w-full border rounded px-3 py-2 text-sm bg-background mb-3" />
        {form.tipo==="multipla_escolha" ? (
          <div className="grid grid-cols-1 gap-2 mb-3">{(["a","b","c","d","e"] as const).map(alt=>{const k=`alternativa_${alt}` as keyof typeof form;return <input key={alt} placeholder={`Alt ${alt.toUpperCase()}`} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" />})}</div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mb-3"><input placeholder="Alt A (Certo)" value={form.alternativa_a} onChange={e=>setForm({...form,alternativa_a:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" /><input placeholder="Alt B (Errado)" value={form.alternativa_b} onChange={e=>setForm({...form,alternativa_b:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" /></div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">Gabarito</label><select value={form.gabarito} onChange={e=>setForm({...form,gabarito:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background">{["A","B","C","D","E"].map(a=><option key={a} value={a}>{a}</option>)}</select></div>
          <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">Tipo</label><select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background"><option value="certo_errado">Certo/Errado</option><option value="multipla_escolha">Multipla Escolha</option></select></div>
        </div>
        <div className="flex gap-2 mt-4"><Button size="sm" onClick={save} disabled={!form.enunciado||!form.disciplina_id}>Salvar</Button><Button size="sm" variant="ghost" onClick={()=>{setShowForm(false);setEditId(null);}}>Cancelar</Button></div>
      </CardContent></Card>)}

      {/* Bulk Upload */}
      {showBulk && (<Card><CardContent className="p-6">
        <h3 className="font-bold mb-4">Upload em Lote</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <select value={bulkDisc} onChange={e=>{setBulkDisc(e.target.value);setBulkCont("");}} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Disciplina *</option>{disciplinas.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}</select>
          <select value={bulkCont} onChange={e=>setBulkCont(e.target.value)} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Conteudo (opcional)</option>{conteudos.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          <select value={bulkTipo} onChange={e=>setBulkTipo(e.target.value)} className="border rounded px-3 py-2 text-sm bg-background"><option value="certo_errado">Certo/Errado</option><option value="multipla_escolha">Multipla Escolha</option></select>
          <Button size="sm" variant="outline" onClick={downloadCSV} disabled={!bulkDisc}>Baixar modelo</Button>
        </div>
        <div className="text-xs text-muted-foreground mb-2">
          {bulkTipo==="certo_errado"?"Formato: enunciado | Alt A | Alt B | Gabarito":"Formato: enunciado | Alt A | Alt B | Alt C | Alt D | Alt E | Gabarito"}
        </div>
        <div className="flex gap-2 mb-3">
          <input type="file" accept=".csv" onChange={handleFileUpload} className="text-xs border rounded px-3 py-2 bg-background flex-1" />
        </div>
        <textarea rows={6} value={bulkText} onChange={e=>setBulkText(e.target.value)} placeholder="Ou cole as questoes aqui, uma por linha, separadas por |" className="w-full border rounded px-3 py-2 text-sm font-mono bg-background mb-3" />
        <div className="flex gap-2"><Button size="sm" onClick={bulkInsert} disabled={!bulkText.trim()||!bulkDisc}>Enviar</Button><Button size="sm" variant="ghost" onClick={()=>{setShowBulk(false);setBulkText("");setBulkFile(null);}}>Cancelar</Button></div>
      </CardContent></Card>)}

      {/* List */}
      <Card><CardContent className="p-0">
        <table className="w-full text-sm"><thead className="border-b"><tr className="bg-muted/50"><th className="text-left p-3 w-12">#</th><th className="text-left p-3">Enunciado</th><th className="text-left p-3">Disciplina</th><th className="text-left p-3">Gab</th><th className="text-left p-3">Tipo</th><th className="text-left p-3 w-32">Acoes</th></tr></thead>
          <tbody>{questoes.map((q:any,i:number)=>(<tr key={q.id} className="border-b hover:bg-muted/30"><td className="p-3 text-xs text-muted-foreground">{i+1}</td><td className="p-3 text-xs max-w-xs truncate">{q.enunciado?.substring(0,100)}{q.enunciado?.length>100?"...":""}</td><td className="p-3 text-xs">{q.disciplinas?.nome||"-"}</td><td className="p-3 text-xs font-bold">{q.gabarito}</td><td className="p-3 text-xs">{q.tipo==="certo_errado"?"C/E":"A-E"}</td><td className="p-3"><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=>edit(q)}>Editar</Button><Button size="sm" variant="destructive" className="h-7 text-xs" onClick={()=>remove(q.id)}>X</Button></div></td></tr>))}</tbody></table>
      </CardContent></Card>
    </div>
  );
}
