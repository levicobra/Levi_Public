#!/usr/bin/env python3
"""Serve four public roots on loopback with their actual Pages security headers.

Run: python tools/preview_sites.py
www :8810, play :8811, learn :8812, mil :8813. Ctrl-C stops all four.
No dependencies and no directory listings. Preview instrumentation is injected
only in responses; it is never written into or published with the site files.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
import fnmatch
import io
import threading

ROOT = Path(__file__).resolve().parents[1]
PROBE = b'''document.documentElement.dataset.previewErrors='[]';
const record=(kind,detail)=>{const e=document.documentElement;e.dataset.previewErrors=JSON.stringify([...JSON.parse(e.dataset.previewErrors),{kind,detail}]);};
window.addEventListener('error',e=>record('error',e.message||e.target.src||e.target.href),true);
window.addEventListener('unhandledrejection',e=>record('promise',String(e.reason)));
document.addEventListener('securitypolicyviolation',e=>record('csp',e.violatedDirective+' '+e.blockedURI));
const requests=()=>document.documentElement.dataset.previewRequests=JSON.stringify(performance.getEntriesByType('resource').map(r=>({name:r.name,status:r.responseStatus})));
new PerformanceObserver(requests).observe({entryTypes:['resource']});
window.addEventListener('load',requests);'''

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory, **kwargs):
        self.site = Path(directory).resolve()
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, format, *args):
        if args and str(args[1] if len(args) > 1 else '').startswith(('4', '5')):
            super().log_message(format, *args)

    def list_directory(self, path):
        self.send_error(404)

    def end_headers(self):
        path = urlsplit(self.path).path
        active = False
        headers = {}
        for line in (self.site / '_headers').read_text(encoding='utf-8').splitlines():
            if not line.strip() or line.lstrip().startswith('#'):
                continue
            if not line[0].isspace():
                active = fnmatch.fnmatch(path, line.strip())
            elif active and ':' in line:
                key, value = line.strip().split(':', 1)
                headers[key] = value.strip()
        for key, value in headers.items():
            self.send_header(key, value)
        super().end_headers()

    def send_head(self):
        path = unquote(urlsplit(self.path).path)
        if path == '/_preview-check.js':
            self.send_response(200)
            self.send_header('Content-Type', 'text/javascript')
            self.send_header('Content-Length', str(len(PROBE)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return io.BytesIO(PROBE)
        redirects = self.site / '_redirects'
        if redirects.exists():
            for line in redirects.read_text(encoding='utf-8').splitlines():
                if not line.strip() or line.startswith('#'):
                    continue
                source, target, status = line.split()[:3]
                if fnmatch.fnmatch(path, source):
                    tail = path[len(source.split('*')[0]):] if '*' in source else ''
                    self.send_response(int(status))
                    self.send_header('Location', target.replace(':splat', tail))
                    self.end_headers()
                    return None
        file = Path(self.translate_path(path)).resolve()
        if not file.is_relative_to(self.site):
            self.send_error(403)
            return None
        if file.is_dir() and path.endswith('/'):
            file = file / 'index.html'
        if file.is_file() and file.suffix == '.html':
            body = file.read_bytes().replace(b'<head>', b'<head><script src="/_preview-check.js"></script>', 1)
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return io.BytesIO(body)
        return super().send_head()

if __name__ == '__main__':
    servers = []
    for offset, site in enumerate(['www', 'play', 'learn', 'mil']):
        server = ThreadingHTTPServer(('127.0.0.1', 8810 + offset), partial(Handler, directory=str(ROOT / 'sites' / site)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        servers.append(server)
        print(f'{site}: http://127.0.0.1:{8810 + offset}/', flush=True)
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        for server in servers:
            server.shutdown()
