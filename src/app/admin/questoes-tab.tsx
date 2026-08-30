"use client";

import { useEffect, useState, useCallback, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getBrowserClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { parseJSON, parseCSV, chunk, type ParsedQuestao, type TextoApoioInput } from "@/lib/questoes-import";
import { sha256Hex } from "@/lib/utils";

interface QuestoesTabProps {
  onMsg?: (m: string) => void;
}

const QuestoesTab = memo(function QuestoesTab({ onMsg }: QuestoesTabProps) {
  const [concursos, setConcursos] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [filterConcurso, setFilterConcurso] = useState("");
  const [filterDisciplina, setFilterDisciplina] = useState("");
  const [search, setSearch] = useState("");

  const [importConcurso, setImportConcurso] = useState("");
  const [parsed, setParsed] = useState<ParsedQuestao[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [resolveErrors, setResolveErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const sup = getBrowserClient;

  const loadQuestoes = useCallback(async () => {
    let q = sup().from("questoes").select("*,disciplinas(nome),conteudos(nome)").order("created_at", { ascending: false }).limit(50);
    if (filterConcurso) q = q.eq("concurso_id", filterConcurso);
    if (filterDisciplina) q = q.eq("disciplina_id", filterDisciplina);
    if (search) q = q.ilike("enunciado", `%${search}%`);
    const { data } = await q;
    if (data) setQuestoes(data);
  }, [filterConcurso, filterDisciplina, search]);

  const loadDisciplinas = useCallback(async (cid: string) => {
    if (!cid) { setDisciplinas([]); return; }
    const { data } = await sup().from("disciplinas").select("id,nome,grupos!inner(concurso_id)").eq("grupos.concurso_id", cid).order("nome");
    if (data) setDisciplinas(data);
  }, []);

  useEffect(() => {
    sup().from("concursos").select("id,nome").order("nome").then((res: any) => { if (res.data) setConcursos(res.data); });
    loadQuestoes();
  }, []);

  useEffect(() => {
    if (filterConcurso) loadDisciplinas(filterConcurso);
  }, [filterConcurso]);

  useEffect(() => {
    loadQuestoes();
  }, [filterDisciplina, filterConcurso]);

  function msg(m: string) {
    if (onMsg) onMsg(m);
    else toast(m);
  }

  async function remove(id: string) {
    if (!confirm("Remover?")) return;
    await sup().from("questoes").delete().eq("id", id);
    msg("Removida");
    loadQuestoes();
  }

  function downloadTemplateJSON() {
    const template = [
      {
        texto_apoio: { titulo: "Título opcional", corpo: "Corpo do texto de apoio (obrigatório se houver texto_apoio)", fonte: "Fonte opcional" },
        questoes: [
          { grupo: "Conhecimentos Básicos", disciplina: "Geografia", unidade: "Espaço urbano", conteudo: "Urbanização", tipo: "certo_errado", enunciado: "Enunciado da questão", alternativa_a: "Certo", alternativa_b: "Errado", gabarito: "A" },
        ],
      },
      { questoes: [{ grupo: "Conhecimentos Específicos", disciplina: "Direito Administrativo", conteudo: "Princípios", tipo: "multipla_escolha", enunciado: "Enunciado da questão", alternativa_a: "Alt A", alternativa_b: "Alt B", alternativa_c: "Alt C", alternativa_d: "Alt D", alternativa_e: "Alt E", gabarito: "A" }] },
    ];
    downloadFile("modelo.json", JSON.stringify(template, null, 2), "application/json");
  }

  function downloadTemplateCSV() {
    const hdr = "grupo;disciplina;unidade;conteudo;tipo;enunciado;alternativa_a;alternativa_b;alternativa_c;alternativa_d;alternativa_e;gabarito;texto_apoio_ref;texto_apoio_titulo;texto_apoio_corpo;texto_apoio_fonte;imagem_url;fonte_banca;fonte_ano;fonte_orgao;fonte_cargo;adaptada";
    const ex1 = "Conhecimentos Básicos;Geografia;Espaço urbano;Urbanização;certo_errado;Enunciado da questão;Certo;Errado;;;;A;TA1;Título opcional;Corpo do texto de apoio;Fonte opcional;;;;;;";
    const ex2 = "Conhecimentos Específicos;Direito Administrativo;;Princípios;multipla_escolha;Enunciado da questão;Alt A;Alt B;Alt C;Alt D;Alt E;A;;;;;;;;;;";
    downloadFile("modelo.csv", "﻿" + [hdr, ex1, ex2].join("\n") + "\n", "text/csv;charset=utf-8");
  }

  function downloadFile(name: string, content: string, type: string) {
    const b = new Blob([content], { type });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u; a.download = name; a.click();
    URL.revokeObjectURL(u);
  }

  async function handleFile(file: File) {
    setParsed(null); setParseErrors([]); setResolveErrors([]);
    const text = await file.text();
    const isJSON = file.name.toLowerCase().endsWith(".json");
    const result = isJSON ? parseJSON(text) : parseCSV(text);
    setParsed(result.questoes);
    setParseErrors(result.errors);
    if (result.questoes.length && !result.errors.length) await validarTaxonomia(result.questoes);
  }

  async function validarTaxonomia(rows: ParsedQuestao[]) {
    if (!importConcurso) { setResolveErrors(["Selecione o concurso antes de importar."]); return; }
    const { data: grupos } = await sup().from("grupos").select("id,nome").eq("concurso_id", importConcurso);
    const grupoByNome = new Map((grupos || []).map((g: any) => [g.nome.trim().toLowerCase(), g.id]));
    const grupoIds = (grupos || []).map((g: any) => g.id);

    const { data: discs } = grupoIds.length ? await sup().from("disciplinas").select("id,nome,grupo_id").in("grupo_id", grupoIds) : { data: [] as any[] };
    const discByKey = new Map((discs || []).map((d: any) => [`${d.grupo_id}::${d.nome.trim().toLowerCase()}`, d.id]));
    const discIds = (discs || []).map((d: any) => d.id);

    const { data: unis } = discIds.length ? await sup().from("unidades").select("id,nome,disciplina_id").in("disciplina_id", discIds) : { data: [] as any[] };
    const uniByKey = new Map((unis || []).map((u: any) => [`${u.disciplina_id}::${u.nome.trim().toLowerCase()}`, u.id]));

    const { data: conts } = discIds.length ? await sup().from("conteudos").select("id,nome,disciplina_id").in("disciplina_id", discIds) : { data: [] as any[] };
    const contByKey = new Map((conts || []).map((c: any) => [`${c.disciplina_id}::${c.nome.trim().toLowerCase()}`, c.id]));

    const errors: string[] = [];
    rows.forEach(({ linha, questao }) => {
      const gid = grupoByNome.get(questao.grupo.trim().toLowerCase());
      if (!gid) { errors.push(`Linha/questão ${linha}: grupo "${questao.grupo}" não encontrado neste concurso`); return; }
      const did = discByKey.get(`${gid}::${questao.disciplina.trim().toLowerCase()}`);
      if (!did) { errors.push(`Linha/questão ${linha}: disciplina "${questao.disciplina}" não encontrada no grupo "${questao.grupo}"`); return; }
      if (questao.unidade) {
        const uid = uniByKey.get(`${did}::${questao.unidade.trim().toLowerCase()}`);
        if (!uid) errors.push(`Linha/questão ${linha}: unidade "${questao.unidade}" não encontrada na disciplina "${questao.disciplina}"`);
      }
      const cid = contByKey.get(`${did}::${questao.conteudo.trim().toLowerCase()}`);
      if (!cid) errors.push(`Linha/questão ${linha}: tópico "${questao.conteudo}" não encontrado na disciplina "${questao.disciplina}"`);
    });
    setResolveErrors(errors);
  }

  async function importar() {
    if (!parsed || !importConcurso) return;
    setImporting(true);
    setImportProgress({ done: 0, total: parsed.length });

    const { data: grupos } = await sup().from("grupos").select("id,nome").eq("concurso_id", importConcurso);
    const grupoByNome = new Map((grupos || []).map((g: any) => [g.nome.trim().toLowerCase(), g.id]));
    const grupoIds = (grupos || []).map((g: any) => g.id);
    const { data: discs } = grupoIds.length ? await sup().from("disciplinas").select("id,nome,grupo_id").in("grupo_id", grupoIds) : { data: [] as any[] };
    const discByKey = new Map((discs || []).map((d: any) => [`${d.grupo_id}::${d.nome.trim().toLowerCase()}`, d.id]));
    const discIds = (discs || []).map((d: any) => d.id);
    const { data: unis } = discIds.length ? await sup().from("unidades").select("id,nome,disciplina_id").in("disciplina_id", discIds) : { data: [] as any[] };
    const uniByKey = new Map((unis || []).map((u: any) => [`${u.disciplina_id}::${u.nome.trim().toLowerCase()}`, u.id]));
    const { data: conts } = discIds.length ? await sup().from("conteudos").select("id,nome,disciplina_id").in("disciplina_id", discIds) : { data: [] as any[] };
    const contByKey = new Map((conts || []).map((c: any) => [`${c.disciplina_id}::${c.nome.trim().toLowerCase()}`, c.id]));

    // Fase 1: insere textos_apoio únicos (por identidade de objeto), reaproveitando
    // por hash do corpo quando o mesmo texto já existir no banco
    const textoApoioIdByObj = new Map<TextoApoioInput, string>();
    const uniqueTextos = [...new Set(parsed.map((p) => p.questao.texto_apoio).filter(Boolean))] as TextoApoioInput[];
    for (const ta of uniqueTextos) {
      const hash = await sha256Hex(ta.corpo);
      const { data, error } = await sup()
        .from("textos_apoio")
        .upsert({ titulo: ta.titulo || null, corpo: ta.corpo, fonte: ta.fonte || null, hash }, { onConflict: "hash" })
        .select("id")
        .single();
      if (error || !data) { setImporting(false); msg("Erro ao criar texto de apoio: " + (error?.message || "desconhecido")); return; }
      textoApoioIdByObj.set(ta, data.id);
    }

    // Fase 2: insere questões em lotes
    const payloads = parsed.map(({ questao }) => {
      const gid = grupoByNome.get(questao.grupo.trim().toLowerCase())!;
      const did = discByKey.get(`${gid}::${questao.disciplina.trim().toLowerCase()}`)!;
      const cid = contByKey.get(`${did}::${questao.conteudo.trim().toLowerCase()}`)!;
      return {
        concurso_id: importConcurso,
        disciplina_id: did,
        conteudo_id: cid,
        enunciado: questao.enunciado,
        alternativa_a: questao.alternativa_a,
        alternativa_b: questao.alternativa_b,
        alternativa_c: questao.alternativa_c || "",
        alternativa_d: questao.alternativa_d || "",
        alternativa_e: questao.alternativa_e || "",
        gabarito: questao.gabarito,
        tipo: questao.tipo,
        texto_apoio_id: questao.texto_apoio ? textoApoioIdByObj.get(questao.texto_apoio) || null : null,
        imagem_url: questao.imagem_url || null,
        fonte_banca: questao.fonte_banca || null,
        fonte_ano: questao.fonte_ano || null,
        fonte_orgao: questao.fonte_orgao || null,
        fonte_cargo: questao.fonte_cargo || null,
        adaptada: questao.adaptada || false,
      };
    });

    let inserted = 0;
    let failMsg = "";
    for (const batch of chunk(payloads, 300)) {
      const { error } = await sup().from("questoes").insert(batch);
      if (error) { failMsg = error.message; break; }
      inserted += batch.length;
      setImportProgress({ done: inserted, total: payloads.length });
    }

    setImporting(false);
    if (failMsg) msg(`Importadas ${inserted} de ${payloads.length}. Erro no lote seguinte: ${failMsg}`);
    else msg(`${inserted} questões importadas!`);
    setParsed(null); setParseErrors([]); setResolveErrors([]);
    if (fileRef.current) fileRef.current.value = "";
    loadQuestoes();
  }

  const canImport = parsed && parsed.length > 0 && parseErrors.length === 0 && resolveErrors.length === 0 && !importing;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card><CardContent className="p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground" htmlFor="tab-concurso">Concurso</label><select id="tab-concurso" value={filterConcurso} onChange={e => { setFilterConcurso(e.target.value); setFilterDisciplina(""); }} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Todos</option>{concursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground" htmlFor="tab-disciplina">Disciplina</label><select id="tab-disciplina" value={filterDisciplina} onChange={e => setFilterDisciplina(e.target.value)} className="border rounded px-3 py-2 text-sm bg-background"><option value="">Todas</option>{disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
        <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground" htmlFor="tab-busca">Buscar</label><input id="tab-busca" placeholder="Texto..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && loadQuestoes()} className="border rounded px-3 py-2 text-sm bg-background w-36" /></div>
        <Button variant="outline" size="sm" onClick={loadQuestoes} aria-label="Filtrar questões">Filtrar</Button>
      </CardContent></Card>

      {/* Import */}
      <Card><CardContent className="p-6">
        <h3 className="font-bold mb-1">Importar questões</h3>
        <p className="text-xs text-muted-foreground mb-4">Questões só podem ser adicionadas por arquivo JSON ou CSV. Edição de questões já importadas fica na aba Revisão.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          <select value={importConcurso} onChange={e => { setImportConcurso(e.target.value); setParsed(null); setParseErrors([]); setResolveErrors([]); }} className="border rounded px-3 py-2 text-sm bg-background" aria-label="Concurso para importação"><option value="">Concurso *</option>{concursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          <input ref={fileRef} type="file" accept=".json,.csv" disabled={!importConcurso} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className="text-xs border rounded px-3 py-2 bg-background flex-1 min-w-[200px]" aria-label="Upload de arquivo de questões" />
          <Button size="sm" variant="outline" onClick={downloadTemplateJSON}>Modelo JSON</Button>
          <Button size="sm" variant="outline" onClick={downloadTemplateCSV}>Modelo CSV</Button>
        </div>

        {parsed && (
          <div className="space-y-2 mb-3">
            <p className="text-sm">{parsed.length} questão(ões) lida(s) do arquivo.</p>
            {(parseErrors.length > 0 || resolveErrors.length > 0) && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-destructive mb-1">{parseErrors.length + resolveErrors.length} erro(s) — corrija o arquivo e reenvie:</p>
                <ul className="text-xs text-destructive space-y-0.5 list-disc pl-4">
                  {[...parseErrors, ...resolveErrors].map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            {parseErrors.length === 0 && resolveErrors.length === 0 && (
              <p className="text-xs text-emerald-600">Nenhum erro encontrado — pronto para importar.</p>
            )}
          </div>
        )}

        {importing && (
          <p className="text-xs text-muted-foreground mb-2">Importando... {importProgress.done}/{importProgress.total}</p>
        )}

        <Button size="sm" onClick={importar} disabled={!canImport}>Importar {parsed ? `${parsed.length} questões` : ""}</Button>
      </CardContent></Card>

      {/* List */}
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm"><thead className="border-b bg-muted/50"><tr><th className="text-left p-3 w-12">#</th><th className="text-left p-3">Enunciado</th><th className="text-left p-3 hidden sm:table-cell">Disciplina</th><th className="text-left p-3 hidden md:table-cell">Tópico</th><th className="text-left p-3">Gab</th><th className="text-left p-3 w-16">Ações</th></tr></thead>
          <tbody>{questoes.map((q: any, i: number) => (<tr key={q.id} className="border-b hover:bg-muted/30"><td className="p-3 text-xs text-muted-foreground">{i + 1}</td><td className="p-3 text-xs max-w-xs truncate">{q.enunciado?.substring(0, 80)}{q.enunciado?.length > 80 ? "..." : ""}</td><td className="p-3 text-xs hidden sm:table-cell">{q.disciplinas?.nome || "-"}</td><td className="p-3 text-xs hidden md:table-cell max-w-[120px] truncate">{q.conteudos?.nome || "-"}</td><td className="p-3 text-xs font-bold">{q.gabarito}</td><td className="p-3"><Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => remove(q.id)} aria-label={`Remover questão ${i + 1}`}>X</Button></td></tr>))}</tbody></table>
      </CardContent></Card>
    </div>
  );
});

export default QuestoesTab;
