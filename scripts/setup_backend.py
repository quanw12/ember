"""Install the pinned Windows PocketBase binary, verifying its release checksum."""
import hashlib, io, json, platform, urllib.request, zipfile
from pathlib import Path

if platform.system() != 'Windows': raise SystemExit('This helper targets Windows; use the matching PocketBase release on your OS.')
version = '0.40.6'
base = f'https://api.github.com/repos/pocketbase/pocketbase/releases/tags/v{version}'
with urllib.request.urlopen(urllib.request.Request(base,headers={'User-Agent':'ember-backend-setup'})) as r: release=json.load(r)
asset=next(x for x in release['assets'] if x['name'].endswith('windows_amd64.zip'))
checks=next(x for x in release['assets'] if 'checksums' in x['name'])
with urllib.request.urlopen(checks['browser_download_url']) as r: hashes=r.read().decode()
expected=next(line.split()[0] for line in hashes.splitlines() if line.split()[-1].lstrip('*')==asset['name'])
with urllib.request.urlopen(asset['browser_download_url']) as r: data=r.read()
if hashlib.sha256(data).hexdigest()!=expected: raise SystemExit('Checksum mismatch; nothing installed.')
folder=Path(__file__).resolve().parents[1]/'backend/bin'; folder.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(io.BytesIO(data)) as archive: (folder/'pocketbase.exe').write_bytes(archive.read('pocketbase.exe'))
print('PocketBase',version,'installed with verified checksum.')
