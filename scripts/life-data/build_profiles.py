"""Rebuild runtime profiles from Babel/CLDR and downloaded World Bank UIS JSON.
PYTHONPATH=/workspace/.tools/babel python scripts/life-data/build_profiles.py /path/to/raw
"""
import sys,json,hashlib
from pathlib import Path
from babel.core import get_global
import babel
root=Path(__file__).resolve().parents[2];raw=Path(sys.argv[1]);world=json.loads((root/'artifacts/no-rules/data/world.json').read_text())
indicators=['SE.PRM.AGES','SE.PRM.DURS','SE.SEC.DURS'];found={};sources=[]
for code in indicators:
 data=(raw/(code+'.json')).read_bytes();sources.append({'indicator':code,'url':'https://api.worldbank.org/v2/country/all/indicator/'+code+'?format=json&date=2010:2025&per_page=20000','sha256':hashlib.sha256(data).hexdigest()})
 latest={}
 for row in json.loads(data)[1]:
  if row['value'] is not None and row['country']['id'] not in latest:latest[row['country']['id']]={'value':int(row['value']),'year':row['date']}
 found[code]=latest
profiles={}
for c in world:
 code=c['code'];langs=get_global('territory_languages').get(code,{})
 ordered=sorted(langs,key=lambda l:(not bool(langs[l].get('official_status')), -langs[l]['population_percent']))
 currencies=[r[0] for r in get_global('territory_currencies').get(code,[]) if r[2] is None and r[3]]
 profiles[code]={'languages':ordered,'currency':currencies[0] if currencies else 'XTS','school':{k:found[ind].get(code) for k,ind in zip(['entryAge','primaryYears','secondaryYears'],indicators)}}
out={'sources':{'languagesCurrencies':'Babel '+babel.__version__+' / Unicode CLDR','cldrUrl':'https://github.com/unicode-org/cldr','education':sources,'retrieved':'2026-11-02'},'countries':profiles}
(root/'artifacts/no-rules/data/life-profiles.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Countries',len(profiles),'education ages',sum(bool(p['school']['entryAge']) for p in profiles.values()))
