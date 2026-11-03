"""Exercise the real local auth database, ownership rules and blocking in isolation."""
import json, secrets, subprocess, time, urllib.request, urllib.error, tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
exe = root / 'backend/bin/pocketbase.exe'
(root/'.tmp').mkdir(exist_ok=True)
base = 'http://127.0.0.1:8091'

def api(path, body=None, token=None, method=None):
    headers = {'Content-Type':'application/json'}
    if token: headers['Authorization'] = token
    req = urllib.request.Request(base+path, data=json.dumps(body).encode() if body is not None else None, headers=headers, method=method)
    for attempt in range(12):
        try:
            with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(req, timeout=10) as r: return r.status, json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429: return e.code, json.load(e)
        except OSError:
            pass
        time.sleep(1.1)
    raise AssertionError('Backend did not respond within the bounded retry window')

with tempfile.TemporaryDirectory(prefix='auth-test-', dir=root/'.tmp') as folder:
    assert Path(folder).resolve().is_relative_to((root/'.tmp').resolve())
    args = [str(exe), '--dir',folder,'--migrationsDir',str(root/'backend/pb_migrations')]
    admin_pass = secrets.token_urlsafe(24)
    subprocess.run(args+['superuser','upsert','admin@example.test',admin_pass],check=True,stdout=subprocess.DEVNULL)
    log = (root/'.tmp/auth-test.log').open('w'); process = subprocess.Popen(args+['serve','--http=127.0.0.1:8091'],stdout=log,stderr=log)
    try:
        for _ in range(50):
            try:
                if api('/api/health')[0]==200: break
            except OSError: time.sleep(.2)
        users=[]
        for name in ['alpha','beta']:
            status,row=api('/api/collections/users/records',{'email':name+'@example.test','password':'Password-test-123','passwordConfirm':'Password-test-123','name':name})
            assert status==200,(status,row)
            status,auth=api('/api/collections/users/auth-with-password',{'identity':name+'@example.test','password':'Password-test-123'})
            assert status==200
            users.append(auth)
        a,b=users
        boundary = 'ember-test-boundary'
        multipart = ('--'+boundary+'\r\nContent-Disposition: form-data; name="owner"\r\n\r\n'+a['record']['id']+'\r\n--'+boundary+'\r\nContent-Disposition: form-data; name="backup"; filename="backup.json"\r\nContent-Type: application/json\r\n\r\n{"test":"private"}\r\n--'+boundary+'--\r\n').encode()
        request=urllib.request.Request(base+'/api/collections/snapshots/records', data=multipart, headers={'Authorization':a['token'],'Content-Type':'multipart/form-data; boundary='+boundary})
        with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(request) as response: snapshot=json.load(response)
        assert api('/api/collections/snapshots/records/'+snapshot['id'],token=b['token'])[0]==404
        assert api('/api/collections/snapshots/records',token=b['token'])[1]['items']==[]
        assert api('/api/files/'+snapshot['collectionId']+'/'+snapshot['id']+'/'+snapshot['backup'])[0] in (403,404)
        status,_=api('/api/collections/users/auth-with-password',{'identity':'alpha@example.test','password':'wrong'}); assert status in (400,401)
        assert api('/api/collections/users/records/'+a['record']['id'],token=b['token'])[0]==404
        assert api('/api/collections/users/records/'+a['record']['id'],{'blocked':True},a['token'],'PATCH')[0] in (400,404)
        assert api('/api/collections/snapshots/records',token=None)[0]==200
        assert api('/api/collections/snapshots/records',token=None)[1]['items']==[]
        status,admin=api('/api/collections/_superusers/auth-with-password',{'identity':'admin@example.test','password':admin_pass})
        assert status==200
        status,record=api('/api/collections/users/records/'+a['record']['id'],{'blocked':True},admin['token'],'PATCH'); assert status==200
        _,schema=api('/api/collections/users',token=admin['token'])
        status,result=api('/api/collections/users/auth-with-password',{'identity':'alpha@example.test','password':'Password-test-123'}); assert status in (400,401,403)
        assert api('/api/collections/users/auth-refresh',{},a['token'])[0] in (400,401,403)
        print('PASS: registration, password login, wrong password, user isolation, protected fields, private snapshot ownership/file download and administrator blocking.')
    finally:
        process.terminate(); process.wait(timeout=10); log.close()
