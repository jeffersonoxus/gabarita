"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ImageUploader from "@/components/image-uploader";
import LatexRenderer from "@/components/latex-renderer";
import "katex/dist/katex.min.css";

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
  const [form, setForm] = useState({ concurso_id:"", disciplina_id:"", conteudo_id:"", enunciado:"", alternativa_a:"", alternativa_b:"", alternativa_c:"", alternativa_d:"", alternativa_e:"", gabarito:"A", tipo:"certo_errado", texto_apoio:"", imagem_url:"" });
  const [editId, setEditId] = useState<string|null>(null);
  const [showForm, setShowForm] = useState(false);
  // Bulk
  const [bulkDisc, setBulkDisc] = useState("");
  const [bulkCont, setBulkCont] = useState("");
  const [bulkTipo, setBulkTipo] = useState("certo_errado");
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [prevTexto, setPrevTexto] = useState(false);
  const [prevImg, setPrevImg] = useState(false);
  const [showCSV, setShowCSV] = useState(false);

  useEffect(() => { s().from("concursos").select("id,nome").order("nome").then(({data})=>{if(data)setConcursos(data);}); loadQuestoes(); }, []);
  useEffect(() => { if(filterConcurso) loadDisciplinas(filterConcurso); }, [filterConcurso]);
  useEffect(() => { loadQuestoes(); }, [filterDisciplina, filterConcurso]);

  async function loadDisciplinas(cid:string){ const {data}=await s().from("disciplinas").select("id,nome,tipo").eq("concurso_id",cid).order("nome"); if(data)setDisciplinas(data); }
  async function loadConteudos(did:string){ const {data}=await s().from("conteudos").select("id,nome").eq("disciplina_id",did).order("nome"); if(data)setConteudos(data); }
  async function loadQuestoes() { let q=s().from("questoes").select("*,disciplinas(nome),conteudos(nome)").order("created_at",{ascending:false}).limit(50); if(filterConcurso)q=q.eq("concurso_id",filterConcurso); if(filterDisciplina)q=q.eq("disciplina_id",filterDisciplina); if(search)q=q.ilike("enunciado",`%${search}%`); const {data}=await q; if(data)setQuestoes(data); }

  useEffect(() => { if(form.disciplina_id)loadConteudos(form.disciplina_id); }, [form.disciplina_id]);
  useEffect(() => { if(bulkDisc)loadConteudos(bulkDisc); }, [bulkDisc]);

  function newQ() {
    const cid=filterConcurso||concursos[0]?.id||"";
    setForm({ concurso_id:cid,disciplina_id:"",conteudo_id:"",enunciado:"",alternativa_a:"",alternativa_b:"",alternativa_c:"",alternativa_d:"",alternativa_e:"",gabarito:"A",tipo:"certo_errado",texto_apoio:"",imagem_url:"" });
    setEditId(null);setShowForm(true);setConteudos([]);
    if(cid)loadDisciplinas(cid);
  }
  function edit(q:any){
    setForm({ concurso_id:q.concurso_id,disciplina_id:q.disciplina_id,conteudo_id:q.conteudo_id||"",enunciado:q.enunciado,alternativa_a:q.alternativa_a,alternativa_b:q.alternativa_b,alternativa_c:q.alternativa_c||"",alternativa_d:q.alternativa_d||"",alternativa_e:q.alternativa_e||"",gabarito:q.gabarito,tipo:q.tipo,texto_apoio:q.texto_apoio||"",imagem_url:q.imagem_url||"" });
    loadDisciplinas(q.concurso_id); if(q.disciplina_id)loadConteudos(q.disciplina_id);
    setEditId(q.id);setShowForm(true);
  }

  async function save() {
    if(!form.concurso_id||!form.disciplina_id||!form.conteudo_id||!form.enunciado){ onMsg("Preencha todos os campos obrigatorios"); return; }
    const payload:any={...form};
    const {error}=editId ? await s().from("questoes").update(payload).eq("id",editId) : await s().from("questoes").insert(payload);
    if(error){ onMsg("Erro: "+error.message); return; }
    onMsg(editId?"Atualizada":"Criada"); if(!editId){setForm(f=>({...f,enunciado:"",gabarito:"A"}));} else {setShowForm(false);setEditId(null);} loadQuestoes();
  }
  async function remove(id:string){ if(!confirm("Remover?"))return; await s().from("questoes").delete().eq("id",id); onMsg("Removida"); loadQuestoes(); }

  function parseCSVLine(line:string):string[]{ const r:string[]=[]; let c="",q=false; for(let i=0;i<line.length;i++){ const ch=line[i]; if(q){ if(ch==='"'){if(line[i+1]==='"'){c+='"';i++;}else q=false;}else c+=ch; }else{ if(ch==='"')q=true; else if(ch===";"||ch===","||ch==="\t"){r.push(c.trim());c="";}else c+=ch; }} r.push(c.trim()); return r; }

  async function bulkInsert() {
    if(!filterConcurso||!bulkDisc||!bulkCont){ onMsg("Selecione concurso, disciplina e conteudo"); return; }
    const lines=bulkText.split("\n").filter(l=>l.trim()); const items=[]; let skipped=0;
    for(const line of lines){
      if(line.toLowerCase().startsWith("enunciado")){skipped++;continue;}
      const p=parseCSVLine(line);
      if(bulkTipo==="certo_errado"&&p.length<3)continue;
      if(bulkTipo==="multipla_escolha"&&p.length<7)continue;
      let gab;
      if(bulkTipo==="certo_errado"){
        const raw=p[2]?.trim()?.toUpperCase()||"";
        if(raw==="CERTO"||raw==="C")gab="A"; else if(raw==="ERRADO"||raw==="E")gab="B"; else gab=["A","B"].includes(raw)?raw:"A";
      }else{
        gab=p[6]?.trim()?.toUpperCase()||""; if(!["A","B","C","D","E"].includes(gab))gab="A";
      }
      const ta=bulkTipo==="certo_errado"?p[3]||"":p[7]||"";
      const img=bulkTipo==="certo_errado"?p[4]||"":p[8]||"";
      items.push({ concurso_id:filterConcurso,disciplina_id:bulkDisc,conteudo_id:bulkCont,enunciado:p[0]||"",alternativa_a:p[1]||"",alternativa_b:p[2]||"",alternativa_c:bulkTipo==="multipla_escolha"?p[3]||"":"",alternativa_d:bulkTipo==="multipla_escolha"?p[4]||"":"",alternativa_e:bulkTipo==="multipla_escolha"?p[5]||"":"",gabarito:gab,tipo:bulkTipo,texto_apoio:ta||null,imagem_url:img||null });
    }
    if(items.length){ const {error}=await s().from("questoes").insert(items);
      onMsg(error?`Erro: ${error.message}`:`${items.length} questoes inseridas!`+(skipped?` (${skipped} cabecalhos ignorados)`:""));
    }else onMsg("Nenhuma questao valida");
    setBulkText(""); loadQuestoes();
  }
  function downloadCSV(){ if(!bulkDisc){onMsg("Selecione uma disciplina");return;} const hdr="enunciado;alt_a;alt_b;gabarito;texto_apoio;imagem_url"; const ex="A leitura e um processo de interacao;Certo;Errado;A;Referencia opcional;https://exemplo.com/img.jpg"; const b=new Blob(["\uFEFF"+hdr+"\n"+ex+"\n"],{type:"text/csv;charset=utf-8"}); const u=URL.createObjectURL(b); const a=document.createElement("a");a.href=u;a.download=`modelo.csv`;a.click();URL.revokeObjectURL(u); }

  const canSave=form.concurso_id&&form.disciplina_id&&form.conteudo_id&&form.enunciado;
  const canBulk=filterConcurso&&bulkDisc&&bulkCont&&bulkText.trim();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card><CardContent className="p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">Concurso</label><select value={filterConcurso} onChange={e=>{setFilterConcurso(e.target.value);setFilterDisciplina("");}} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Todos</option>{concursos.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">Disciplina</label><select value={filterDisciplina} onChange={e=>setFilterDisciplina(e.target.value)} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Todas</option>{disciplinas.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
        <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">Buscar</label><input placeholder="Texto..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&loadQuestoes()} className="border rounded px-3 py-2 text-sm bg-background w-36" /></div>
        <Button variant="outline" size="sm" onClick={loadQuestoes}>Filtrar</Button>
        <div className="ml-auto flex gap-2"><Button size="sm" onClick={newQ}>+ Nova</Button><Button size="sm" variant="outline" onClick={()=>setShowBulk(!showBulk)}>+ Lote</Button></div>
      </CardContent></Card>

      {/* Single Form */}
      {showForm && (<Card><CardContent className="p-6">
        <h3 className="font-bold mb-4">{editId?"Editar":"Nova"} Questao</h3>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: form fields */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select value={form.concurso_id} onChange={e=>{setForm({...form,concurso_id:e.target.value,disciplina_id:"",conteudo_id:""});loadDisciplinas(e.target.value);}} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Concurso *</option>{concursos.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
              <select value={form.disciplina_id} onChange={e=>{setForm({...form,disciplina_id:e.target.value,conteudo_id:""});}} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Disciplina *</option>{disciplinas.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}</select>
              <select value={form.conteudo_id} onChange={e=>setForm({...form,conteudo_id:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Conteudo *</option>{conteudos.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
            </div>
            <textarea rows={2} placeholder="Texto de apoio / Referencia (opcional)" value={form.texto_apoio} onChange={e=>setForm({...form,texto_apoio:e.target.value})} className="w-full border rounded px-3 py-2 text-sm bg-background resize-none" />
            <textarea rows={3} placeholder="Enunciado *" value={form.enunciado} onChange={e=>setForm({...form,enunciado:e.target.value})} className="w-full border rounded px-3 py-2 text-sm bg-background resize-none" />
            <div className="w-36 h-36"><ImageUploader value={form.imagem_url} onChange={url=>setForm({...form,imagem_url:url})} bucket="questoes" /></div>
            {form.tipo==="certo_errado" ? (
              <div className="grid grid-cols-2 gap-2"><input placeholder="Alt A (Certo)" value={form.alternativa_a} onChange={e=>setForm({...form,alternativa_a:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" /><input placeholder="Alt B (Errado)" value={form.alternativa_b} onChange={e=>setForm({...form,alternativa_b:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" /></div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">{(["a","b","c","d","e"] as const).map(alt=>{const k=`alternativa_${alt}` as keyof typeof form;return <input key={alt} placeholder={`Alt ${alt.toUpperCase()}`} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" />})}</div>
            )}
            <div className="flex gap-2 items-center">
              <select value={form.gabarito} onChange={e=>setForm({...form,gabarito:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background w-20">{["A","B","C","D","E"].map(a=><option key={a} value={a}>{a}</option>)}</select>
              <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background"><option value="certo_errado">C/E</option><option value="multipla_escolha">A-E</option></select>
              <div className="ml-auto flex gap-2"><Button size="sm" onClick={save} disabled={!canSave}>Salvar</Button><Button size="sm" variant="ghost" onClick={()=>{setShowForm(false);setEditId(null);}}>Cancelar</Button></div>
            </div>
          </div>

          {/* Right: phone preview */}
          <div className="hidden lg:flex lg:w-[320px] shrink-0 flex-col gap-2 items-center">
            <span className="text-[10px] text-muted-foreground">Preview 396×704</span>
            <div className="w-[280px] h-[520px] border-[5px] border-gray-800 dark:border-gray-500 rounded-[20px] overflow-hidden bg-white dark:bg-gray-950 shadow-xl flex flex-col relative">
              <div className="h-4 bg-gray-800 dark:bg-gray-500 flex items-center justify-center"><div className="w-12 h-1 bg-gray-600 dark:bg-gray-400 rounded-full" /></div>
              <div className="flex-1 overflow-y-auto p-2" style={{fontSize:"9px"}}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[8px] font-bold text-gray-400 uppercase">Questao 1</span>
                  <div className="flex gap-0.5">
                    {form.texto_apoio && <button onClick={() => setPrevTexto(!prevTexto)} className={`text-[7px] border rounded px-1 py-0.5 ${prevTexto ? "bg-gray-800 text-white" : "border-gray-300 dark:border-gray-600 text-gray-500"}`}>👁 Texto</button>}
                    {form.imagem_url && <button onClick={() => setPrevImg(!prevImg)} className={`text-[7px] border rounded px-1 py-0.5 ${prevImg ? "bg-gray-800 text-white" : "border-gray-300 dark:border-gray-600 text-gray-500"}`}>👁 Imagem</button>}
                  </div>
                </div>
                {prevTexto && form.texto_apoio && <div className="text-[8px] text-gray-500 border-l-2 border-gray-300 pl-2 italic mb-2 leading-relaxed text-justify">{form.texto_apoio}</div>}
                <div className="text-[10px] leading-relaxed mb-2 text-justify"><LatexRenderer text={form.enunciado||"(enunciado)"}/></div>
                {prevImg && form.imagem_url && <img src={form.imagem_url} className="w-full rounded mb-2" alt="" />}
              </div>
              <div className="p-1.5 border-t border-gray-200 dark:border-gray-700 space-y-1 bg-gray-50 dark:bg-gray-900">
                {form.tipo==="certo_errado"?(
                  <div className="grid grid-cols-2 gap-1 text-[8px]"><div className="border border-gray-300 dark:border-gray-600 rounded p-1.5 text-center bg-white dark:bg-gray-800">{form.alternativa_a||"A"}</div><div className="border border-gray-300 dark:border-gray-600 rounded p-1.5 text-center bg-white dark:bg-gray-800">{form.alternativa_b||"B"}</div></div>
                ):(
                  <div className="space-y-0.5 text-[8px]">{["a","b","c","d","e"].map(alt=><div key={alt} className="border border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-800">{form[("alternativa_"+alt) as keyof typeof form]||alt.toUpperCase()}</div>)}</div>
                )}
                <div className="flex justify-between text-[7px] text-gray-400 px-1 pt-0.5"><span>← Anterior</span><span>Próxima →</span></div>
              </div>
            </div>
          </div>
        </div>
      </CardContent></Card>)}

      {/* Bulk */}
      {showBulk && (<Card><CardContent className="p-6">
        <h3 className="font-bold mb-4">Upload em Lote</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
          <select value={bulkDisc} onChange={e=>{setBulkDisc(e.target.value);setBulkCont("");}} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Disciplina *</option>{disciplinas.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}</select>
          <select value={bulkCont} onChange={e=>setBulkCont(e.target.value)} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Conteudo *</option>{conteudos.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          <select value={bulkTipo} onChange={e=>setBulkTipo(e.target.value)} className="border rounded px-3 py-2 text-sm bg-background"><option value="certo_errado">C/E</option><option value="multipla_escolha">A-E</option></select>
          <Button size="sm" variant="outline" onClick={downloadCSV} disabled={!bulkDisc}>Baixar CSV</Button>
        </div>
        <div className="text-xs text-muted-foreground mb-1">{bulkTipo==="certo_errado"?"Formato: enunciado;altA;altB;gabarito;texto_apoio(opc);imagem(opc)":"Formato: enunciado;altA;altB;altC;altD;altE;gabarito;texto;imagem"}</div>
        <div className="flex gap-2 mb-2"><input type="file" accept=".csv" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const t=ev.target?.result as string;setBulkText(t.split("\n").filter(l=>l.trim()&&!l.startsWith("enunciado")).join("\n"));};r.readAsText(f,"UTF-8");}} className="text-xs border rounded px-3 py-2 bg-background flex-1" /><Button size="sm" variant="outline" onClick={()=>setShowCSV(!showCSV)}>Exemplo</Button></div>
        {showCSV&&<div className="bg-muted p-2 rounded text-xs font-mono mb-2 whitespace-pre-wrap text-muted-foreground">{bulkTipo==="certo_errado"?"enunciado;alt_a;alt_b;gabarito;texto_apoio;imagem_url\nA leitura e um processo;Certo;Errado;A;Referencia;https://img.com/a.jpg":"enunciado;alt_a;alt_b;alt_c;alt_d;alt_e;gabarito;texto;imagem\nCapital do Brasil?;Brasilia;SP;RJ;Salvador;Curitiba;A;Geografia do Brasil;https://img.com/b.jpg"}</div>}
        <textarea rows={5} value={bulkText} onChange={e=>setBulkText(e.target.value)} placeholder="Cole as questoes, separadas por ; ou tab. Uma por linha." className="w-full border rounded px-3 py-2 text-sm font-mono bg-background mb-2 resize-none" />
        <div className="flex gap-2"><Button size="sm" onClick={bulkInsert} disabled={!canBulk}>Enviar</Button><Button size="sm" variant="ghost" onClick={()=>{setShowBulk(false);setBulkText("");}}>Cancelar</Button></div>
      </CardContent></Card>)}

      {/* List */}
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm"><thead className="border-b bg-muted/50"><tr><th className="text-left p-3 w-12">#</th><th className="text-left p-3">Enunciado</th><th className="text-left p-3 hidden sm:table-cell">Disciplina</th><th className="text-left p-3 hidden md:table-cell">Conteudo</th><th className="text-left p-3">Gab</th><th className="text-left p-3 w-24">Acoes</th></tr></thead>
          <tbody>{questoes.map((q:any,i:number)=>(<tr key={q.id} className="border-b hover:bg-muted/30"><td className="p-3 text-xs text-muted-foreground">{i+1}</td><td className="p-3 text-xs max-w-xs truncate">{q.enunciado?.substring(0,80)}{q.enunciado?.length>80?"...":""}</td><td className="p-3 text-xs hidden sm:table-cell">{q.disciplinas?.nome||"-"}</td><td className="p-3 text-xs hidden md:table-cell max-w-[120px] truncate">{q.conteudos?.nome||"-"}</td><td className="p-3 text-xs font-bold">{q.gabarito}</td><td className="p-3"><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=>edit(q)}>Editar</Button><Button size="sm" variant="destructive" className="h-7 text-xs" onClick={()=>remove(q.id)}>X</Button></div></td></tr>))}</tbody></table>
      </CardContent></Card>
    </div>
  );
}
