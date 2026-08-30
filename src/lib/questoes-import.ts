import Papa from "papaparse";

export type TipoQuestao = "certo_errado" | "multipla_escolha";

export interface TextoApoioInput {
  titulo?: string;
  corpo: string;
  fonte?: string;
}

export interface QuestaoInput {
  grupo: string;
  disciplina: string;
  unidade?: string;
  conteudo: string;
  tipo: TipoQuestao;
  enunciado: string;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c?: string;
  alternativa_d?: string;
  alternativa_e?: string;
  gabarito: string;
  imagem_url?: string;
  fonte_banca?: string;
  fonte_ano?: string;
  fonte_orgao?: string;
  fonte_cargo?: string;
  adaptada?: boolean;
  texto_apoio?: TextoApoioInput;
}

export interface ParsedQuestao {
  linha: number;
  questao: QuestaoInput;
}

export interface ParseResult {
  questoes: ParsedQuestao[];
  errors: string[];
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function toBool(v: unknown, ref: string, field: string, errors: string[]): boolean {
  const s = str(v).toLowerCase();
  if (!s) return false;
  if (["true", "1", "sim", "s"].includes(s)) return true;
  if (["false", "0", "nao", "não", "n"].includes(s)) return false;
  errors.push(`${ref}: valor inválido para "${field}" ("${v}") — use true/false ou sim/não`);
  return false;
}

function normalizeGabarito(tipo: TipoQuestao, raw: unknown, ref: string, errors: string[]): string {
  const s = str(raw).toUpperCase();
  if (tipo === "certo_errado") {
    if (s === "A" || s === "B") return s;
    if (s === "CERTO" || s === "C") return "A";
    if (s === "ERRADO" || s === "E") return "B";
    errors.push(`${ref}: gabarito inválido "${raw}" para questão certo_errado (use A/B ou Certo/Errado)`);
    return "";
  }
  if (["A", "B", "C", "D", "E"].includes(s)) return s;
  errors.push(`${ref}: gabarito inválido "${raw}" para questão de múltipla escolha (use A-E)`);
  return "";
}

function validateAndBuildQuestao(raw: Record<string, unknown>, ref: string): { questao: QuestaoInput | null; errors: string[] } {
  const errors: string[] = [];
  const grupo = str(raw.grupo);
  const disciplina = str(raw.disciplina);
  const unidade = str(raw.unidade) || undefined;
  const conteudo = str(raw.conteudo);
  const tipoRaw = str(raw.tipo).toLowerCase();
  const enunciado = str(raw.enunciado);
  const alternativa_a = str(raw.alternativa_a);
  const alternativa_b = str(raw.alternativa_b);
  const alternativa_c = str(raw.alternativa_c) || undefined;
  const alternativa_d = str(raw.alternativa_d) || undefined;
  const alternativa_e = str(raw.alternativa_e) || undefined;

  if (!grupo) errors.push(`${ref}: "grupo" é obrigatório`);
  if (!disciplina) errors.push(`${ref}: "disciplina" é obrigatória`);
  if (!conteudo) errors.push(`${ref}: "conteudo" é obrigatório`);
  if (tipoRaw !== "certo_errado" && tipoRaw !== "multipla_escolha") {
    errors.push(`${ref}: "tipo" inválido "${raw.tipo}" (use certo_errado ou multipla_escolha)`);
    return { questao: null, errors };
  }
  const tipo = tipoRaw as TipoQuestao;
  if (!enunciado) errors.push(`${ref}: "enunciado" é obrigatório`);
  if (!alternativa_a) errors.push(`${ref}: "alternativa_a" é obrigatória`);
  if (!alternativa_b) errors.push(`${ref}: "alternativa_b" é obrigatória`);
  if (tipo === "multipla_escolha") {
    if (!alternativa_c) errors.push(`${ref}: "alternativa_c" é obrigatória para múltipla escolha`);
    if (!alternativa_d) errors.push(`${ref}: "alternativa_d" é obrigatória para múltipla escolha`);
    if (!alternativa_e) errors.push(`${ref}: "alternativa_e" é obrigatória para múltipla escolha`);
  }

  const gabarito = normalizeGabarito(tipo, raw.gabarito, ref, errors);
  const adaptada = raw.adaptada != null ? toBool(raw.adaptada, ref, "adaptada", errors) : false;

  if (errors.length) return { questao: null, errors };

  const questao: QuestaoInput = {
    grupo, disciplina, unidade, conteudo, tipo, enunciado,
    alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e,
    gabarito, adaptada,
    imagem_url: str(raw.imagem_url) || undefined,
    fonte_banca: str(raw.fonte_banca) || undefined,
    fonte_ano: str(raw.fonte_ano) || undefined,
    fonte_orgao: str(raw.fonte_orgao) || undefined,
    fonte_cargo: str(raw.fonte_cargo) || undefined,
  };
  return { questao, errors: [] };
}

function validateTextoApoio(raw: unknown, ref: string): { textoApoio: TextoApoioInput | undefined; errors: string[] } {
  if (raw == null) return { textoApoio: undefined, errors: [] };
  if (typeof raw !== "object") return { textoApoio: undefined, errors: [`${ref}: "texto_apoio" deve ser um objeto`] };
  const obj = raw as Record<string, unknown>;
  const corpo = str(obj.corpo);
  if (!corpo) return { textoApoio: undefined, errors: [`${ref}: "texto_apoio.corpo" é obrigatório quando o bloco define texto_apoio`] };
  return {
    textoApoio: { corpo, titulo: str(obj.titulo) || undefined, fonte: str(obj.fonte) || undefined },
    errors: [],
  };
}

export function parseJSON(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { questoes: [], errors: [`JSON inválido: ${e instanceof Error ? e.message : String(e)}`] };
  }
  if (!Array.isArray(data)) {
    return { questoes: [], errors: ['O JSON precisa ser uma lista de "blocos" (array).'] };
  }

