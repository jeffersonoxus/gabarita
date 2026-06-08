#!/usr/bin/env python3
"""
Baixa provas CESPE/CEBRASPE de Lingua Portuguesa do QConcursos.
Organiza em scripts/questoes/<concurso>/ com metadados.

Uso:
    python3 scripts/baixar_provas.py          # baixa tudo
    python3 scripts/baixar_provas.py --listar # lista o que ja tem
"""

import requests, os, sys, json, subprocess, re, textwrap
from datetime import datetime

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "questoes")
os.makedirs(BASE, exist_ok=True)

HEADERS = {"User-Agent": "Mozilla/5.0"}

# Cada fonte: id_unico, pasta, metadados, url_prova, url_gabarito
FONTES = [
    {
        "id": "cespe-2011-seduc-am-professor-lp",
        "pasta": "2011_seduc_am_professor_lp",
        "meta": {
            "concurso": "SEDUC-AM",
            "ano": 2011,
            "banca": "CESPE",
            "orgao": "Secretaria de Estado da Educacao do Amazonas",
            "cargo": "Professor - Lingua Portuguesa",
            "nivel": "Superior",
            "total_questoes": 120,
            "modalidade": "certo_errado",
            "url_qconcursos": "https://www.qconcursos.com/questoes-de-concursos/provas/cespe-2011-seduc-am-professor-lingua-portuguesa",
            "disciplina": "Lingua Portuguesa",
            "assuntos": ["Interpretacao de Textos", "Sintaxe", "Morfologia", "Gramatica"]
        },
        "url_prova": "https://arquivos.qconcursos.com/prova/arquivo_prova/28168/cespe-2011-seduc-am-professor-lingua-portuguesa-prova.pdf",
        "url_gabarito": "https://arquivos.qconcursos.com/prova/arquivo_gabarito/28168/cespe-2011-seduc-am-professor-lingua-portuguesa-gabarito.pdf"
    },
    {
        "id": "cespe-2013-mj-conhecimentos-basicos",
        "pasta": "2013_mj_conhecimentos_basicos",
        "meta": {
            "concurso": "MJ",
            "ano": 2013,
            "banca": "CESPE",
            "orgao": "Ministerio da Justica",
            "cargo": "Todos os Cargos",
            "nivel": "Medio",
            "total_questoes": 50,
            "modalidade": "certo_errado",
            "url_qconcursos": "https://www.qconcursos.com/questoes-de-concursos/provas/cespe-2013-mj-todos-os-cargos-conhecimentos-basicos",
            "disciplina": "Conhecimentos Basicos (15 questoes de Portugues)",
            "assuntos": ["Portugues", "Direito Constitucional", "Direito Administrativo"]
        },
        "url_prova": "https://arquivos.qconcursos.com/prova/arquivo_prova/32143/cespe-2013-mj-todos-os-cargos-conhecimentos-basicos-prova.pdf",
        "url_gabarito": "https://arquivos.qconcursos.com/prova/arquivo_gabarito/32143/cespe-2013-mj-todos-os-cargos-conhecimentos-basicos-gabarito.pdf"
    },
    {
        "id": "cespe-2015-tce-rn-conhecimentos-basicos",
        "pasta": "2015_tce_rn_conhecimentos_basicos",
        "meta": {
            "concurso": "TCE-RN",
            "ano": 2015,
            "banca": "CESPE",
            "orgao": "Tribunal de Contas do RN",
            "cargo": "Cargo 1 - Nivel Superior",
            "nivel": "Superior",
            "total_questoes": 50,
            "modalidade": "certo_errado",
            "url_qconcursos": "https://www.qconcursos.com/questoes-de-concursos/provas/cespe-2015-tce-rn-conhecimentos-basicos-para-o-cargo-1",
            "disciplina": "Conhecimentos Basicos",
            "assuntos": ["Portugues", "Direito Constitucional", "Administracao"]
        },
        "url_prova": "https://arquivos.qconcursos.com/prova/arquivo_prova/45987/cespe-2015-tce-rn-conhecimentos-basicos-para-o-cargo-1-prova.pdf",
        "url_gabarito": "https://arquivos.qconcursos.com/prova/arquivo_gabarito/45987/cespe-2015-tce-rn-conhecimentos-basicos-para-o-cargo-1-gabarito.pdf"
    },
    {
        "id": "cespe-2015-stj-conhecimentos-basicos",
        "pasta": "2015_stj_conhecimentos_basicos",
        "meta": {
            "concurso": "STJ",
            "ano": 2015,
            "banca": "CESPE",
            "orgao": "Superior Tribunal de Justica",
            "cargo": "Cargo 15",
            "nivel": "Medio",
            "total_questoes": 50,
            "modalidade": "certo_errado",
            "url_qconcursos": "https://www.qconcursos.com/questoes-de-concursos/provas/cespe-2015-stj-conhecimentos-basicos-para-o-cargo-15",
            "disciplina": "Conhecimentos Basicos",
            "assuntos": ["Portugues", "Direito Constitucional", "Informatica"]
        },
        "url_prova": "https://arquivos.qconcursos.com/prova/arquivo_prova/44747/cespe-2015-stj-conhecimentos-basicos-para-o-cargo-15-prova.pdf",
        "url_gabarito": "https://arquivos.qconcursos.com/prova/arquivo_gabarito/44747/cespe-2015-stj-conhecimentos-basicos-para-o-cargo-15-gabarito.pdf"
    },
    {
        "id": "cespe-2024-camacari-professor-lp",
        "pasta": "2024_camacari_professor_lp",
        "meta": {
            "concurso": "Prefeitura de Camacari-BA",
            "ano": 2024,
            "banca": "CESPE/CEBRASPE",
            "orgao": "Prefeitura de Camacari",
            "cargo": "Professor - Lingua Portuguesa",
            "nivel": "Superior",
            "total_questoes": 50,
            "modalidade": "multipla_escolha",
            "url_qconcursos": "https://www.qconcursos.com/questoes-de-concursos/provas/cespe-cebraspe-2024-prefeitura-de-camacari-ba-professor-disciplina-lingua-portuguesa",
            "disciplina": "Lingua Portuguesa",
            "assuntos": ["Interpretacao de Textos", "Gramatica", "Literatura"]
        },
        "url_prova": "https://arquivos.qconcursos.com/prova/arquivo_prova/102567/cespe-cebraspe-2024-prefeitura-de-camacari-ba-professor-disciplina-lingua-portuguesa-prova.pdf",
        "url_gabarito": "https://arquivos.qconcursos.com/prova/arquivo_gabarito/102567/cespe-cebraspe-2024-prefeitura-de-camacari-ba-professor-disciplina-lingua-portuguesa-gabarito.pdf"
    },
    {
        "id": "cespe-2025-inoversasul-professor-lp",
        "pasta": "2025_inoversasul_professor_lp",
        "meta": {
            "concurso": "InoversaSul",
            "ano": 2025,
            "banca": "CESPE/CEBRASPE",
            "orgao": "Fundacao InoversaSul",
            "cargo": "Professor de Lingua Portuguesa",
            "nivel": "Superior",
            "total_questoes": 100,
            "modalidade": "certo_errado",
            "url_qconcursos": "https://www.qconcursos.com/questoes-de-concursos/provas/cespe-cebraspe-2025-inoversasul-professor-de-lingua-portuguesa-anos-finais",
            "disciplina": "Lingua Portuguesa",
            "assuntos": ["Interpretacao de Textos", "Gramatica", "Sintaxe", "Morfologia", "Literatura", "Pedagogia"]
        },
        "url_prova": "https://arquivos.qconcursos.com/prova/arquivo_prova/125713/cespe-cebraspe-2025-inoversasul-professor-de-lingua-portuguesa-anos-finais-prova.pdf",
        "url_gabarito": "https://arquivos.qconcursos.com/prova/arquivo_gabarito/125713/cespe-cebraspe-2025-inoversasul-professor-de-lingua-portuguesa-anos-finais-gabarito.pdf"
    },
    {
        "id": "cespe-2026-seduc-se-professor-lp",
        "pasta": "2026_seduc_se_professor_lp",
        "meta": {
            "concurso": "SEDUC-SE",
            "ano": 2026,
            "banca": "CESPE/CEBRASPE",
            "orgao": "Secretaria de Estado da Educacao de Sergipe",
            "cargo": "Professor - Lingua Portuguesa",
            "nivel": "Superior",
            "total_questoes": 60,
            "modalidade": "multipla_escolha",
            "url_qconcursos": "https://www.qconcursos.com/questoes-de-concursos/provas/cespe-cebraspe-2026-seduc-se-professor-de-educacao-basica-area-de-atuacao-grupo-i-ensino-fundamental-e-medio-disciplina-lingua-portuguesa",
            "disciplina": "Lingua Portuguesa",
            "assuntos": ["Interpretacao de Textos", "Gramatica", "Literatura", "Pedagogia"]
        },
        "url_prova": "https://arquivos.qconcursos.com/prova/arquivo_prova/144030/cespe-cebraspe-2026-seduc-se-professor-de-educacao-basica-area-de-atuacao-grupo-i-ensino-fundamental-e-medio-disciplina-lingua-portuguesa-prova.pdf",
        "url_gabarito": "https://arquivos.qconcursos.com/prova/arquivo_gabarito/144030/cespe-cebraspe-2026-seduc-se-professor-de-educacao-basica-area-de-atuacao-grupo-i-ensino-fundamental-e-medio-disciplina-lingua-portuguesa-gabarito.pdf"
    }
]

