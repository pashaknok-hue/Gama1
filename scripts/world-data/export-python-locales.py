"""Export explicit person-provider data only; never use Faker's en_US fallback."""
import importlib
import json
from pathlib import Path
import sys

locales = ['bg_BG','bn_BD','et_EE','ka_GE','en_KE','sw','de_LI','de_LU','sl_SI',
           'hi_IN','gu_IN','ta_IN','or_IN','ha_NG','ig_NG','tw_GH','fr_CA','en_NZ','en_IE','el_GR','en_GB','is_IS']
result = {}
for locale in locales:
    cls = importlib.import_module('faker.providers.person.'+locale).Provider
    # Explicit localized class attributes, not methods with fallback formatting.
    male = list(cls.__dict__.get('first_names_male', []))
    female = list(cls.__dict__.get('first_names_female', []))
    generic = list(cls.__dict__.get('last_names', []))
    last_male = list(cls.__dict__.get('last_names_male', generic))
    last_female = list(cls.__dict__.get('last_names_female', generic))
    patronymics = {}
    if locale == 'is_IS':
        stems = set(cls.last_names_without_suffix)
        # Only mappings whose genitive is explicitly present in the source.
        patronymics = {name:name+'s' for name in male if name+'s' in stems}
        last_male = [stem+'son' for stem in sorted(stems)]
        last_female = [stem+'dóttir' for stem in sorted(stems)]
    valid = lambda values: [name for name in values if isinstance(name,str) and name.strip() and '{{' not in name]
    result['py_'+locale] = {
      'language': locale.split('_')[0], 'male':valid(male), 'female':valid(female),
      'surnameMale':valid(last_male), 'surnameFemale':valid(last_female),
      'surnameMode':'patronymic' if patronymics else 'gendered' if last_male != last_female else 'shared',
      'order':'given-first','source':f'Faker==37.12.0/faker.providers.person.{locale}',
      'patronymics':patronymics,
    }
assert all(p['male'] and p['female'] and p['surnameMale'] and p['surnameFemale'] for p in result.values())
Path(sys.argv[1]).write_text(json.dumps(result,ensure_ascii=False,sort_keys=True))
