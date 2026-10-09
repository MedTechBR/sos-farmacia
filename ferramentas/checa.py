#!/usr/bin/env python3
"""Valida um ou mais arquivos de conteúdo do SOS Farmácia Comercial.

Uso: python3 ferramentas/checa.py conteudo/m01a.json [outros.json]
Sai com OK quando não há erro. Avisos não impedem.
"""
import json, re, sys
from html.parser import HTMLParser

TAGS_OK = {"p", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "br", "sup", "sub",
           "div", "table", "thead", "tbody", "tr", "th", "td", "span"}
CLASSES_DIV = {"tab", "cx chave", "cx alerta", "cx balcao", "cx lei", "cx exemplo"}
PROIBIDAS = ["neste módulo", "neste tópico", "nesta seção", "vamos ver", "em resumo", "é importante ressaltar",
             "vale lembrar", "vale destacar", "fique atento", "neste texto"]
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿⭐✅]")
TIPOS = {"tabela", "quadro", "checklist", "fluxo", "cartoes", "questoes", "receita", "pop"}


class Html(HTMLParser):
    def __init__(self):
        super().__init__()
        self.erros, self.pilha = [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag not in TAGS_OK:
            self.erros.append(f"tag não permitida <{tag}>")
        if "style" in a:
            self.erros.append(f"style=\"\" em <{tag}>")
        if tag == "div" and a.get("class") not in CLASSES_DIV:
            self.erros.append(f"div com classe desconhecida: {a.get('class')!r}")
        if tag != "br":
            self.pilha.append(tag)

    def handle_endtag(self, tag):
        if tag == "br":
            return
        if not self.pilha or self.pilha[-1] != tag:
            self.erros.append(f"fechamento fora de ordem </{tag}> (aberto: {self.pilha[-3:]})")
            if tag in self.pilha:
                while self.pilha and self.pilha.pop() != tag:
                    pass
        else:
            self.pilha.pop()


def checa_html(s, onde, erros):
    p = Html()
    p.feed(s)
    p.close()
    for e in p.erros:
        erros.append(f"{onde}: {e}")
    if p.pilha:
        erros.append(f"{onde}: tags não fechadas {p.pilha}")


def textos(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, list):
        for x in o:
            yield from textos(x)
    elif isinstance(o, dict):
        for x in o.values():
            yield from textos(x)


def checa(caminho):
    erros, avisos = [], []
    try:
        d = json.load(open(caminho, encoding="utf-8"))
    except Exception as e:
        return [f"JSON inválido: {e}"], []
    for k in ("id", "num", "titulo", "escopo", "topicos", "mapas", "apoio", "fontes"):
        if k not in d:
            erros.append(f"falta campo {k}")
    if erros:
        return erros, avisos
    pre = d["id"] + "-"
    ids = set()

    def novo_id(i, onde):
        if not i or not str(i).startswith(pre):
            erros.append(f"{onde}: id {i!r} sem prefixo {pre}")
        if i in ids:
            erros.append(f"{onde}: id repetido {i}")
        ids.add(i)

    palavras = 0
    for t in d["topicos"]:
        novo_id(t.get("id"), "tópico")
        if not t.get("titulo") or not t.get("resumo"):
            erros.append(f"tópico {t.get('id')}: falta titulo/resumo")
            continue
        checa_html(t["resumo"], t["id"], erros)
        palavras += len(re.sub("<[^>]+>", " ", t["resumo"]).split())
    for m in d["mapas"]:
        novo_id(m.get("id"), "mapa")
        r = m.get("ramos", [])
        if not 3 <= len(r) <= 7:
            avisos.append(f"{m.get('id')}: {len(r)} ramos (ideal 4 a 6)")
        if len(m.get("centro", "")) > 32:
            avisos.append(f"{m.get('id')}: centro longo")
        for ramo in r:
            if len(ramo.get("t", "")) > 30:
                avisos.append(f"{m.get('id')}: ramo longo {ramo.get('t')!r}")
            for it in ramo.get("itens", []):
                txt = it if isinstance(it, str) else it.get("t", "")
                if len(txt) > 70:
                    avisos.append(f"{m.get('id')}: item longo ({len(txt)}) {txt[:40]!r}")
    nq = nc = 0
    for b in d["apoio"]:
        novo_id(b.get("id"), "apoio")
        tp = b.get("tipo")
        if tp not in TIPOS:
            erros.append(f"{b.get('id')}: tipo desconhecido {tp}")
            continue
        if tp == "tabela":
            nc_ = len(b.get("colunas", []))
            for ln in b.get("linhas", []):
                if len(ln) != nc_:
                    erros.append(f"{b['id']}: linha com {len(ln)} células, esperado {nc_}")
        if tp == "quadro":
            checa_html(b.get("html", ""), b["id"], erros)
        if tp == "fluxo":
            for p in b.get("passos", []):
                if p.get("tipo") not in {"inicio", "acao", "decisao", "alerta", "fim"}:
                    erros.append(f"{b['id']}: passo com tipo {p.get('tipo')}")
        if tp == "questoes":
            pos, longa = [], 0
            for q in b.get("itens", []):
                nq += 1
                alt = q.get("alt", [])
                c = q.get("c")
                if len(alt) not in (4, 5) or not isinstance(c, int) or not 0 <= c < len(alt):
                    erros.append(f"{b['id']}: questão mal formada: {q.get('p', '')[:50]!r}")
                    continue
                pos.append(c)
                if len(alt[c]) == max(len(a) for a in alt) and len(alt[c]) > 1.25 * sorted(map(len, alt))[-2]:
                    longa += 1
                if not q.get("com"):
                    erros.append(f"{b['id']}: questão sem comentário")
            if pos and len(set(pos)) < min(3, len(pos)):
                avisos.append(f"{b['id']}: correta concentrada nas posições {sorted(set(pos))}")
            if longa > max(1, len(pos) // 4):
                avisos.append(f"{b['id']}: em {longa} questões a correta é bem mais longa que as outras")
        if tp == "cartoes":
            nc += len(b.get("itens", []))
    tudo = "\n".join(textos(d))
    n_trav = tudo.count("—") + tudo.count("–")
    if n_trav:
        erros.append(f"{n_trav} travessão(ões) (— ou –) no texto")
    baixo = tudo.lower()
    for f in PROIBIDAS:
        if f in baixo:
            erros.append(f"expressão proibida: {f!r}")
    if EMOJI.search(tudo):
        erros.append("emoji no texto")
    if re.search(r"\d\.\d+ ?(mg|g|mL|mcg|UI)\b", tudo):
        avisos.append("possível decimal com ponto (use vírgula): " + re.search(r"\d\.\d+ ?(mg|g|mL|mcg|UI)\b", tudo).group(0))
    print(f"  {caminho}: {len(d['topicos'])} tópicos, {palavras} palavras no resumo, {len(d['mapas'])} mapas, "
          f"{len(d['apoio'])} blocos de apoio, {nq} questões, {nc} cartões, {len(d['fontes'])} fontes")
    return erros, avisos


if __name__ == "__main__":
    falhou = False
    for c in sys.argv[1:]:
        e, a = checa(c)
        for x in a:
            print("  aviso:", x)
        for x in e:
            print("  ERRO:", x)
        falhou |= bool(e)
    print("FALHOU" if falhou else "OK")
    sys.exit(1 if falhou else 0)