def baixar(url, destino, label):
    if os.path.exists(destino):
        print(f"  Ja existe: {label}")
        return True
    print(f"  Baixando {label}...")
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        if r.status_code == 200 and (r.content[:5] == b"%PDF-" or destino.endswith(".json")):
            with open(destino, "wb") as f:
                f.write(r.content)
            print(f"    OK ({len(r.content)} bytes)")
            return True
        else:
            print(f"    Falha: status={r.status_code}, header={r.content[:20]}")
            return False
    except Exception as e:
        print(f"    Erro: {e}")
        return False

def extrair_texto(pdf_path, txt_path):
    if os.path.exists(txt_path):
        return True
    try:
        subprocess.run(["pdftotext", "-layout", pdf_path, txt_path], check=True, capture_output=True, timeout=60)
        return True
    except subprocess.CalledProcessError as e:
        print(f"    Erro pdftotext: {e.stderr.decode()[:200]}")
        return False
    except FileNotFoundError:
        print("    pdftotext nao encontrado. Instale: apt install poppler-utils")
        return False

def main():
    if "--listar" in sys.argv:
        print(f"\n{'PASTA':<45} {'CONCURSO':<25} {'ANO':<6} {'QUESTOES':<10} {'STATUS'}")
        print("-" * 100)
        for f in FONTES:
            pasta_dir = os.path.join(BASE, f["pasta"])
            tem_pdf = os.path.exists(os.path.join(pasta_dir, "prova.pdf"))
            tem_txt = os.path.exists(os.path.join(pasta_dir, "prova.txt"))
            if tem_txt:
                status = "OK"
            elif tem_pdf:
                status = "PDF baixado"
            else:
                status = "---"
            print(f"{f['pasta']:<45} {f['meta']['concurso']:<25} {f['meta']['ano']:<6} {f['meta']['total_questoes']:<10} {status}")
        return

    for f in FONTES:
        pasta_dir = os.path.join(BASE, f["pasta"])
        os.makedirs(pasta_dir, exist_ok=True)

        print(f"\n=== {f['meta']['concurso']} {f['meta']['ano']} - {f['meta']['cargo']} ===")

        # Salva metadados
        meta_path = os.path.join(pasta_dir, "fonte.json")
        with open(meta_path, "w", encoding="utf-8") as fp:
            json.dump(f["meta"], fp, ensure_ascii=False, indent=2)
        print(f"  Metadados salvos")

        # Baixa PDF da prova
        pdf_prova = os.path.join(pasta_dir, "prova.pdf")
        ok = baixar(f["url_prova"], pdf_prova, "prova.pdf")

        # Baixa PDF do gabarito
        pdf_gabarito = os.path.join(pasta_dir, "gabarito.pdf")
        ok_gab = baixar(f["url_gabarito"], pdf_gabarito, "gabarito.pdf")

        # Extrai texto
        if ok:
            txt_prova = os.path.join(pasta_dir, "prova.txt")
            extrair_texto(pdf_prova, txt_prova)
        if ok_gab:
            txt_gabarito = os.path.join(pasta_dir, "gabarito.txt")
            extrair_texto(pdf_gabarito, txt_gabarito)

        # Mostra estatisticas
        txt_path = os.path.join(pasta_dir, "prova.txt")
        if os.path.exists(txt_path):
            with open(txt_path) as fp:
                texto = fp.read()
            palavras = len(texto.split())
            print(f"  Texto extraido: {palavras} palavras")

if __name__ == "__main__":
    main()
