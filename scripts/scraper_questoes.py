#!/usr/bin/env python3
"""
Scraper de Questões de Concursos — CESPE/CEBRASPE
--------------------------------------------------
Baixa provas do PCI Concursos e extrai texto dos PDFs.
O texto extraido pode ser colado na aba "📋 Colar" do admin
para converter automaticamente em questoes estruturadas.

Uso:
    python3 scripts/scraper_questoes.py --ajuda

    # Listar provas CESPE disponiveis
    python3 scripts/scraper_questoes.py --listar

    # Buscar provas de um concurso (ex: "caixa", "seduc", "fub")
    python3 scripts/scraper_questoes.py --buscar seduc

    # Baixar PDF e extrair texto de uma prova
    python3 scripts/scraper_questoes.py --prova administrador-fub-cespe-2018

    # Extrair texto de um PDF ja baixado
    python3 scripts/scraper_questoes.py --pdf caminho/arquivo.pdf

Saida:
    - PDF baixado em:  pdfs/<slug>.pdf
    - Texto extraido:  txt/<slug>.txt  (cole no admin)

Fluxo completo:
    1. python3 scripts/scraper_questoes.py --buscar seduc
    2. python3 scripts/scraper_questoes.py --prova professor-pedagogia-seduc-al-cespe-2026
    3. cat txt/professor-pedagogia-seduc-al-cespe-2026.txt  (copie o texto)
    4. Cole no admin > aba "📋 Colar" > "Converter com IA"

Requisitos:
    pip3 install requests beautifulsoup4 lxml
    apt install poppler-utils  (pdftotext)
"""

import requests
import sys
import re
import os
import subprocess
import tempfile
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}
SESSAO = requests.Session()
SESSAO.headers.update(HEADERS)

DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = os.path.join(DIR, "pdfs")
TXT_DIR = os.path.join(DIR, "txt")
os.makedirs(PDF_DIR, exist_ok=True)
os.makedirs(TXT_DIR, exist_ok=True)

# ─── PCI Concursos ──────────────────────────────────────────────────────────

def pci_listar_provas(banca="cespe", pagina=1):
    url = f"https://www.pciconcursos.com.br/provas/{banca}/" + (f"?pagina={pagina}" if pagina > 1 else "")
    r = SESSAO.get(url, timeout=15)
    if r.status_code != 200:
        return []
    s = BeautifulSoup(r.text, "lxml")
    provas = []
    for a in s.select("a[href*='/provas/download/']"):
        href = a.get("href", "")
        nome = a.text.strip()
        if href and nome:
            slug = href.replace("https://www.pciconcursos.com.br/provas/download/", "")
            provas.append({"slug": slug, "nome": nome})
    return provas

def pci_buscar_provas(query):
    resultados = []
    slugs_vistos = set()
    for pagina in range(1, 6):
        provas = pci_listar_provas("cespe", pagina)
        if not provas:
            break
        for p in provas:
            if query.lower() in p["nome"].lower() or query.lower() in p["slug"].lower():
                if p["slug"] not in slugs_vistos:
                    slugs_vistos.add(p["slug"])
                    resultados.append(p)
    return resultados

def pci_url_prova(slug):
    return f"https://www.pciconcursos.com.br/provas/{slug}"

def pci_baixar_pdf(slug):
    """Baixa o PDF de uma prova do PCI Concursos."""
    url_pagina = pci_url_prova(slug)
    r = SESSAO.get(url_pagina, timeout=15)
    if r.status_code != 200:
        print(f"  Erro {r.status_code} ao acessar pagina", file=sys.stderr)
        return None

    s = BeautifulSoup(r.text, "lxml")
    pdf_url = None

    # Busca link do PDF na pagina
    for a in s.find_all("a", href=True):
        h = a["href"]
        if h.endswith(".pdf") or "/download/" in h:
            pdf_url = h
            break

    if not pdf_url:
        pdf_url = f"https://www.pciconcursos.com.br/provas/download/{slug}"

    if not pdf_url.startswith("http"):
        pdf_url = "https://www.pciconcursos.com.br" + pdf_url

    print(f"  Baixando PDF: {pdf_url}")
    r = SESSAO.get(pdf_url, timeout=30, stream=True)
    if r.status_code != 200:
        print(f"  Erro {r.status_code} ao baixar PDF", file=sys.stderr)
        return None

    pdf_path = os.path.join(PDF_DIR, f"{slug}.pdf")
    with open(pdf_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)

    # Verifica se e realmente PDF
    with open(pdf_path, "rb") as f:
        header = f.read(5)
    if header != b"%PDF-":
        print(f"  Arquivo baixado nao e PDF (header: {header})", file=sys.stderr)
        os.remove(pdf_path)
        return None

    print(f"  PDF salvo: {pdf_path} ({os.path.getsize(pdf_path)} bytes)")
    return pdf_path

