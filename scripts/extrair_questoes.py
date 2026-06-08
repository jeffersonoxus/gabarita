#!/usr/bin/env python3
"""
Re-extrai texto das provas sem -layout e gera questoes.json estruturado
com questoes e gabaritos pareados.

Uso:
    python3 scripts/extrair_questoes.py
"""

import os, sys, json, re, subprocess

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "questoes")

def extrair_texto_flow(pdf_path, txt_path):
    """Extrai texto sem -layout (fluxo de leitura natural)."""
    try:
        subprocess.run(
            ["pdftotext", pdf_path, txt_path],
            check=True, capture_output=True, timeout=60
        )
        return True
    except:
        return False

def parse_gabarito_tabela(texto):
    """Parse gabarito no formato de tabela do CESPE."""
    gabaritos = {}
    linhas = texto.split("\n")
    i = 0
    while i < len(linhas):
        if re.match(r'\s*Item\s+', linhas[i], re.IGNORECASE):
            linha_itens = linhas[i]
            if i + 1 < len(linhas):
                linha_gabs = linhas[i + 1]
                nums = re.findall(r'\b(\d+)\b', linha_itens)
                gabs = re.findall(r'\b([CE])\b', linha_gabs)
                for j, num in enumerate(nums):
                    if j < len(gabs):
                        n = int(num)
                        if n <= 200:  # sanity check
                            gabaritos[n] = "A" if gabs[j] == "C" else "B"
        i += 1
    return gabaritos

def parse_questoes(texto):
    """Extrai questoes do texto corrido (sem -layout)."""
    questoes = {}
    linhas = texto.split("\n")

    # Pular cabecalho/instrucoes
    inicio = 0
    for i, linha in enumerate(linhas):
        if re.match(r'^\s*\d+\s', linha) and len(linha) < 120:
            inicio = i
            break

    num_atual = None
    buf = []
    header_lines = set()

    # Identificar cabecalhos repetidos (ex: "CESPE | CEBRASPE")
    for linha in linhas:
        if "CESPE" in linha or "CEBRASPE" in linha or linha.startswith("||"):
            header_lines.add(linha.strip())

    for linha in linhas[inicio:]:
        stripped = linha.strip()
        if not stripped:
            continue
        if stripped in header_lines:
            continue
        if any(p in stripped.lower() for p in ["cada um dos itens", "de acordo com o comando",
                                                 "na folha de respostas", "em suas provas",
                                                 "eventuais espaços", "espaço livre",
                                                 "para as devidas", "serão utilizados"]):
            continue

        # Tenta detectar inicio de questao: numero seguido de espaco
        m = re.match(r'^(\d+)\s{2,}', linha)
        if m and len(stripped) < 150:
            if num_atual is not None and buf:
                texto_q = " ".join(buf).strip()
                if len(texto_q) > 20:
                    questoes[num_atual] = texto_q
            num_atual = int(m.group(1))
            resto = linha[m.end():].strip()
            buf = [resto] if resto else []
        elif num_atual is not None:
            if not stripped.startswith("||"):
                buf.append(stripped)

    if num_atual is not None and buf:
        texto_q = " ".join(buf).strip()
        if len(texto_q) > 20:
            questoes[num_atual] = texto_q

    return questoes

def parse_multipla_escolha(texto):
    """Detecta questoes de multipla escolha com alternativas A-E."""
    # Para questoes multipla escolha, o formato e diferente
    # Vamos usar o mesmo parser basico mas tentar extrair alternativas
    questoes = {}
    linhas = texto.split("\n")

    num_atual = None
    buf = []
    alternativas = {}

    for linha in linhas:
        stripped = linha.strip()
        if not stripped:
            continue

        m = re.match(r'^(\d+)\s{2,}', linha)
        if m and len(stripped) < 150:
            if num_atual is not None and buf:
                questoes[num_atual] = " ".join(buf).strip()
            num_atual = int(m.group(1))
            buf = [linha[m.end():].strip()]
        elif num_atual is not None:
            if re.match(r'^\(?[A-E]\)?\s', stripped):
                alternativas[num_atual] = alternativas.get(num_atual, []) + [stripped]
            else:
                buf.append(stripped)

    if num_atual is not None and buf:
        questoes[num_atual] = " ".join(buf).strip()

    return questoes

def processar_fonte(pasta_dir, meta):
    """Processa uma fonte e gera questoes.json."""
    pdf_prova = os.path.join(pasta_dir, "prova.pdf")
    pdf_gabarito = os.path.join(pasta_dir, "gabarito.pdf")
    txt_prova = os.path.join(pasta_dir, "prova_flow.txt")
    txt_gabarito = os.path.join(pasta_dir, "gabarito_flow.txt")

    # Re-extrair sem -layout
    if os.path.exists(pdf_prova):
        extrair_texto_flow(pdf_prova, txt_prova)
    if os.path.exists(pdf_gabarito):
        extrair_texto_flow(pdf_gabarito, txt_gabarito)

    # Parse
    gabaritos = {}
    if os.path.exists(txt_gabarito):
        with open(txt_gabarito) as f:
            gabaritos = parse_gabarito_tabela(f.read())

    questoes = {}
    if os.path.exists(txt_prova):
        with open(txt_prova) as f:
            texto = f.read()
        if meta.get("modalidade") == "multipla_escolha":
            questoes = parse_multipla_escolha(texto)
        else:
            questoes = parse_questoes(texto)

    # Parear
    questoes_json = []
    for num in sorted(set(list(questoes.keys()) + list(gabaritos.keys()))):
        enunciado = questoes.get(num, "").strip()
        gab = gabaritos.get(num, "")
        if not enunciado or len(enunciado) < 20:
            continue
        questoes_json.append({
            "numero": num,
            "enunciado": enunciado,
            "gabarito": gab,
            "fonte_id": os.path.basename(pasta_dir),
        })

    return questoes_json

def main():
    dirs = sorted(os.listdir(BASE))
    total = 0
    for d in dirs:
        pasta_dir = os.path.join(BASE, d)
        if not os.path.isdir(pasta_dir):
            continue
        meta_path = os.path.join(pasta_dir, "fonte.json")
        if not os.path.exists(meta_path):
            continue
        meta = json.load(open(meta_path))
        print(f"Processando: {meta['concurso']} {meta['ano']}...", end=" ", flush=True)
        questoes = processar_fonte(pasta_dir, meta)
        q_path = os.path.join(pasta_dir, "questoes.json")
        with open(q_path, "w", encoding="utf-8") as f:
            json.dump(questoes, f, ensure_ascii=False, indent=2)
        print(f"{len(questoes)} questoes extraidas")
        total += len(questoes)

    print(f"\nTotal: {total} questoes em {len([d for d in dirs if os.path.isdir(os.path.join(BASE, d))])} fontes")

if __name__ == "__main__":
    main()
