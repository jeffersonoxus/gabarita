"use client";

import { createBrowserClient } from "@supabase/ssr";
import QuestoesTab from "./questoes-tab";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const surl = process.env.NEXT_PUBLIC_SUPABASE_URL!; const skey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
function s() { return createBrowserClient(surl, skey); }

export default function AdminPage() {
  const [tab, setTab] = useState<"users"|"notificacoes"|"concursos"|"disciplinas"|"conteudos"|"questoes">("users");
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
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          {[["users","Usuários"],["notificacoes","Denúncias"],["concursos","Concursos"],["disciplinas","Disciplinas"],["conteudos","Conteúdos"],["questoes","Questões"]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k as any)} className={`px-3 py-2 rounded-lg font-medium text-xs md:text-sm whitespace-nowrap transition-colors ${tab===k?"bg-foreground text-background":"bg-card text-muted-foreground border hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
        {tab === "users" && <UsersTab onMsg={setMsg} />}
        {tab === "concursos" && <ConcursosTab onMsg={setMsg} />}
        {tab === "disciplinas" && <DisciplinasTab onMsg={setMsg} />}
        {tab === "conteudos" && <ConteudosTab onMsg={setMsg} />}
        {tab === "notificacoes" && <NotificacoesTab onMsg={setMsg} />}
        {tab === "questoes" && <QuestoesTab onMsg={setMsg} />}
      </div>
    </div>
  );
}

function UsersTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => { s().from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => { if (data) setUsers(data); }); }, []);
  async function updateRole(uid: string, role: string) { await s().from("profiles").update({ role }).eq("id", uid); onMsg("Role: " + role); s().from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => { if (data) setUsers(data); }); }
  async function addMonth(uid: string) { const d = new Date(); d.setMonth(d.getMonth()+1); await s().from("profiles").update({ role:"premium", premium_until: d.toISOString() }).eq("id", uid); onMsg("Premium ate "+d.toLocaleDateString("pt-BR")); s().from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => { if (data) setUsers(data); }); }
  async function removePremium(uid: string) { await s().from("profiles").update({ role:"free", premium_until: null }).eq("id", uid); onMsg("Premium removido"); s().from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => { if (data) setUsers(data); }); }
  return (
    <div className="bg-card border rounded-card overflow-hidden">
      <table className="w-full text-sm"><thead className="bg-muted/50 border-b"><tr><th className="text-left p-3">Email</th><th className="text-left p-3">Nome</th><th className="text-left p-3">Role</th><th className="text-left p-3">Premium</th><th className="text-left p-3">Acoes</th></tr></thead>
        <tbody>{users.map((u:any) => (
          <tr key={u.id} className="border-b hover:bg-muted/30"><td className="p-3 text-xs">{u.email}</td><td className="p-3 text-xs">{u.nome||"-"}</td>
            <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role==="admin"?"bg-red-100 text-red-700":u.role==="premium"?"bg-emerald-100 text-emerald-700":"bg-muted text-muted-foreground"}`}>{u.role}</span></td>
            <td className="p-3 text-xs">{u.premium_until?new Date(u.premium_until).toLocaleDateString("pt-BR"):"-"}</td>
            <td className="p-3"><div className="flex gap-1 flex-wrap">
              <select onChange={e => e.target.value && updateRole(u.id, e.target.value)} defaultValue="" className="text-xs border rounded px-1 py-1 bg-background"><option value="">Role</option><option value="free">Free</option><option value="premium">Premium</option><option value="admin">Admin</option></select>
              <button onClick={() => addMonth(u.id)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">+1 mes</button>
              {u.role==="premium" && <button onClick={() => removePremium(u.id)} className="text-xs bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600">Remover</button>}
            </div></td>
          </tr>))}
        </tbody></table>
    </div>
  );
}

function ConcursosTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [f, setF] = useState({ nome:"", descricao:"", banca:"", data_prova:"", slug:"", ativo:true, tem_especificas:true });
  const [editId, setEditId] = useState<string|null>(null);
  useEffect(() => { s().from("concursos").select("*").order("created_at",{ascending:false}).then(({data:d}) => { if(d) setData(d); }); }, []);
  async function save() { if(editId) await s().from("concursos").update(f).eq("id",editId); else await s().from("concursos").insert(f); onMsg(editId?"Atualizado":"Criado"); setF({nome:"",descricao:"",banca:"",data_prova:"",slug:"",ativo:true,tem_especificas:true}); setEditId(null); }
  function edit(c:any) { setEditId(c.id); setF({nome:c.nome,descricao:c.descricao||"",banca:c.banca||"",data_prova:c.data_prova||"",slug:c.slug||"",ativo:c.ativo,tem_especificas:c.tem_especificas!==false}); }
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-card p-6">
        <h3 className="font-bold mb-4">{editId?"Editar":"Novo"} Concurso</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input placeholder="Nome *" value={f.nome} onChange={e => setF({...f, nome:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" />
          <input placeholder="Banca" value={f.banca} onChange={e => setF({...f, banca:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" />
          <input placeholder="Slug (ex: seduc-al-2026)" value={f.slug} onChange={e => setF({...f, slug:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" />
          <input placeholder="Descricao" value={f.descricao} onChange={e => setF({...f, descricao:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" />
          <input type="date" value={f.data_prova} onChange={e => setF({...f, data_prova:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.tem_especificas} onChange={e => setF({...f, tem_especificas:e.target.checked})} className="w-4 h-4" /> Possui conhecimentos especificos</label>
        </div>
        <div className="flex gap-2 mt-3"><Button size="sm" onClick={save} disabled={!f.nome}>Salvar</Button>{editId && <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setF({nome:"",descricao:"",banca:"",data_prova:"",slug:"",ativo:true,tem_especificas:true}); }}>Cancelar</Button>}</div>
      </div>
      <div className="bg-card border rounded-card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 border-b"><tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Slug</th><th className="text-left p-3">Banca</th><th className="text-left p-3">Ativo</th><th className="text-left p-3">Acoes</th></tr></thead>
        <tbody>{data.map((c:any) => (<tr key={c.id} className="border-b hover:bg-muted/30"><td className="p-3 text-xs font-medium">{c.nome}</td><td className="p-3 text-xs font-mono">{c.slug||"-"}</td><td className="p-3 text-xs">{c.banca||"-"}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${c.ativo?"bg-emerald-100 text-emerald-700":"bg-muted text-muted-foreground"}`}>{c.ativo?"Sim":"Nao"}</span></td><td className="p-3"><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => edit(c)}>Editar</Button></div></td></tr>))}</tbody></table></div>
    </div>
  );
}

function DisciplinasTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [concursos, setConcursos] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [f, setF] = useState({ concurso_id:"", nome:"", tipo:"basica" });
  const [editId, setEditId] = useState<string|null>(null);
  useEffect(() => { s().from("concursos").select("id,nome").order("nome").then(({data})=>{if(data)setConcursos(data);}); loadDisc(); }, []);
  async function loadDisc() { const {data}=await s().from("disciplinas").select("*, concursos(nome)").order("tipo").order("nome"); if(data) setDisciplinas(data); }
  async function save() { if(editId) await s().from("disciplinas").update({nome:f.nome,tipo:f.tipo}).eq("id",editId); else await s().from("disciplinas").insert(f); onMsg("Salvo"); setF({...f,nome:""}); setEditId(null); loadDisc(); }
  function edit(d:any) { setEditId(d.id); setF({concurso_id:d.concurso_id,nome:d.nome,tipo:d.tipo}); }
  async function remove(id:string) { if(!confirm("Remover?"))return; await s().from("disciplinas").delete().eq("id",id); onMsg("Removida"); loadDisc(); }
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-card p-6">
        <h3 className="font-bold mb-4">{editId?"Editar":"Nova"} Disciplina</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={f.concurso_id} onChange={e=>setF({...f,concurso_id:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" disabled={!!editId}><option value="">Concurso</option>{concursos.map((c:any)=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          <input placeholder="Nome *" value={f.nome} onChange={e=>setF({...f,nome:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" />
          <select value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background"><option value="basica">Basica</option><option value="especifica">Especifica</option></select>
        </div>
        <div className="flex gap-2 mt-3"><Button size="sm" onClick={save} disabled={!f.nome}>Salvar</Button>{editId&&<Button size="sm" variant="ghost" onClick={()=>{setEditId(null);setF({...f,nome:""});}}>Cancelar</Button>}</div>
      </div>
      <div className="bg-card border rounded-card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 border-b"><tr><th className="text-left p-3">Concurso</th><th className="text-left p-3">Nome</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Acoes</th></tr></thead>
        <tbody>{disciplinas.map((d:any)=>(<tr key={d.id} className="border-b hover:bg-muted/30"><td className="p-3 text-xs">{d.concursos?.nome||"-"}</td><td className="p-3 text-xs font-medium">{d.nome}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${d.tipo==="basica"?"bg-blue-100 text-blue-700":"bg-purple-100 text-purple-700"}`}>{d.tipo}</span></td><td className="p-3"><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=>edit(d)}>Editar</Button><Button size="sm" variant="destructive" className="h-7 text-xs" onClick={()=>remove(d.id)}>X</Button></div></td></tr>))}</tbody></table></div>
    </div>
  );
}

function ConteudosTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [conteudos, setConteudos] = useState<any[]>([]);
  const [f, setF] = useState({ disciplina_id:"", nome:"" });
  const [editId, setEditId] = useState<string|null>(null);
  useEffect(() => { s().from("disciplinas").select("id,nome,concursos(nome)").order("nome").then(({data})=>{if(data)setDisciplinas(data);}); loadCont(); }, []);
  async function loadCont() { const {data}=await s().from("conteudos").select("*, disciplinas(nome,concursos(nome))").order("nome").limit(200); if(data) setConteudos(data); }
  async function save() { if(editId) await s().from("conteudos").update({nome:f.nome}).eq("id",editId); else await s().from("conteudos").insert(f); onMsg("Salvo"); setF({...f,nome:""}); setEditId(null); loadCont(); }
  function edit(c:any) { setEditId(c.id); setF({disciplina_id:c.disciplina_id,nome:c.nome}); }
  async function remove(id:string) { if(!confirm("Remover?"))return; await s().from("conteudos").delete().eq("id",id); onMsg("Removido"); loadCont(); }
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-card p-6">
        <h3 className="font-bold mb-4">{editId?"Editar":"Novo"} Conteudo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={f.disciplina_id} onChange={e=>setF({...f,disciplina_id:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" disabled={!!editId}><option value="">Disciplina</option>{disciplinas.map((d:any)=><option key={d.id} value={d.id}>{d.concursos?.nome} &gt; {d.nome}</option>)}</select>
          <input placeholder="Nome *" value={f.nome} onChange={e=>setF({...f,nome:e.target.value})} className="border rounded px-3 py-2 text-sm bg-background" />
        </div>
        <div className="flex gap-2 mt-3"><Button size="sm" onClick={save} disabled={!f.nome}>Salvar</Button>{editId&&<Button size="sm" variant="ghost" onClick={()=>{setEditId(null);setF({...f,nome:""});}}>Cancelar</Button>}</div>
      </div>
      <div className="bg-card border rounded-card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 border-b"><tr><th className="text-left p-3">Disciplina</th><th className="text-left p-3">Conteudo</th><th className="text-left p-3">Acoes</th></tr></thead>
        <tbody>{conteudos.map((c:any)=>(<tr key={c.id} className="border-b hover:bg-muted/30"><td className="p-3 text-xs">{c.disciplinas?.nome||"-"}</td><td className="p-3 text-xs">{c.nome}</td><td className="p-3"><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=>edit(c)}>Editar</Button><Button size="sm" variant="destructive" className="h-7 text-xs" onClick={()=>remove(c.id)}>X</Button></div></td></tr>))}</tbody></table></div>
    </div>
  );
}


function NotificacoesTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { load(); }, []);
  
  async function load() {
    setError("");
    const sup = s();
    // Busca denuncias direto (nao notificacoes)
    const { data, error: err } = await sup.from("denuncias").select("*, comentarios(texto, user_id, user_name, user_avatar)").order("created_at", { ascending: false }).limit(50);
    if (err) { setError(err.message); return; }
    const denuncias = data || [];
    
    // Fetch profiles for denunciantes
    const userIds = [...new Set(denuncias.map((d: any) => d.user_id).filter(Boolean))];
    const profiles: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profs } = await sup.from("profiles").select("id, nome, avatar_url").in("id", userIds);
      if (profs) profs.forEach((p: any) => { profiles[p.id] = p; });
    }
    
    // Attach profile to each denuncia
    setNotifs(denuncias.map((d: any) => ({ ...d, denunciante: profiles[d.user_id] || null })));
  }

  async function markRead(id: string) {
    if (!confirm("Excluir esta denúncia?")) return;
    await s().from("denuncias").delete().eq("id", id);
    onMsg("Denúncia excluída"); load();
  }

  async function apagarComentario(cid: string) {
    if (!confirm("Apagar o comentário denunciado?")) return;
    await s().from("comentarios").delete().eq("id", cid);
    onMsg("Comentário apagado"); load();
  }

  const pendentes = notifs.length;

  return (
    <div className="space-y-4">
      <h2 className="font-bold">Denúncias {pendentes > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-2">{pendentes}</span>}</h2>
      {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-lg text-sm">{error}</div>}
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
                  <button onClick={() => markRead(n.id)} className="text-xs text-muted-foreground hover:text-foreground">Excluir denúncia</button>
                  {n.comentario_id && <button onClick={() => apagarComentario(n.comentario_id)} className="text-xs text-red-500 hover:text-red-700">Apagar comentário</button>}
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

