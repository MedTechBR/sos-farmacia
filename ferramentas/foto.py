#!/usr/bin/env python3
"""Captura de tela com Chrome headless.  Uso: foto.py URL saida.png [largura altura] [--escuro]"""
import os, subprocess, sys, tempfile, time
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
a = [x for x in sys.argv[1:] if not x.startswith('--')]
url, out = a[0], os.path.abspath(a[1])
w, h = (a[2], a[3]) if len(a) >= 4 else ('1440', '900')
if os.path.exists(out): os.remove(out)
with tempfile.TemporaryDirectory() as perfil:
    args = [CHROME, '--headless=new', '--disable-gpu', '--no-first-run', f'--user-data-dir={perfil}', '--hide-scrollbars',
            f'--window-size={w},{h}', '--virtual-time-budget=4000', f'--screenshot={out}', url]
    if '--escuro' in sys.argv: args.insert(1, '--force-dark-mode')
    if '--claro' in sys.argv: args.insert(1, '--blink-settings=preferredColorScheme=1')
    p = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    t0 = time.time()
    while time.time() - t0 < 60 and p.poll() is None and not (os.path.exists(out) and os.path.getsize(out) > 0):
        time.sleep(.5)
    time.sleep(.5)
    if p.poll() is None: p.kill()
print(out if os.path.exists(out) else 'FALHOU')
