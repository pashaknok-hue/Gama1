"""Export gendered raw Mimesis data, not provider fallback or synthetic examples."""
import json
from pathlib import Path
import sys
import mimesis
root = Path(mimesis.__file__).parent / 'datasets'
result = {}
for locale in ['kk','ar-dz','ar-ye','ar-ae','ar-eg','ar-jo','ar-om','ar-sy']:
    data = json.loads((root/locale/'person.json').read_text())
    last = data['surnames']
    result['mm_'+locale] = {'language':locale.split('-')[0],
        'male':data['names']['male'],'female':data['names']['female'],
        'surnameMale':last['male'] if isinstance(last,dict) else last,
        'surnameFemale':last['female'] if isinstance(last,dict) else last,
        'surnameMode':'gendered' if isinstance(last,dict) else 'shared',
        'order':'given-first','source':f'mimesis==18.0.0/datasets/{locale}/person.json'}
Path(sys.argv[1]).write_text(json.dumps(result,ensure_ascii=False,sort_keys=True))
