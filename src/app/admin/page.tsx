"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import QuestoesTab from "./questoes-tab";
import RevisaoTab from "./revisao-tab";
import { getBrowserClient } from "@/lib/supabase-browser";

export default function AdminPage() {
  const [tab, setTab] = useState<"users"|"notificacoes"|"concursos"|"grupos"|"disciplinas"|"unidades"|"conteudos"|"questoes"|"revisao">("users");
  const [msg, setMsg] = useState("");
  return (
    <div className="min-h-screen bg-background transition-colors">
      <header className="bg-foreground text-background px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Painel Admin</h1>
          <a href="/hub" className="text-background/70 hover:text-background text-sm">&larr; Hub</a>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {msg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 px-4 py-2 rounded-lg mb-4 text-sm">{msg}</div>}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0" role="tablist" aria-label="Abas do admin">
          {[["users","Usuários"],["notificacoes","Denúncias"],["concursos","Concursos"],["grupos","Grupos"],["disciplinas","Disciplinas"],["unidades","Unidades"],["conteudos","Conteúdos"],["questoes","Questões"],["revisao","Revisão"]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k as any)} role="tab" aria-selected={tab===k} className={`px-3 py-2 rounded-lg font-medium text-xs md:text-sm whitespace-nowrap transition-colors ${tab===k?"bg-foreground text-background":"bg-card text-muted-foreground border hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
        {tab === "users" && <UsersTab onMsg={setMsg} />}
        {tab === "concursos" && <ConcursosTab onMsg={setMsg} />}
        {tab === "grupos" && <GruposTab onMsg={setMsg} />}
        {tab === "disciplinas" && <DisciplinasTab onMsg={setMsg} />}
        {tab === "unidades" && <UnidadesTab onMsg={setMsg} />}
        {tab === "conteudos" && <ConteudosTab onMsg={setMsg} />}
        {tab === "notificacoes" && <NotificacoesTab onMsg={setMsg} />}
        {tab === "questoes" && <QuestoesTab onMsg={setMsg} />}
        {tab === "revisao" && <RevisaoTab onMsg={setMsg} />}
      </div>
    </div>
  );
}

function UsersTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const sup = getBrowserClient;
  useEffect(() => { sup().from("profiles").select("*").order("created_at", { ascending: false }).then((res: any) => { if (res.data) setUsers(res.data); }); }, []);
  async function updateRole(uid: string, role: string) { await sup().from("profiles").update({ role }).eq("id", uid); onMsg("Role: " + role); sup().from("profiles").select("*").order("created_at", { ascending: false }).then((res: any) => { if (res.data) setUsers(res.data); }); }
  async function addMonth(uid: string) { const d = new Date(); d.setMonth(d.getMonth()+1); await sup().from("profiles").update({ role:"premium", premium_until: d.toISOString() }).eq("id", uid); onMsg("Premium ate "+d.toLocaleDateString("pt-BR")); sup().from("profiles").select("*").order("created_at", { ascending: false }).then((res: any) => { if (res.data) setUsers(res.data); }); }
  async function removePremium(uid: string) { await sup().from("profiles").update({ role:"free", premium_until: null }).eq("id", uid); onMsg("Premium removido"); sup().from("profiles").select("*").order("created_at", { ascending: false }).then((res: any) => { if (res.data) setUsers(res.data); }); }
  return (
    <div className="bg-card border rounded-card overflow-hidden">
      <table className="w-full text-sm"><thead className="bg-muted/50 border-b"><tr><th className="text-left p-3">Email</th><th className="text-left p-3">Nome</th><th className="text-left p-3">Role</th><th className="text-left p-3">Premium</th><th className="text-left p-3">Ações</th></tr></thead>
        <tbody>{users.map((u:any) => (
          <tr key={u.id} className="border-b hover:bg-muted/30"><td className="p-3 text-xs">{u.email}</td><td className="p-3 text-xs">{u.nome||"-"}</td>
            <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role==="admin"?"bg-red-100 text-red-700":u.role==="premium"?"bg-emerald-100 text-emerald-700":"bg-muted text-muted-foreground"}`}>{u.role}</span></td>
            <td className="p-3 text-xs">{u.premium_until?new Date(u.premium_until).toLocaleDateString("pt-BR"):"-"}</td>
            <td className="p-3"><div className="flex gap-1 flex-wrap">
              <select onChange={e => e.target.value && updateRole(u.id, e.target.value)} defaultValue="" className="text-xs border rounded px-1 py-1 bg-background" aria-label="Alterar role"><option value="">Role</option><option value="free">Free</option><option value="premium">Premium</option><option value="admin">Admin</option></select>
              <button onClick={() => addMonth(u.id)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600" aria-label="Adicionar 1 mês premium">+1 mês</button>
              {u.role==="premium" && <button onClick={() => removePremium(u.id)} className="text-xs bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600" aria-label="Remover premium">Remover</button>}
            </div></td>
          </tr>))}
        </tbody></table>
    </div>
  );
}

function ConcursosTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [qCounts, setQCounts] = useState<Record<string, number>>({});
  const defF = { nome:"", descricao:"", banca:"", data_prova:"", slug:"", ativo:true, status:"pronto", pontuacao_tipo:"tradicional", instrucoes: { edital:"", selecao:"", estatisticas:"" } };
  const [f, setF] = useState<any>(defF);
  const [editId, setEditId] = useState<string|null>(null);
  const sup = getBrowserClient;
  useEffect(() => {
    sup().from("concursos").select("*").order("created_at",{ascending:false}).then((res: any) => { if(res.data) setData(res.data); });
    sup().from("questoes").select("concurso_id").then((res: any) => {
      const m: Record<string, number> = {};
      (res.data || []).forEach((q: any) => { m[q.concurso_id] = (m[q.concurso_id] || 0) + 1; });
      setQCounts(m);
    });
  }, []);
  async function save() { const payload:any={...f,data_prova:f.data_prova||null,slug:f.slug||null,instrucoes:f.instrucoes||null};
    if(editId) await sup().from("concursos").update(payload).eq("id",editId); else await sup().from("concursos").insert(payload); onMsg(editId?"Atualizado":"Criado"); setF({...defF}); setEditId(null); }
  function edit(c:any) { setEditId(c.id); setF({nome:c.nome,descricao:c.descricao||"",banca:c.banca||"",data_prova:c.data_prova||"",slug:c.slug||"",ativo:c.ativo,status:c.status||"pronto",pontuacao_tipo:c.pontuacao_tipo||"tradicional",instrucoes:c.instrucoes||{edital:"",selecao:"",estatisticas:""}}); }
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-card p-6">
        <h3 className="font-bold mb-4">{editId?"Editar":"Novo"} Concurso</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input placeholder="Nome *" value={f.nome} onChange={e => setF({...f, nome:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Nome do concurso" />
          <input placeholder="Banca" value={f.banca} onChange={e => setF({...f, banca:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Banca" />
          <input placeholder="Slug (ex: seduc-al-2026)" value={f.slug} onChange={e => setF({...f, slug:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Slug" />
          <input placeholder="Descricao" value={f.descricao} onChange={e => setF({...f, descricao:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Descrição" />
          <input type="date" value={f.data_prova} onChange={e => setF({...f, data_prova:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Data da prova" />
          <select value={f.status} onChange={e => setF({...f, status:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Status"><option value="pronto">Pronto</option><option value="manutenção">Em manutenção</option><option value="breve">Em breve</option></select>
          <select value={f.pontuacao_tipo} onChange={e => setF({...f, pontuacao_tipo:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Tipo de pontuação"><option value="tradicional">Pontuação: Tradicional</option><option value="cebraspe">Pontuação: Cebraspe</option></select>
        </div>
        <details className="mt-3 border rounded p-3 bg-muted/10">
          <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">Instruções para o candidato</summary>
          <div className="mt-3 space-y-2">
            <label className="text-xs text-muted-foreground">1. Sobre o edital:</label>
            <textarea rows={3} value={f.instrucoes?.edital||""} onChange={e => setF({...f,instrucoes:{...f.instrucoes,edital:e.target.value}})}
              placeholder="Ex: Este simulado abrange o conteudo do edital SEDUC-AL 2026, conforme lei nº 12.345/2025..."
              className="w-full border rounded px-3 py-2 text-sm bg-background resize-none" aria-label="Instruções sobre o edital" />
            <label className="text-xs text-muted-foreground">2. Como selecionar as perguntas:</label>
            <textarea rows={3} value={f.instrucoes?.selecao||""} onChange={e => setF({...f,instrucoes:{...f.instrucoes,selecao:e.target.value}})}
              placeholder="Ex: Escolha as disciplinas que deseja estudar e a quantidade de questoes. O sistema distribui as questoes proporcionalmente..."
              className="w-full border rounded px-3 py-2 text-sm bg-background resize-none" aria-label="Instruções sobre seleção" />
            <label className="text-xs text-muted-foreground">3. Como verificar o desempenho:</label>
            <textarea rows={3} value={f.instrucoes?.estatisticas||""} onChange={e => setF({...f,instrucoes:{...f.instrucoes,estatisticas:e.target.value}})}
              placeholder="Ex: Apos finalizar o simulado, va ate a pagina de estatisticas para ver seu desempenho por disciplina..."
              className="w-full border rounded px-3 py-2 text-sm bg-background resize-none" aria-label="Instruções sobre desempenho" />
          </div>
        </details>
        <div className="flex gap-2 mt-3"><Button size="sm" onClick={save} disabled={!f.nome}>Salvar</Button>{editId && <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setF({...defF}); }}>Cancelar</Button>}</div>
      </div>
      <div className="bg-card border rounded-card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 border-b"><tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Slug</th><th className="text-left p-3">Banca</th><th className="text-left p-3">Questões</th><th className="text-left p-3">Instruções</th><th className="text-left p-3">Ações</th></tr></thead>
        <tbody>{data.map((c:any) => (<tr key={c.id} className="border-b hover:bg-muted/30"><td className="p-3 text-xs font-medium">{c.nome}</td><td className="p-3 text-xs font-mono">{c.slug||"-"}</td><td className="p-3 text-xs">{c.banca||"-"}</td><td className="p-3 text-xs font-mono">{qCounts[c.id]||0}</td><td className="p-3 text-xs">{c.instrucoes?.edital ? "Sim" : "Não"}</td><td className="p-3"><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => edit(c)}>Editar</Button></div></td></tr>))}</tbody></table></div>
    </div>
  );
}

function GruposTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [concursos, setConcursos] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [qCounts, setQCounts] = useState<Record<string, number>>({});
  const [f, setF] = useState({ concurso_id:"", nome:"", ordem:0 });
  const [editId, setEditId] = useState<string|null>(null);
  const sup = getBrowserClient;
  useEffect(() => { sup().from("concursos").select("id,nome").order("nome").then((res: any)=>{if(res.data)setConcursos(res.data);}); loadGrupos(); loadQCounts(); }, []);
  async function loadGrupos() { const res=await sup().from("grupos").select("*, concursos(nome)").order("ordem").order("nome"); if(res.data) setGrupos(res.data); }
  async function loadQCounts() {
    const [{ data: discs }, { data: qs }] = await Promise.all([
      sup().from("disciplinas").select("id,grupo_id"),
      sup().from("questoes").select("disciplina_id"),
    ]);
    const discToGrupo: Record<string, string> = {};
    (discs || []).forEach((d: any) => { discToGrupo[d.id] = d.grupo_id; });
    const m: Record<string, number> = {};
    (qs || []).forEach((q: any) => { const gid = discToGrupo[q.disciplina_id]; if (gid) m[gid] = (m[gid] || 0) + 1; });
    setQCounts(m);
  }
  async function save() {
    const payload:any={ concurso_id:f.concurso_id, nome:f.nome, ordem:Number(f.ordem)||0 };
    if(editId) await sup().from("grupos").update(payload).eq("id",editId); else await sup().from("grupos").insert(payload);
    onMsg(editId?"Atualizado":"Criado"); setF({...f,nome:"",ordem:0}); setEditId(null); loadGrupos();
  }
  function edit(g:any) { setEditId(g.id); setF({concurso_id:g.concurso_id,nome:g.nome,ordem:g.ordem||0}); }
  async function remove(id:string) { if(!confirm("Remover?"))return; await sup().from("grupos").delete().eq("id",id); onMsg("Removido"); loadGrupos(); }
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-card p-6">
        <h3 className="font-bold mb-4">{editId?"Editar":"Novo"} Grupo</h3>
        <p className="text-xs text-muted-foreground mb-3">Agrupamento de disciplinas dentro de um concurso (ex: "Conhecimentos Básicos", "Conhecimentos Específicos", ou qualquer outro nome).</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={f.concurso_id} onChange={e=>setF({...f,concurso_id:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" disabled={!!editId} aria-label="Concurso"><option value="">Concurso</option>{concursos.map((c:any)=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          <input placeholder="Nome *" value={f.nome} onChange={e=>setF({...f,nome:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Nome do grupo" />
          <input type="number" placeholder="Ordem" value={f.ordem} onChange={e=>setF({...f,ordem:Number(e.target.value)})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Ordem de exibição" />
        </div>
        <div className="flex gap-2 mt-3"><Button size="sm" onClick={save} disabled={!f.nome||!f.concurso_id}>Salvar</Button>{editId&&<Button size="sm" variant="ghost" onClick={()=>{setEditId(null);setF({...f,nome:"",ordem:0});}}>Cancelar</Button>}</div>
      </div>
      <div className="bg-card border rounded-card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 border-b"><tr><th className="text-left p-3">Concurso</th><th className="text-left p-3">Nome</th><th className="text-left p-3">Ordem</th><th className="text-left p-3">Questões</th><th className="text-left p-3">Ações</th></tr></thead>
        <tbody>{grupos.map((g:any)=>(<tr key={g.id} className="border-b hover:bg-muted/30"><td className="p-3 text-xs">{g.concursos?.nome||"-"}</td><td className="p-3 text-xs font-medium">{g.nome}</td><td className="p-3 text-xs">{g.ordem}</td><td className="p-3 text-xs font-mono">{qCounts[g.id]||0}</td><td className="p-3"><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=>edit(g)} aria-label={`Editar ${g.nome}`}>Editar</Button><Button size="sm" variant="destructive" className="h-7 text-xs" onClick={()=>remove(g.id)} aria-label={`Remover ${g.nome}`}>X</Button></div></td></tr>))}</tbody></table></div>
    </div>
  );
}

function DisciplinasTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [qCounts, setQCounts] = useState<Record<string, number>>({});
  const [f, setF] = useState({ grupo_id:"", nome:"" });
  const [editId, setEditId] = useState<string|null>(null);
  const sup = getBrowserClient;
  useEffect(() => {
    sup().from("grupos").select("id,nome,concursos(nome)").order("nome").then((res: any)=>{if(res.data)setGrupos(res.data);});
    loadDisc();
    sup().from("questoes").select("disciplina_id").then((res: any) => {
      const m: Record<string, number> = {};
      (res.data || []).forEach((q: any) => { m[q.disciplina_id] = (m[q.disciplina_id] || 0) + 1; });
      setQCounts(m);
    });
  }, []);
  async function loadDisc() { const res=await sup().from("disciplinas").select("*, grupos(nome, concursos(nome))").order("nome"); if(res.data) setDisciplinas(res.data); }
  async function save() { if(editId) await sup().from("disciplinas").update({nome:f.nome,grupo_id:f.grupo_id}).eq("id",editId); else await sup().from("disciplinas").insert({nome:f.nome,grupo_id:f.grupo_id}); onMsg("Salvo"); setF({...f,nome:""}); setEditId(null); loadDisc(); }
  function edit(d:any) { setEditId(d.id); setF({grupo_id:d.grupo_id,nome:d.nome}); }
  async function remove(id:string) { if(!confirm("Remover?"))return; await sup().from("disciplinas").delete().eq("id",id); onMsg("Removida"); loadDisc(); }
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-card p-6">
        <h3 className="font-bold mb-4">{editId?"Editar":"Nova"} Disciplina</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={f.grupo_id} onChange={e=>setF({...f,grupo_id:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Grupo"><option value="">Grupo</option>{grupos.map((g:any)=><option key={g.id} value={g.id}>{g.concursos?.nome} &gt; {g.nome}</option>)}</select>
          <input placeholder="Nome *" value={f.nome} onChange={e=>setF({...f,nome:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Nome da disciplina" />
        </div>
        <div className="flex gap-2 mt-3"><Button size="sm" onClick={save} disabled={!f.nome||!f.grupo_id}>Salvar</Button>{editId&&<Button size="sm" variant="ghost" onClick={()=>{setEditId(null);setF({...f,nome:""});}}>Cancelar</Button>}</div>
      </div>
      <div className="bg-card border rounded-card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 border-b"><tr><th className="text-left p-3">Concurso</th><th className="text-left p-3">Grupo</th><th className="text-left p-3">Nome</th><th className="text-left p-3">Questões</th><th className="text-left p-3">Ações</th></tr></thead>
        <tbody>{disciplinas.map((d:any)=>(<tr key={d.id} className="border-b hover:bg-muted/30"><td className="p-3 text-xs">{d.grupos?.concursos?.nome||"-"}</td><td className="p-3 text-xs">{d.grupos?.nome||"-"}</td><td className="p-3 text-xs font-medium">{d.nome}</td><td className="p-3 text-xs font-mono">{qCounts[d.id]||0}</td><td className="p-3"><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=>edit(d)} aria-label={`Editar ${d.nome}`}>Editar</Button><Button size="sm" variant="destructive" className="h-7 text-xs" onClick={()=>remove(d.id)} aria-label={`Remover ${d.nome}`}>X</Button></div></td></tr>))}</tbody></table></div>
    </div>
  );
}

function UnidadesTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [f, setF] = useState({ disciplina_id:"", nome:"", ordem:0 });
  const [editId, setEditId] = useState<string|null>(null);
  const sup = getBrowserClient;
  useEffect(() => { sup().from("disciplinas").select("id,nome,grupos(nome,concursos(nome))").order("nome").then((res: any)=>{if(res.data)setDisciplinas(res.data);}); loadUnidades(); }, []);
  async function loadUnidades() { const res=await sup().from("unidades").select("*, disciplinas(nome, grupos(nome, concursos(nome)))").order("ordem").order("nome"); if(res.data) setUnidades(res.data); }
  async function save() {
    const payload:any={ disciplina_id:f.disciplina_id, nome:f.nome, ordem:Number(f.ordem)||0 };
    if(editId) await sup().from("unidades").update(payload).eq("id",editId); else await sup().from("unidades").insert(payload);
    onMsg(editId?"Atualizado":"Criado"); setF({...f,nome:"",ordem:0}); setEditId(null); loadUnidades();
  }
  function edit(u:any) { setEditId(u.id); setF({disciplina_id:u.disciplina_id,nome:u.nome,ordem:u.ordem||0}); }
  async function remove(id:string) { if(!confirm("Remover?"))return; await sup().from("unidades").delete().eq("id",id); onMsg("Removida"); loadUnidades(); }
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-card p-6">
        <h3 className="font-bold mb-4">{editId?"Editar":"Nova"} Unidade</h3>
        <p className="text-xs text-muted-foreground mb-3">Agrupamento opcional de tópicos dentro de uma disciplina. Uma disciplina pode não ter nenhuma unidade — os tópicos ficam soltos direto nela.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={f.disciplina_id} onChange={e=>setF({...f,disciplina_id:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Disciplina"><option value="">Disciplina</option>{disciplinas.map((d:any)=><option key={d.id} value={d.id}>{d.grupos?.concursos?.nome} &gt; {d.grupos?.nome} &gt; {d.nome}</option>)}</select>
          <input placeholder="Nome *" value={f.nome} onChange={e=>setF({...f,nome:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Nome da unidade" />
          <input type="number" placeholder="Ordem" value={f.ordem} onChange={e=>setF({...f,ordem:Number(e.target.value)})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Ordem de exibição" />
        </div>
        <div className="flex gap-2 mt-3"><Button size="sm" onClick={save} disabled={!f.nome||!f.disciplina_id}>Salvar</Button>{editId&&<Button size="sm" variant="ghost" onClick={()=>{setEditId(null);setF({...f,nome:"",ordem:0});}}>Cancelar</Button>}</div>
      </div>
      <div className="bg-card border rounded-card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 border-b"><tr><th className="text-left p-3">Disciplina</th><th className="text-left p-3">Nome</th><th className="text-left p-3">Ordem</th><th className="text-left p-3">Ações</th></tr></thead>
        <tbody>{unidades.map((u:any)=>(<tr key={u.id} className="border-b hover:bg-muted/30"><td className="p-3 text-xs">{u.disciplinas?.grupos?.concursos?.nome} &gt; {u.disciplinas?.grupos?.nome} &gt; {u.disciplinas?.nome}</td><td className="p-3 text-xs font-medium">{u.nome}</td><td className="p-3 text-xs">{u.ordem}</td><td className="p-3"><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=>edit(u)} aria-label={`Editar ${u.nome}`}>Editar</Button><Button size="sm" variant="destructive" className="h-7 text-xs" onClick={()=>remove(u.id)} aria-label={`Remover ${u.nome}`}>X</Button></div></td></tr>))}</tbody></table></div>
    </div>
  );
}

function ConteudosTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [conteudos, setConteudos] = useState<any[]>([]);
  const [qCounts, setQCounts] = useState<Record<string, number>>({});
  const [f, setF] = useState({ disciplina_id:"", unidade_id:"", nome:"" });
  const [editId, setEditId] = useState<string|null>(null);
  const sup = getBrowserClient;
  useEffect(() => {
    sup().from("disciplinas").select("id,nome,grupos(nome,concursos(nome))").order("nome").then((res: any)=>{if(res.data)setDisciplinas(res.data);});
    loadCont();
    sup().from("questoes").select("conteudo_id").then((res: any) => {
      const m: Record<string, number> = {};
      (res.data || []).forEach((q: any) => { if (q.conteudo_id) m[q.conteudo_id] = (m[q.conteudo_id] || 0) + 1; });
      setQCounts(m);
    });
  }, []);

  async function loadUnidades(did:string) { if(!did){setUnidades([]);return;} const res=await sup().from("unidades").select("id,nome").eq("disciplina_id",did).order("ordem").order("nome"); if(res.data) setUnidades(res.data); }
  async function loadCont() {
    const res=await sup().from("conteudos").select("*, disciplinas(nome,grupos(nome,concursos(nome))), unidades(nome)").order("ordem").order("nome").limit(300);
    if(res.data) setConteudos(res.data);
  }
  async function save() {
    const payload:any={ disciplina_id:f.disciplina_id, unidade_id: f.unidade_id || null, nome:f.nome };
    if(editId) await sup().from("conteudos").update(payload).eq("id",editId);
    else await sup().from("conteudos").insert(payload);
    onMsg("Salvo"); setF({...f,nome:"",unidade_id:""}); setEditId(null); loadCont();
  }
  function edit(c:any) {
    setEditId(c.id); setF({disciplina_id:c.disciplina_id,unidade_id:c.unidade_id||"",nome:c.nome});
    loadUnidades(c.disciplina_id);
  }
  async function remove(id:string) { if(!confirm("Remover?"))return; await sup().from("conteudos").delete().eq("id",id); onMsg("Removido"); loadCont(); }

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-card p-6">
        <h3 className="font-bold mb-4">{editId?"Editar":"Novo"} Tópico</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={f.disciplina_id} onChange={e=>{setF({...f,disciplina_id:e.target.value,unidade_id:""});loadUnidades(e.target.value);}} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Disciplina">
            <option value="">Disciplina</option>{disciplinas.map((d:any)=><option key={d.id} value={d.id}>{d.grupos?.concursos?.nome} &gt; {d.grupos?.nome} &gt; {d.nome}</option>)}
          </select>
          <select value={f.unidade_id} onChange={e=>setF({...f,unidade_id:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" disabled={!f.disciplina_id} aria-label="Unidade">
            <option value="">Sem unidade</option>{unidades.map((u:any)=><option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <input placeholder="Nome *" value={f.nome} onChange={e=>setF({...f,nome:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Nome do tópico" />
        </div>
        <div className="flex gap-2 mt-3"><Button size="sm" onClick={save} disabled={!f.nome||!f.disciplina_id}>Salvar</Button>{editId&&<Button size="sm" variant="ghost" onClick={()=>{setEditId(null);setF({...f,nome:"",unidade_id:""});}}>Cancelar</Button>}</div>
      </div>
      <div className="bg-card border rounded-card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 border-b"><tr><th className="text-left p-3">Disciplina</th><th className="text-left p-3">Unidade</th><th className="text-left p-3">Tópico</th><th className="text-left p-3">Questões</th><th className="text-left p-3 w-32">Ações</th></tr></thead>
        <tbody>{conteudos.map((c:any)=>(<tr key={c.id} className="border-b hover:bg-muted/30">
          <td className="p-3 text-xs">{c.disciplinas?.nome||"-"}</td>
          <td className="p-3 text-xs">{c.unidades?.nome||<span className="text-muted-foreground">—</span>}</td>
          <td className="p-3 text-xs">{c.nome}</td>
          <td className="p-3 text-xs font-mono">{qCounts[c.id]||0}</td>
          <td className="p-3"><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=>edit(c)} aria-label={`Editar ${c.nome}`}>Editar</Button><Button size="sm" variant="destructive" className="h-7 text-xs" onClick={()=>remove(c.id)} aria-label={`Remover ${c.nome}`}>X</Button></div></td>
        </tr>))}</tbody></table></div>
    </div>
  );
}

function NotificacoesTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const sup = getBrowserClient;
  useEffect(() => { load(); }, []);
  
  async function load() {
    setError("");
    const { data, error: err } = await sup().from("denuncias").select("*, comentarios(texto, user_id, user_name, user_avatar)").order("created_at", { ascending: false }).limit(50);
    if (err) { setError(err.message); return; }
    const denuncias = data || [];
    
    const userIds = [...new Set(denuncias.map((d: any) => d.user_id).filter(Boolean))];
    const profiles: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profs } = await sup().from("profiles").select("id, nome, avatar_url").in("id", userIds);
      if (profs) profs.forEach((p: any) => { profiles[p.id] = p; });
    }
    
    setNotifs(denuncias.map((d: any) => ({ ...d, denunciante: profiles[d.user_id] || null })));
  }

  async function markRead(id: string) {
    if (!confirm("Excluir esta denúncia?")) return;
    await sup().from("denuncias").delete().eq("id", id);
    onMsg("Denúncia excluída"); load();
  }

  async function apagarComentario(cid: string) {
    if (!confirm("Apagar o comentário denunciado?")) return;
    await sup().from("comentarios").delete().eq("id", cid);
    onMsg("Comentário apagado"); load();
  }

  const pendentes = notifs.length;

  return (
    <div className="space-y-4">
      <h2 className="font-bold">Denúncias {pendentes > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-2" aria-label={`${pendentes} denúncias pendentes`}>{pendentes}</span>}</h2>
      {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-lg text-sm" role="alert">{error}</div>}
      {!error && notifs.length === 0 ? (
        <div className="bg-card border rounded-card p-8 text-center text-muted-foreground text-sm">Nenhuma denúncia.</div>
      ) : (
        <div className="space-y-3">
          {notifs.map((n: any) => (
            <div key={n.id} className="bg-card border rounded-card p-4 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">🚩 Comentário denunciado</span>
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</span>
                  <button onClick={() => markRead(n.id)} className="text-xs text-muted-foreground hover:text-foreground" aria-label="Excluir denúncia">Excluir denúncia</button>
                  {n.comentario_id && <button onClick={() => apagarComentario(n.comentario_id)} className="text-xs text-red-500 hover:text-red-700" aria-label="Apagar comentário">Apagar comentário</button>}
                </div>
              </div>
              {n.comentarios?.texto ? (
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground italic mb-2">"{n.comentarios.texto.substring(0, 200)}{n.comentarios.texto.length > 200 ? "..." : ""}"</div>
              ) : (
                <p className="text-xs text-muted-foreground mb-2">Comentário não encontrado</p>
              )}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Denunciante:</span>
                  {n.denunciante?.avatar_url ? <img src={n.denunciante.avatar_url} className="w-4 h-4 rounded-full" alt="" /> : null}
                  <span className="font-medium">{n.denunciante?.nome || "Usuário"}</span>
                </div>
                <span className="text-muted-foreground">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Autor:</span>
                  {n.comentarios?.user_avatar ? <img src={n.comentarios.user_avatar} className="w-4 h-4 rounded-full" alt="" /> : null}
                  <span className="font-medium">{n.comentarios?.user_name || "Usuário"}</span>
                </div>
              </div>
              {n.motivo && <p className="text-xs text-muted-foreground mt-1.5">Motivo: {n.motivo}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