  const errors: string[] = [];
  const questoes: ParsedQuestao[] = [];
  let linha = 0;

  data.forEach((blocoRaw, blocoIdx) => {
    if (typeof blocoRaw !== "object" || blocoRaw === null) {
      errors.push(`Bloco ${blocoIdx + 1}: precisa ser um objeto`);
      return;
    }
    const bloco = blocoRaw as Record<string, unknown>;
    const { textoApoio, errors: taErrors } = validateTextoApoio(bloco.texto_apoio, `Bloco ${blocoIdx + 1}`);
    taErrors.forEach((e) => errors.push(e));

    const qs = bloco.questoes;
    if (!Array.isArray(qs) || qs.length === 0) {
      errors.push(`Bloco ${blocoIdx + 1}: "questoes" precisa ser uma lista não-vazia`);
      return;
    }
    qs.forEach((qRaw, qIdx) => {
      linha++;
      const ref = `Bloco ${blocoIdx + 1}, questão ${qIdx + 1}`;
      if (typeof qRaw !== "object" || qRaw === null) {
        errors.push(`${ref}: precisa ser um objeto`);
        return;
      }
      const { questao, errors: qErrors } = validateAndBuildQuestao(qRaw as Record<string, unknown>, ref);
      qErrors.forEach((e) => errors.push(e));
      if (questao) {
        if (textoApoio) questao.texto_apoio = textoApoio; // mesma referência de objeto p/ todo o bloco
        questoes.push({ linha, questao });
      }
    });
  });

  return { questoes, errors };
}

export function parseCSV(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: ";",
    transformHeader: (h) => h.trim(),
  });

  const errors: string[] = parsed.errors.map(
    (e) => `Linha ${(e.row ?? 0) + 2}: erro ao ler CSV (${e.message})`
  );
  const rows = parsed.data;

  // Passo 1: resolve o conteúdo de cada texto_apoio_ref, em qualquer ordem,
  // e detecta conteúdo divergente pro mesmo ref.
  const refMap = new Map<string, TextoApoioInput>();
  const refConflict = new Set<string>();
  rows.forEach((raw) => {
    const ref = str(raw.texto_apoio_ref);
    const corpo = str(raw.texto_apoio_corpo);
    if (!ref || !corpo) return;
    const candidate: TextoApoioInput = {
      corpo,
      titulo: str(raw.texto_apoio_titulo) || undefined,
      fonte: str(raw.texto_apoio_fonte) || undefined,
    };
    const existing = refMap.get(ref);
    if (!existing) {
      refMap.set(ref, candidate);
    } else if (
      existing.corpo !== candidate.corpo ||
      existing.titulo !== candidate.titulo ||
      existing.fonte !== candidate.fonte
    ) {
      refConflict.add(ref);
    }
  });
  refConflict.forEach((ref) => {
    errors.push(`texto_apoio_ref "${ref}": conteúdo de texto de apoio diferente em mais de uma linha`);
  });

  const questoes: ParsedQuestao[] = [];
  rows.forEach((raw, i) => {
    const linha = i + 2; // +1 header, +1 base 1
    const ref = str(raw.texto_apoio_ref);
    let textoApoio: TextoApoioInput | undefined;
    if (ref) {
      const resolved = refMap.get(ref);
      if (!resolved) {
        errors.push(`Linha ${linha}: texto_apoio_ref "${ref}" não tem texto_apoio_corpo definido em nenhuma linha`);
      } else {
        textoApoio = resolved; // mesma referência de objeto p/ todas as linhas com esse ref
      }
    } else {
      const corpo = str(raw.texto_apoio_corpo);
      if (corpo) {
        textoApoio = { corpo, titulo: str(raw.texto_apoio_titulo) || undefined, fonte: str(raw.texto_apoio_fonte) || undefined };
      }
    }

    const { questao, errors: qErrors } = validateAndBuildQuestao(raw, `Linha ${linha}`);
    qErrors.forEach((e) => errors.push(e));
    if (questao) {
      if (textoApoio) questao.texto_apoio = textoApoio;
      questoes.push({ linha, questao });
    }
  });

  return { questoes, errors };
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
