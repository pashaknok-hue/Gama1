"""Import attributed, offline world snapshots. See README.md for sources and limitations."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--sources', type=Path, required=True)
parser.add_argument('--packages', type=Path, required=True)
args = parser.parse_args()
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/no-rules/data'
OUT.mkdir(exist_ok=True)

def read_json(path):
    return json.loads(path.read_text())

countries = read_json(args.packages / 'node_modules/world-countries/countries.json')
locales = read_json(args.sources / 'faker.json')
populations = {}
for line in (args.sources / 'countryInfo.txt').read_text().splitlines():
    if line and not line.startswith('#'):
        row = line.split('\t')
        populations[row[0]] = int(row[7])
admins = {}
for line in (args.sources / 'admin1.txt').read_text().splitlines():
    code, name, ascii_name, identifier = line.split('\t')
    admins[code] = {'code': code, 'name': name, 'geonameId': int(identifier)}
places = collections.defaultdict(list)
with zipfile.ZipFile(args.sources / 'cities500.zip') as archive:
    for line in archive.read('cities500.txt').decode().splitlines():
        row = line.split('\t')
        if row[6] != 'P' or row[7] in ['PPLQ', 'PPLW', 'PPLH']:
            continue
        admin = admins.get(f'{row[8]}.{row[10]}')
        places[row[8]].append({'geonameId': int(row[0]), 'name': row[1], 'asciiName': row[2],
            'region': admin, 'featureCode': row[7], 'population': int(row[14]),
            'latitude': float(row[4]), 'longitude': float(row[5])})

# Explicit source-locale links. No automatic en fallback or official-language-to-
# ethnicity inference. Missing cultural data is a first-class supported outcome.
links = {
 'ZA':['af_ZA','en_ZA','zu_ZA'], 'AZ':['az'], 'CZ':['cs_CZ'], 'DK':['da'],
 'DE':['de'], 'AT':['de_AT'], 'CH':['de_CH','fr_CH','it'], 'MV':['dv'],
 'GR':['el'], 'CY':['el','tr'], 'US':['en','es_MX'], 'GB':['en'], 'IE':['en'],
 'AU':['en_AU'], 'NZ':['en_AU'], 'CA':['en','fr'], 'GH':['en_GH'],
 'IN':['en_IN'], 'NG':['en_NG','yo_NG'], 'ES':['es'], 'MX':['es_MX'],
 'AR':['es'], 'CL':['es'], 'CO':['es'], 'PE':['es'], 'UY':['es'], 'PY':['es'],
 'BO':['es'], 'EC':['es'], 'VE':['es'], 'CR':['es'], 'PA':['es'], 'CU':['es'],
 'DO':['es'], 'GT':['es'], 'HN':['es'], 'SV':['es'], 'NI':['es'],
 'IR':['fa'], 'FI':['fi'], 'FR':['fr'], 'BE':['fr_BE','nl_BE'],
 'SN':['fr_SN'], 'IL':['he','ar'], 'HR':['hr'], 'HU':['hu'], 'AM':['hy'],
 'ID':['id_ID'], 'IT':['it'], 'SM':['it'], 'VA':['it'], 'JP':['ja'],
 'KR':['ko'], 'LV':['lv'], 'MK':['mk'], 'NO':['nb_NO'], 'NP':['ne'],
 'NL':['nl'], 'PL':['pl'], 'BR':['pt_BR'], 'PT':['pt_PT'], 'RO':['ro'],
 'MD':['ro_MD'], 'RU':['ru'], 'SK':['sk'], 'RS':['sr_RS_latin'],
 'SE':['sv'], 'TH':['th'], 'TR':['tr'], 'UA':['uk'], 'PK':['ur'],
 'UZ':['uz_UZ_latin'], 'VN':['vi'], 'CN':['zh_CN'], 'TW':['zh_TW'],
 'SA':['ar'], 'AE':['ar'], 'BH':['ar'], 'QA':['ar'], 'KW':['ar'], 'OM':['ar'],
 'JO':['ar'], 'LB':['ar'], 'SY':['ar'], 'IQ':['ar'], 'EG':['ar'],
}
# Gender-specific surname rules are limited to the locale they describe. The
# source has no female Polish last-name column; apply the Polish -ski/-cki/-dzki
# convention only here, never a Russian suffix rule globally.
def surnames_for(locale, data):
    last = data.get('last_name', {})
    if last.get('male') and last.get('female'):
        return last['male'], last['female'], 'gendered'
    generic = last.get('generic', [])
    if locale == 'pl':
        def feminine(name):
            for ending, replacement in [('ski','ska'), ('cki','cka'), ('dzki','dzka')]:
                if name.endswith(ending): return name[:-len(ending)] + replacement
            return name
        generic = [name for name in generic if not name.endswith(('ska','cka','dzka'))]
        return generic, [feminine(name) for name in generic], 'gendered'
    return generic, generic, 'shared'

def family_pairs(locale, male, female, mode):
    if mode == 'shared': return [[name, name] for name in male]
    if locale == 'pl': return list(map(list, zip(male, female)))
    if locale == 'id_ID': return []  # Second components need not be hereditary surnames.
    female_set = set(female)
    pairs = []
    for name in male:
        candidates = {name, name+'а', name+'a', name+'ová', name+'ova'}
        if name.endswith(('ий','ый','ой')): candidates.update([name[:-2]+'ая',name[:-2]+'а'])
        if locale == 'py_el_GR':
            if name.endswith('ος'): candidates.add(name[:-2]+'ου')
            if name.endswith(('ης','ής','ας')): candidates.add(name[:-1])
        if name.endswith(('s','š')): candidates.add(name[:-1]+'a')
        matches = candidates & female_set
        if len(matches) == 1: pairs.append([name,next(iter(matches))])
    return pairs

pools = {}
for locale in sorted({code for codes in links.values() for code in codes}):
    data = locales.get(locale, {}).get('person', {})
    first = data.get('first_name', {})
    male, female = first.get('male', []), first.get('female', [])
    last_male, last_female, tradition = surnames_for(locale, data)
    if not (male and female and last_male and last_female):
        continue
    clean = lambda values: list(dict.fromkeys(x.strip() for x in values if isinstance(x,str) and x.strip() and '{{' not in x))
    pools[locale] = {'language': locales[locale]['metadata']['language'],
        'male': clean(male), 'female': clean(female),
        'surnameMale': clean(last_male), 'surnameFemale': clean(last_female),
        'surnameMode': tradition, 'familyPairs': family_pairs(locale,clean(last_male),clean(last_female),tradition),
        'order': 'family-first' if locale in ['ja','ko','zh_CN','zh_TW','vi','hu'] else 'given-first',
        'source': f'@faker-js/faker@10.1.0/{locale}'}

python_pools = read_json(args.sources / 'python-faker.json')
for locale, pool in python_pools.items():
    pool['familyPairs'] = family_pairs(locale,pool['surnameMale'],pool['surnameFemale'],pool['surnameMode']) if pool['surnameMode'] != 'patronymic' else []
    pools[locale] = pool
links.update({
 'BG':['py_bg_BG'], 'BD':['py_bn_BD'], 'EE':['py_et_EE'], 'GE':['py_ka_GE'],
 'KE':['py_en_KE','py_sw'], 'TZ':['py_sw'], 'LI':['py_de_LI'], 'LU':['py_de_LU','fr'],
 'GR':['py_el_GR'], 'CY':['py_el_GR','tr'], 'SI':['py_sl_SI'], 'IS':['py_is_IS'], 'CA':['en','py_fr_CA'], 'IE':['py_en_IE'],
 'GB':['py_en_GB'], 'NZ':['py_en_NZ'],
 'IN':['en_IN','py_hi_IN','py_gu_IN','py_ta_IN','py_or_IN'],
 'NG':['en_NG','yo_NG','py_ha_NG','py_ig_NG'], 'GH':['en_GH','py_tw_GH'],
})
for locale, pool in read_json(args.sources / 'mimesis.json').items():
    pool['familyPairs'] = family_pairs(locale,pool['surnameMale'],pool['surnameFemale'],pool['surnameMode'])
    pools[locale] = pool
links.update({'KZ':['mm_kk','ru'],'DZ':['mm_ar-dz'],'YE':['mm_ar-ye'],
    'AE':['mm_ar-ae'],'EG':['mm_ar-eg'],'JO':['mm_ar-jo'],'OM':['mm_ar-om'],'SY':['mm_ar-sy']})
# Russian spelling is used only for an unambiguous exact Wikidata label match.
# Ambiguous or absent mappings keep the original spelling, not a guessed phonetic rule.
spellings = collections.defaultdict(lambda: collections.defaultdict(set))
for row in read_json(args.sources / 'wikidata-russian.json')['results']['bindings']:
    key = row['native']['xml:lang'] + ':' + row['native']['value']
    spellings[key][row['ru']['value']].add(row['item']['value'].replace('http://','https://'))
russian = {}
for key, forms in spellings.items():
    if len(forms) != 1: continue
    form, identifiers = next(iter(forms.items()))
    if any(mark in form for mark in ['/', '(', ')', ',']) or not any('А' <= char <= 'я' for char in form): continue
    russian[key] = {'name':form,'entities':sorted(identifiers)}
(OUT/'russian-names.json').write_text(json.dumps(russian,ensure_ascii=False,separators=(',',':'))+'\n')

# Correct an upstream error: world-countries 5.1.0 marks the Holy See as a member.
# It is a UN non-member observer. Palestine is also not a member (not excluded as a place).
result = []
for country in sorted(countries, key=lambda c:c['cca2']):
    code = country['cca2']
    settlements = places[code]
    groups = collections.defaultdict(list)
    for place in settlements:
        groups[place['region']['code'] if place['region'] else 'unknown'].append(place)
    selected = {}
    for group in groups.values():
        group.sort(key=lambda p:p['population'], reverse=True)
        for place in group[:2] + sorted((p for p in group if p['population'] > 0),key=lambda p:p['population'])[:2]:
            selected[place['geonameId']] = place
    for place in sorted(settlements,key=lambda p:p['population'],reverse=True)[:10]:
        selected[place['geonameId']] = place
    result.append({'code':code, 'name':country['translations'].get('rus',{}).get('common',country['name']['common']),
        'unMember':bool(country['unMember'] and code != 'VA'), 'population':populations.get(code,0),
        'nameLocales':[locale for locale in links.get(code,[]) if locale in pools],
        'settlements':list(selected.values())})
assert sum(country['unMember'] for country in result) == 193
assert all(country['settlements'] for country in result if country['unMember']), 'Every UN member needs real settlements'
(OUT/'world.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
(OUT/'name-pools.json').write_text(json.dumps(pools,ensure_ascii=False,separators=(',',':'))+'\n')
manifest = {'sources': {
    'countries': {'package':'world-countries@5.1.0','url':'https://github.com/mledoze/countries','license':'ODbL-1.0'},
    'names': {'package':'@faker-js/faker@10.1.0','url':'https://github.com/faker-js/faker','license':'MIT'},
    'mimesisNames': {'package':'mimesis==18.0.0','url':'https://github.com/lk-geimfari/mimesis','license':'MIT'},
    'pythonNames': {'package':'Faker==37.12.0','url':'https://github.com/joke2k/faker','license':'MIT'},
    'russianSpellings': {'url':'https://www.wikidata.org/','license':'CC0-1.0','records':len(russian),'unavailableBatches':len(read_json(args.sources / 'wikidata-russian.json')['unavailable'])},
    'geography': {'url':'https://download.geonames.org/export/dump/','license':'CC-BY-4.0'},
    'unMembershipCorrection': 'https://www.un.org/en/about-us/non-member-states'},
    'sha256':{name:hashlib.sha256((args.sources/name).read_bytes()).hexdigest() for name in ['countryInfo.txt','admin1.txt','cities500.zip','faker.json','python-faker.json','mimesis.json','wikidata-russian.json']},
    'unMembers':193,'countriesAndTerritories':len(result),'settlements':sum(len(c['settlements']) for c in result),
    'nameCountries':sum(bool(c['nameLocales']) for c in result),'nameLocales':len(pools)}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
lines=['# Реальное покрытие генерации мира','', f"География: 193 государства-члена ООН; {sum(bool(c['settlements']) for c in result)} стран/территорий с поселениями из {len(result)} записей. Наборы имён: {sum(bool(c['nameLocales']) for c in result)} стран/территорий, в том числе {sum(c['unMember'] and bool(c['nameLocales']) for c in result)} из 193 членов ООН. Для остальных членов ООН имена явно не указаны. Русская запись берётся только из однозначного источника; при неполном соответствии сохраняется исходное имя целиком.",'', 'Источник географии: GeoNames countryInfo, admin1CodesASCII и cities500. Страны и русские названия: world-countries 5.1.0; членство ООН исправлено для Ватикана (наблюдатель). Имена: JS Faker 10.1.0, Python Faker 37.12.0 и Mimesis 18.0.0, только собственные данные локали, без fallback. Русские написания: однозначные точные соответствия Wikidata, иначе исходная запись.','',
'Регионы и поселения выбираются связанной записью GeoNames, а не склеиваются независимо. Если административный регион отсутствует, это отмечается явно. Тип размера определяется населением: мегаполис ≥ 10 млн, город ≥ 100 тыс., небольшой город ≥ 10 тыс., малый населённый пункт < 10 тыс. Это не юридическая классификация «город/деревня». В базе присутствуют реальные малые поселения; полная база всех деревень мира не заявляется.','',
'Faker — поддерживаемый набор тестовых имён, не реестр населения. Наличие локали не означает покрытие всех этносов страны. Связи с общими языковыми наборами заданы явно и не являются демографическими долями. Для отсутствующего набора выводится «Имя не указано», без случайного английского или русского имени.','',
'| Код | Страна/территория | ООН | Поселений в снимке | Данные имён |','|---|---|---|---:|---|']
for c in result:
    lines.append(f"| {c['code']} | {c['name']} | {'да' if c['unMember'] else 'нет'} | {len(c['settlements'])} | {', '.join(c['nameLocales']) or 'нет данных'} |")
(OUT/'COVERAGE.md').write_text('\n'.join(lines)+'\n')
print(json.dumps(manifest,ensure_ascii=False,indent=2))
