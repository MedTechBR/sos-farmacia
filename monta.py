#!/usr/bin/env python3
"""Monta o arquivo único SOS-Farmacia-Comercial.html a partir de fonte/ e conteudo/.

Uso:  python3 monta.py            (recusa se o HTML atual tiver edições feitas no app ainda não importadas)
      python3 monta.py --forca    (monta mesmo assim, descartando essas edições)
Edições feitas dentro do app: rode antes  python3 ferramentas/importa.py
"""
import base64, glob, io, json, os, re, sys, datetime
from fontTools import subset
from fontTools.ttLib import TTFont

RAIZ = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.environ.get('SOS_SAIDA') or os.path.join(RAIZ, 'SOS-Farmacia-Comercial.html')
CONTEUDO = os.environ.get('SOS_CONTEUDO') or os.path.join(RAIZ, 'conteudo')
MARCA_MONTAGEM = os.path.join(RAIZ, 'docs', '.ultima_montagem')
TABLER_CSS = os.path.expanduser('~/Documents/Claude/_trabalho/site/vendor/tabler/tabler-icons.min.css')
TABLER_WOFF = os.path.expanduser('~/Documents/Claude/_trabalho/site/vendor/tabler/fonts/tabler-icons.woff2')

MODULOS = {  # cor (paleta do FarmaUTI), ícone Tabler e nome curto da barra lateral
    'm01': ('#2F7BF6', 'pill', 'Isentos de prescrição (MIP)'), 'm02': ('#F76E1E', 'lock', 'Portaria 344/98'),
    'm03': ('#8E5AF2', 'flask', 'Farmacologia geral'), 'm04': ('#E5484D', 'heartbeat', 'Cardiovascular e renal'),
    'm05': ('#11A870', 'droplet', 'Sistema endócrino'), 'm06': ('#E8468E', 'bandage', 'AINEs, corticoides e antialérgicos'),
    'm07': ('#0E9384', 'lungs', 'Sistema respiratório'), 'm08': ('#E89A00', 'prescription', 'RDC 471/2021'),
    'm09': ('#5B5BF0', 'arrows-exchange', 'Interações medicamentosas'), 'm10': ('#4D9A12', 'clipboard-list', 'POPs'),
    'm11': ('#0AA5C2', 'temperature-snow', 'Termolábeis e armazenamento'),
}
GERAL_PADRAO = {
    'titulo': 'SOS Farmácia Comercial',
    'subtitulo': 'Material de estudo e consulta para alunos do 9º e 10º semestres de Farmácia e farmacêuticos recém-formados. '
                 'Onze módulos, cada um com resumo para leitura, mapas mentais e material de apoio.',
    'config': {'marca': 'SOS Farmácia Comercial', 'marca2': ''},
}


def tinta_clara(hexcor, mistura=0.9):
    r, g, b = (int(hexcor[i:i + 2], 16) for i in (1, 3, 5))
    return '#%02X%02X%02X' % tuple(round(c + (255 - c) * mistura) for c in (r, g, b))


def le_conteudo():
    partes = {}
    for arq in sorted(glob.glob(os.path.join(CONTEUDO, 'm*.json'))):
        d = json.load(open(arq, encoding='utf-8'))
        partes.setdefault(d['id'], []).append((d.get('parte', ''), arq, d))
    modulos = []
    for mid, lst in partes.items():
        lst.sort(key=lambda x: x[0])
        base = lst[0][2]
        m = {k: base[k] for k in ('id', 'num', 'titulo', 'escopo')}
        cor, icone, curto = MODULOS.get(mid, ('#5B5BF0', 'book', base['titulo']))
        m.update(cor=cor, icone=icone, curto=curto, topicos=[], mapas=[], apoio=[], fontes=[])
        for _, arq, d in lst:
            for k in ('topicos', 'mapas', 'apoio'):
                m[k] += d.get(k, [])
            for f in d.get('fontes', []):
                if f not in m['fontes']:
                    m['fontes'].append(f)
        modulos.append(m)
    modulos.sort(key=lambda m: m['num'])
    return modulos


