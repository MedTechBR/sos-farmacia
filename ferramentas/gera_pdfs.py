#!/usr/bin/env python3
"""Gera os PDFs (com marca-d'água) direto do HTML, sem abrir janela: um por módulo e um completo.

Uso: python3 ferramentas/gera_pdfs.py                    (todos os módulos + completo)
     python3 ferramentas/gera_pdfs.py m01 m02             (só esses)
     python3 ferramentas/gera_pdfs.py --marca2 "Licenciado para Fulano"
Saída em pdf/.  Usa o Google Chrome instalado.
"""
import json, os, re, subprocess, sys, tempfile, time, urllib.parse

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.environ.get('SOS_HTML') or os.path.join(RAIZ, 'SOS-Farmacia-Comercial.html')
SAIDA = os.environ.get('SOS_PDF') or os.path.join(RAIZ, 'pdf')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def slug(t):
    t = re.sub(r'[^\w\s-]', '', t, flags=re.U).strip()
    return re.sub(r'\s+', '-', t)[:60]


def gera(param, destino, extra):
    """O Chrome grava o PDF mas às vezes não encerra sozinho: espera o arquivo estabilizar e encerra."""
    q = {'pdf': param, **extra}
    url = 'file://' + urllib.parse.quote(HTML) + '?' + urllib.parse.urlencode(q)
    if os.path.exists(destino):
        os.remove(destino)
    with tempfile.TemporaryDirectory() as perfil:
        proc = subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
                                 f'--user-data-dir={perfil}', '--no-pdf-header-footer', '--virtual-time-budget=20000',
                                 f'--print-to-pdf={destino}', url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        inicio, tam, estavel = time.time(), -1, 0
        while time.time() - inicio < 600:
            if proc.poll() is not None:
                break
            t = os.path.getsize(destino) if os.path.exists(destino) else -1
            estavel = estavel + 1 if (t > 0 and t == tam) else 0
            tam = t
            if estavel >= 3:
                break
            time.sleep(1)
        if proc.poll() is None:
            proc.kill(); proc.wait()
    if not os.path.exists(destino):
        sys.exit(f'Falhou: {destino}')
    print(f'  {os.path.basename(destino)}  {os.path.getsize(destino) / 1e6:.2f} MB')


def main():
    args = sys.argv[1:]
    extra = {}
    if '--marca2' in args:
        i = args.index('--marca2'); extra['marca2'] = args[i + 1]; del args[i:i + 2]
    if '--marca' in args:
        i = args.index('--marca'); extra['marca'] = args[i + 1]; del args[i:i + 2]
    html = open(HTML, encoding='utf-8').read()
    m = re.search(r'<script id="sos-dados" type="application/json">(.*?)</script>', html, re.S)
    dados = json.loads(m.group(1))
    os.makedirs(SAIDA, exist_ok=True)
    mods = [x for x in dados['modulos'] if not args or x['id'] in args]
    for x in mods:
        gera(x['id'], os.path.join(SAIDA, f"SOS-Farmacia-Comercial-Modulo-{x['num']:02d}-{slug(x['titulo'])}.pdf"), extra)
    if not args:
        gera('todos', os.path.join(SAIDA, 'SOS-Farmacia-Comercial-Completo.pdf'), extra)


if __name__ == '__main__':
    main()
