#!/usr/bin/env python3
"""Validate the public-only release allowlist and all local web dependencies."""
import json,re,subprocess
from html.parser import HTMLParser
from pathlib import PurePosixPath
from urllib.parse import unquote,urlsplit
from project_paths import ROOT,PUBLIC

def release_files():
    manifest=json.loads((ROOT/'release-files.json').read_text())
    assert manifest['webRoot']=='public' and manifest['entrypoint']=='index.html'
    files=manifest['files']
    assert files and len(files)==len(set(files)) and 'index.html' in files
    for name in files:
        path=PurePosixPath(name)
        assert re.fullmatch(r'[A-Za-z0-9_./-]+',name),name
        assert not path.is_absolute() and '..' not in path.parts and '\\' not in name,name
        assert all(not p.startswith('.') for p in path.parts),name
        assert path.suffix.lower() in {'.html','.css','.js','.webp','.png','.svg'},name
        f=PUBLIC/name
        assert f.is_file() and not f.is_symlink() and f.resolve().is_relative_to(PUBLIC.resolve()),name
    actual={str(f.relative_to(PUBLIC)) for f in PUBLIC.rglob('*') if f.is_file()}
    assert actual==set(files),{'unlisted':sorted(actual-set(files)),'missing':sorted(set(files)-actual)}
    return files

def check():
    files=release_files();local=set(files);refs=[];scripts=[]
    class Entry(HTMLParser):
        def handle_starttag(self,tag,attrs):
            a=dict(attrs)
            if a.get('src'):refs.append(a['src'])
            if tag=='link' and a.get('href'):refs.append(a['href'])
            if tag=='script' and a.get('src'):scripts.append(urlsplit(a['src']).path)
    Entry().feed((PUBLIC/'index.html').read_text())
    for name in files:
        if name.endswith(('.js','.css')):refs+=re.findall(r'assets/[\w-]+\.(?:webp|png|svg)',(PUBLIC/name).read_text())
        if name.endswith('.js'):subprocess.run(['node','--check',str(PUBLIC/name)],check=True,capture_output=True)
    for ref in refs:
        url=urlsplit(ref)
        if not url.scheme and not url.netloc:
            assert unquote(url.path).removeprefix('./') in local,('Missing web dependency',ref)
    for prefix,n,version in [('guide',10,'v2'),('guide',10,'v5'),('product',8,'v3')]:
        for i in range(1,n+1):assert f'assets/{prefix}-{i:02d}-{version}.webp' in local
    for category in ['art','coast','fortress','hill','oldtown']:assert f'assets/scene-{category}-v3.webp' in local
    for category in ['cafe','cantonese','chinese','dimsum','hotpot','indian','japanese','seafood','western']:assert f'assets/dish-{category}-v3.webp' in local
    for filename in ['gifts-v5.js','reviews-v5.js','guides-v5.js']:assert scripts.index(filename)<scripts.index('v5.js'),filename
    assert scripts.index('app.js')<scripts.index('v2.js')<scripts.index('v3.js')<scripts.index('v4.js')<scripts.index('v5.js')
    print(f'PASS: {len(files)} public release files, {len(scripts)} ordered scripts, local dependencies and JS syntax')

if __name__=='__main__':check()
