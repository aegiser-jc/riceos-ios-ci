# Make sure no test account is left on the live backend. Tries only phones the UI test attempted and did not find taken.
# Uses REC_PIN from env; prints status codes and error codes only.
import json, os, re, urllib.request, urllib.error
API = 'https://riceos.donaus.com'; pin = os.environ['REC_PIN']
log = open(os.path.join(os.environ['GITHUB_WORKSPACE'], 'out', 'ui.log'), errors='replace').read() if os.path.exists(os.path.join(os.environ['GITHUB_WORKSPACE'], 'out', 'ui.log')) else ''
log += open('/tmp/rec-marks.txt', errors='replace').read() if os.path.exists('/tmp/rec-marks.txt') else ''
tried = list(dict.fromkeys(re.findall(r'TRY_PHONE (\d{10})', log))); taken = set(re.findall(r'TAKEN_PHONE (\d{10})', log))
print('UI DELETED_OK seen:', 'DELETED_OK' in log, '| tried:', tried, '| taken:', sorted(taken))
def call(method, path, body, token=None):
    h = {'X-RiceOS': '1', 'Content-Type': 'application/json', 'Origin': 'capacitor://localhost'}
    if token: h['Authorization'] = 'Bearer ' + token
    r = urllib.request.Request(API + path, data=json.dumps(body).encode(), headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=20) as x: return x.status, json.loads(x.read() or b'{}')
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read() or b'{}')
        except Exception: return e.code, {}
for ph in [p for p in tried if p not in taken]:
    st, j = call('POST', '/api/auth/login', {'phone': ph, 'pin': pin, 'client': 'native', 'shared_device': True})
    if st == 200 and j.get('token'):
        st2, j2 = call('DELETE', '/api/me', {'pin': pin}, j['token'])
        print(f'{ph}: account still existed -> DELETE /api/me {st2} {j2.get("error", "ok")}')
    else:
        print(f'{ph}: login {st} {j.get("error")} -> no live account with this PIN (deleted)')
