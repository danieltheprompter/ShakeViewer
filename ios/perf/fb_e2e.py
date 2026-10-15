#!/usr/bin/env python3
"""Throwaway-account Firebase checks via public REST APIs. Never prints secrets.
usage: fb_e2e.py signin|bookmarks|probe|gone EMAIL PASSWORD [tokenfile]"""
import json, plistlib, sys, urllib.request, urllib.error, os
P = os.path.join(os.path.dirname(__file__), '..', 'ShakeViewer/Resources/GoogleService-Info.plist')
cfg = plistlib.load(open(P, 'rb')); KEY = cfg['API_KEY']; PROJ = cfg['PROJECT_ID']
FS = f'https://firestore.googleapis.com/v1/projects/{PROJ}/databases/(default)/documents'
# iOS keys may be restricted to the bundle id; send it like the SDK does.
HDR = {'Content-Type': 'application/json', 'X-Ios-Bundle-Identifier': cfg['BUNDLE_ID']}
def req(url, data=None, token=None, method=None):
    h = dict(HDR)
    if token: h['Authorization'] = 'Bearer ' + token
    r = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=20) as resp: return resp.status, json.loads(resp.read() or b'{}')
    except urllib.error.HTTPError as e:
        try: body = json.loads(e.read())
        except Exception: body = {}
        return e.code, body
def signin(email, pw):
    return req(f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={KEY}', {'email': email, 'password': pw, 'returnSecureToken': True})
cmd, email, pw = sys.argv[1:4]; tf = sys.argv[4] if len(sys.argv) > 4 else '/tmp/sv_e2e_tok.json'
if cmd == 'signin':
    st, b = signin(email, pw)
    if st == 200:
        json.dump({'t': b['idToken'], 'uid': b['localId']}, open(tf, 'w')); os.chmod(tf, 0o600)
        print('signin OK uid', b['localId'])
    else: print('signin FAIL', st, b.get('error', {}).get('message'))
elif cmd == 'bookmarks':
    s = json.load(open(tf)); st, b = req(f"{FS}/users/{s['uid']}/bookmarks", token=s['t'])
    docs = b.get('documents', []); hs = req(f"{FS}/users/{s['uid']}/searchHistory", token=s['t']); print('searchHistory', hs[0], 'count', len(hs[1].get('documents', [])))
    print('bookmarks list', st, (b.get('error') or {}).get('message', '')[:160], 'count', len(docs), [d['fields'].get('quakeId', {}).get('stringValue') for d in docs])
    st, b = req(f"{FS}/users/{s['uid']}", token=s['t']); print('user doc', st, (b.get('error') or {}).get('message', '')[:160], sorted(b.get('fields', {}).keys()))
elif cmd == 'purge':  # throwaway account only: delete its docs, then the account
    s = json.load(open(tf)); me = s['uid']
    for col in ('bookmarks', 'searchHistory'):
        for d in req(f'{FS}/users/{me}/{col}', token=s['t'])[1].get('documents', []):
            req('https://firestore.googleapis.com/v1/' + d['name'], token=s['t'], method='DELETE')
    print('purge user doc', req(f'{FS}/users/{me}', token=s['t'], method='DELETE')[0])
    print('deluser', req(f'https://identitytoolkit.googleapis.com/v1/accounts:delete?key={KEY}', {'idToken': s['t']})[0])
elif cmd == 'deluser':  # delete ONLY the throwaway account we signed in as
    s = json.load(open(tf)); print('deluser', req(f'https://identitytoolkit.googleapis.com/v1/accounts:delete?key={KEY}', {'idToken': s['t']})[0])
elif cmd == 'probe':
    s = json.load(open(tf)); fake = 'zz-nonexistent-probe-uid-000'
    me = s['uid']
    print('OWN get users/<me>:', req(f'{FS}/users/{me}', token=s['t'])[0])
    st = req(f'{FS}/users/{me}/bookmarks/rulesprobe', {'fields': {'quakeId': {'stringValue': 'probe'}, 'note': {'stringValue': ''}}}, token=s['t'], method='PATCH')[0]
    print('OWN write bookmark:', st, '| own delete:', req(f'{FS}/users/{me}/bookmarks/rulesprobe', token=s['t'], method='DELETE')[0])
    print('OWN write bad field on user doc (expect 403):', req(f'{FS}/users/{me}?updateMask.fieldPaths=isAdmin', {'fields': {'isAdmin': {'booleanValue': True}}}, token=s['t'], method='PATCH')[0])
    print('unauth get users/<fake>:', req(f'{FS}/users/{fake}')[0])
    print('unauth list users (pageSize=1, status only):', req(f'{FS}/users?pageSize=1&mask.fieldPaths=__none__')[0])
    print('auth get OTHER users/<fake>:', req(f'{FS}/users/{fake}', token=s['t'])[0])
    print('auth list OTHER users/<fake>/bookmarks:', req(f'{FS}/users/{fake}/bookmarks', token=s['t'])[0])
    print('auth list users collection (status only):', req(f'{FS}/users?pageSize=1&mask.fieldPaths=__none__', token=s['t'])[0])
    for label, path in [('auth write OTHER users/<fake>/bookmarks/probe', f'users/{fake}/bookmarks/probe'), ('auth write top-level sv_rules_probe/x', 'sv_rules_probe/x')]:
        st = req(f'{FS}/{path}', {'fields': {'probe': {'stringValue': 'rules-probe'}}}, token=s['t'], method='PATCH')[0]
        print(label + ':', st)
        if st == 200:  # insecure rules let it through: remove the probe doc immediately
            print('   cleanup delete:', req(f'{FS}/{path}', token=s['t'], method='DELETE')[0])
elif cmd == 'gone':
    st, b = signin(email, pw); print('signin after delete:', st, b.get('error', {}).get('message'))
    s = json.load(open(tf)); st, b = req(f"{FS}/users/{s['uid']}/bookmarks", token=s['t'])
    print('bookmarks after delete (old token):', st, 'count', len(b.get('documents', [])), b.get('error', {}).get('status', ''))
    st, b = req(f"{FS}/users/{s['uid']}", token=s['t']); print('user doc after delete:', st, b.get('error', {}).get('status', ''))
