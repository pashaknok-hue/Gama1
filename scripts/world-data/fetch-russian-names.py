"""Fetch exact Wikidata Russian labels for corpus names, never guessed transliterations."""
import concurrent.futures
import json
import hashlib
from pathlib import Path
import sys
import urllib.parse
import urllib.request

source = Path(sys.argv[1])
pools = json.loads((Path(__file__).resolve().parents[2] / 'artifacts/no-rules/data/name-pools.json').read_text())
keys = sorted({(pool['language'], name) for pool in pools.values() for column in ['male','female','surnameMale','surnameFemale'] for name in pool[column] if pool['language'] != 'ru'})
chunks = [keys[i:i+150] for i in range(0,len(keys),150)]
cache = source / 'wikidata-chunks'
cache.mkdir(exist_ok=True)

def fetch(entry):
    index, keys = entry
    cache_key = hashlib.sha256(json.dumps(keys,ensure_ascii=False).encode()).hexdigest()
    path = cache / f'{cache_key}.json'
    if path.exists(): return json.loads(path.read_text())
    values = ' '.join(json.dumps(name,ensure_ascii=False)+'@'+language for language,name in keys)
    query = '''SELECT ?item ?native ?ru WHERE { VALUES ?native { %s } ?item rdfs:label ?native; rdfs:label ?ru; wdt:P31 ?type. VALUES ?type { wd:Q12308941 wd:Q11879590 wd:Q202444 wd:Q101352 } FILTER(LANG(?ru)="ru") }''' % values
    url = 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query':query,'format':'json'})
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'NO-RULES-data-import/1.0 (exact-label corpus lookup)'}),timeout=25) as response:
        data = json.load(response)
    path.write_text(json.dumps(data,ensure_ascii=False))
    return data

rows = []
failures = []
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    pending = {executor.submit(fetch, entry):entry[0] for entry in enumerate(chunks)}
    for number,future in enumerate(concurrent.futures.as_completed(pending),1):
        try: rows.extend(future.result()['results']['bindings'])
        except Exception as error: failures.append({'chunk':pending[future],'error':str(error)})
        if number%25 == 0: print(f'{number}/{len(chunks)} batches, {len(rows)} labels, {len(failures)} unavailable',flush=True)
(source/'wikidata-russian.json').write_text(json.dumps({'results':{'bindings':rows},'unavailable':failures},ensure_ascii=False))
print(f'Complete: {len(rows)} labels; {len(failures)} unavailable batches',flush=True)