def extrair_texto_pdf(pdf_path):
    """Extrai texto de PDF usando pdftotext."""
    txt_path = os.path.join(TXT_DIR, os.path.basename(pdf_path).replace(".pdf", ".txt"))
    try:
        subprocess.run(
            ["pdftotext", "-layout", pdf_path, txt_path],
            check=True, capture_output=True, timeout=60
        )
        print(f"  Texto extraido: {txt_path}")
        return txt_path
    except subprocess.CalledProcessError as e:
        print(f"  Erro pdftotext: {e.stderr.decode()}", file=sys.stderr)
        return None
    except FileNotFoundError:
        print("  pdftotext nao encontrado. Instale: apt install poppler-utils", file=sys.stderr)
        return None

def imprimir_provas(provas):
    print(f"\n{'SLUG':<55} {'NOME'}")
    print("-" * 120)
    for p in provas:
        print(f"{p['slug'][:54]:<55} {p['nome'][:60]}")

# ─── Funcoes de busca alternativa ──────────────────────────────────────────
# PCI e a unica fonte publica e acessivel sem login.
# QConcursos e TecConcursos exigem login/Cloudflare.
# Use o fluxo: PCI > PDF > pdftotext > Colar no admin > IA converte.

# ─── Main ──────────────────────────────────────────────────────────────────

def main():
    if "--ajuda" in sys.argv or "-h" in sys.argv or len(sys.argv) == 1:
        print(__doc__)
        return

    if "--listar" in sys.argv:
        print("Buscando provas CESPE no PCI Concursos...")
        provas = pci_listar_provas()
        if provas:
            print(f"\nEncontradas {len(provas)} provas:")
            imprimir_provas(provas[:80])
            if len(provas) > 80:
                print(f"\n... e mais {len(provas) - 80}")
        else:
            print("Nenhuma prova encontrada.")

    elif "--buscar" in sys.argv:
        idx = sys.argv.index("--buscar") + 1
        if idx >= len(sys.argv):
            print("Erro: informe o termo de busca")
            return
        query = sys.argv[idx]
        print(f"Buscando provas para: {query}")
        provas = pci_buscar_provas(query)
        if provas:
            print(f"\nEncontradas {len(provas)} provas:")
            imprimir_provas(provas)
            print(f"\nUse --prova <slug> para baixar uma prova.")
        else:
            print("Nenhuma prova encontrada.")

    elif "--prova" in sys.argv:
        idx = sys.argv.index("--prova") + 1
        if idx >= len(sys.argv):
            print("Erro: informe o slug da prova")
            return
        slug = sys.argv[idx]
        print(f"Processando: {slug}")

        # Tenta baixar PDF da pagina da prova
        pdf_path = pci_baixar_pdf(slug)
        if pdf_path:
            txt_path = extrair_texto_pdf(pdf_path)
            if txt_path:
                with open(txt_path, "r") as f:
                    texto = f.read()
                print(f"\n--- CONTEUDO EXTRAIDO ({len(texto)} caracteres) ---")
                print(f"Copie o texto acima e cole no admin > aba '📋 Colar'")
                print(f"Ou abra o arquivo: {txt_path}")
        else:
            print(f"Nao foi possivel baixar o PDF.")
            print(f"Tente acessar manualmente: {pci_url_prova(slug)}")

    elif "--pdf" in sys.argv:
        idx = sys.argv.index("--pdf") + 1
        if idx >= len(sys.argv):
            print("Erro: informe o caminho do PDF")
            return
        pdf_path = sys.argv[idx]
        if not os.path.exists(pdf_path):
            print(f"Arquivo nao encontrado: {pdf_path}")
            return
        txt_path = extrair_texto_pdf(pdf_path)
        if txt_path:
            with open(txt_path, "r") as f:
                texto = f.read()
            print(f"\n--- CONTEUDO EXTRAIDO ({len(texto)} caracteres) ---")
            print(texto[:2000])
            if len(texto) > 2000:
                print(f"\n... (truncado, arquivo completo: {txt_path})")
            print(f"\nCopie o texto e cole no admin > aba '📋 Colar'")

    else:
        print("Opcao desconhecida. Use --ajuda para ajuda.")

if __name__ == "__main__":
    main()