def fontes_css(texto_app):
    css = []
    mapa = dict(re.findall(r'\.ti-([a-z0-9-]+):before\{content:"\\([0-9a-f]+)"', open(TABLER_CSS).read()))
    usados = set(re.findall(r'ti-([a-z0-9-]+)', texto_app)) | {v[1] for v in MODULOS.values()}
    usados |= set(re.findall(r"'([a-z0-9-]+)'", texto_app))  # nomes passados a ic('...') e em TIPOS
    usados |= {'bulb', 'alert-triangle', 'building-store', 'gavel', 'message-circle'}  # caixas do texto (CSS)
    usados = {u for u in usados if u in mapa}
    faltando = set(re.findall(r'ic\(\'([a-z0-9-]+)\'\)', texto_app)) - set(mapa)
    if faltando:
        print('  aviso: ícones inexistentes no Tabler:', faltando)
    fonte = TTFont(TABLER_WOFF)
    opc = subset.Options(); opc.flavor = 'woff2'; opc.layout_features = []; opc.notdef_outline = True
    sub = subset.Subsetter(opc)
    sub.populate(unicodes=[int(mapa[u], 16) for u in usados])
    sub.subset(fonte)
    buf = io.BytesIO(); fonte.flavor = 'woff2'; fonte.save(buf)
    b = base64.b64encode(buf.getvalue()).decode()
    css.append(f'@font-face{{font-family:"tabler-icons";font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,{b}) format("woff2")}}')
    css.append('.ti{font-family:"tabler-icons"!important;speak:none;font-style:normal;font-weight:normal;font-variant:normal;text-transform:none;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}')
    css += [f'.ti-{u}:before{{content:"\\{mapa[u]}"}}' for u in sorted(usados)]
    return '\n'.join(css), len(usados), {u: mapa[u] for u in sorted(usados)}


def versao_no_html(caminho):
    if not os.path.exists(caminho):
        return None
    m = re.search(r'<script id="sos-dados" type="application/json">(.*?)</script>', open(caminho, encoding='utf-8').read(), re.S)
    try:
        return json.loads(m.group(1))['versao'] if m else None
    except Exception:
        return None


def main():
    forca = '--forca' in sys.argv
    atual = versao_no_html(SAIDA)
    ultima = open(MARCA_MONTAGEM).read().strip() if os.path.exists(MARCA_MONTAGEM) else None
    if atual and ultima and atual != ultima and not forca and not os.environ.get('SOS_SAIDA'):
        sys.exit('O HTML tem edições feitas no app (versão %s) que não vieram de uma montagem.\n'
                 'Rode  python3 ferramentas/importa.py  para trazê-las para conteudo/, ou use --forca para descartar.' % atual)
    geral = dict(GERAL_PADRAO)
    g = os.path.join(CONTEUDO, '_geral.json')
    if os.path.exists(g):
        geral.update(json.load(open(g, encoding='utf-8')))
    modulos = le_conteudo()
    versao = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
    dados = {'versao': versao, 'titulo': geral['titulo'], 'subtitulo': geral['subtitulo'], 'config': geral['config'], 'modulos': modulos}
    js = open(os.path.join(RAIZ, 'fonte', 'app.js'), encoding='utf-8').read()
    css = open(os.path.join(RAIZ, 'fonte', 'app.css'), encoding='utf-8').read()
    casca = open(os.path.join(RAIZ, 'fonte', 'casca.html'), encoding='utf-8').read()
    fcss, nic, glifos = fontes_css(js + casca)
    js = js.replace('/*GLIFOS*/{}', json.dumps(glifos))
    json_txt = json.dumps(dados, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    if '</script' in js.lower():
        sys.exit('app.js contém "</script" literal: quebraria o HTML.')
    html = (casca.replace('/*FONTES*/', fcss).replace('/*CSS*/', css)
            .replace('/*DADOS*/', json_txt).replace('/*JS*/', js))
    open(SAIDA, 'w', encoding='utf-8').write(html)
    if not os.environ.get('SOS_SAIDA'):
        open(MARCA_MONTAGEM, 'w').write(versao)
    nt = sum(len(m['topicos']) for m in modulos)
    print(f'OK  {os.path.basename(SAIDA)}  {len(html) / 1e6:.2f} MB  {len(modulos)} módulos, {nt} tópicos, {nic} ícones  versão {versao}')


if __name__ == '__main__':
    main()
