# Pick the newest iOS runtime and the best iPhone 17/16-class device on it. Prints KEY=VALUE lines for $GITHUB_ENV.
import json, re, subprocess
d = json.loads(subprocess.check_output(['xcrun', 'simctl', 'list', 'devices', 'available', '-j']))
def ver(rt):
    m = re.search(r'iOS-(\d+)-(\d+)(?:-(\d+))?$', rt)
    return tuple(int(x or 0) for x in m.groups()) if m else None
rts = sorted([(ver(k), k) for k in d['devices'] if ver(k) and d['devices'][k]], reverse=True)
pref = ['iPhone 17 Pro', 'iPhone 17', 'iPhone 17 Pro Max', 'iPhone Air', 'iPhone 16 Pro', 'iPhone 16', 'iPhone 16 Pro Max', 'iPhone 16 Plus', 'iPhone 16e']
for v, rt in rts:
    devs = {x['name']: x['udid'] for x in d['devices'][rt]}
    for p in pref:
        if p in devs:
            print(f"SIM_UDID={devs[p]}"); print(f"SIM_NAME={p}"); print(f"SIM_IOS={v[0]}.{v[1]}" + (f".{v[2]}" if v[2] else ""))
            raise SystemExit(0)
raise SystemExit('no iPhone 16/17 class simulator found: ' + ', '.join(k for _, k in rts))
