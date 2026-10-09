#!/usr/bin/env python3
"""Traz para conteudo/ as edições feitas dentro do app (arquivo salvo pelo botão "Salvar arquivo").

Uso: python3 ferramentas/importa.py [caminho/do/SOS-Farmacia-Comercial.html]
Guarda uma cópia do conteudo/ anterior em conteudo/_anteriores/<data>/ antes de sobrescrever.
Depois rode  python3 monta.py  normalmente.
"""
import datetime, glob, json, os, re, shutil, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTEUDO = os.path.join(RAIZ, 'conteudo')
html_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, 'SOS-Farmacia-Comercial.html')
html = open(html_path, encoding='utf-8').read()
m = re.search(r'<script id="sos-dados" type="application/json">(.*?)</script>', html, re.S)
if not m:
    sys.exit('Não achei os dados dentro do HTML.')
dados = json.loads(m.group(1))

copia = os.path.join(CONTEUDO, '_anteriores', datetime.datetime.now().strftime('%Y-%m-%d_%H%M%S'))
os.makedirs(copia)
for f in glob.glob(os.path.join(CONTEUDO, '*.json')):
    shutil.move(f, copia)

for mod in dados['modulos']:
    saida = {k: mod[k] for k in ('id', 'num', 'titulo', 'escopo', 'topicos', 'mapas', 'apoio', 'fontes')}
    with open(os.path.join(CONTEUDO, mod['id'] + '.json'), 'w', encoding='utf-8') as f:
        json.dump(saida, f, ensure_ascii=False, indent=1)
with open(os.path.join(CONTEUDO, '_geral.json'), 'w', encoding='utf-8') as f:
    json.dump({k: dados[k] for k in ('titulo', 'subtitulo', 'config')}, f, ensure_ascii=False, indent=1)
open(os.path.join(RAIZ, 'docs', '.ultima_montagem'), 'w').write(dados['versao'])
print(f'OK  {len(dados["modulos"])} módulos importados de {os.path.basename(html_path)} (versão {dados["versao"]}).')
print(f'    Conteúdo anterior guardado em {os.path.relpath(copia, RAIZ)}. Agora rode: python3 monta.py')
