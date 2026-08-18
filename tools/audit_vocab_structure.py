from pathlib import Path
import re, json, hashlib

p = Path('index.html')
text = p.read_text(encoding='utf-8')

known_terms = [
    'sweet(s)', 'friend(s)', 'English', 'want to', 'How about you?',
    "don't", 'Malala Yousafzai', 'Cafe Maria', 'Diane Kichijitsu',
    'South Africa', 'natural gas'
]

key_names = [
    'id','word','english','en','jp','ja','japanese','meaning','kana','reading',
    'book','textbook','grade','unit','part','page','star','important','phrase','pos'
]

report = {
    'index_bytes_utf8': len(text.encode('utf-8')),
    'index_sha256': hashlib.sha256(text.encode('utf-8')).hexdigest(),
    'known_terms': {},
    'key_counts': {},
    'array_assignments': [],
    'object_assignments': [],
}

for term in known_terms:
    hits = []
    start = 0
    while len(hits) < 8:
        i = text.find(term, start)
        if i < 0:
            break
        hits.append({
            'offset': i,
            'snippet': text[max(0, i-300):min(len(text), i+500)]
        })
        start = i + len(term)
    report['known_terms'][term] = {'count': text.count(term), 'hits': hits}

for k in key_names:
    pats = [
        rf'"{re.escape(k)}"\s*:',
        rf"'{re.escape(k)}'\s*:",
        rf'\b{re.escape(k)}\s*:'
    ]
    report['key_counts'][k] = sum(len(re.findall(pat, text, re.I)) for pat in pats)

for m in re.finditer(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[', text):
    name = m.group(1)
    report['array_assignments'].append({
        'name': name,
        'offset': m.start(),
        'snippet': text[m.start():min(len(text), m.start()+900)]
    })

for m in re.finditer(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{', text):
    name = m.group(1)
    report['object_assignments'].append({
        'name': name,
        'offset': m.start(),
        'snippet': text[m.start():min(len(text), m.start()+900)]
    })

# Keep report manageable while preserving the strongest leads.
report['array_assignment_count'] = len(report['array_assignments'])
report['object_assignment_count'] = len(report['object_assignments'])
report['array_assignments'] = report['array_assignments'][:120]
report['object_assignments'] = report['object_assignments'][:120]

out = Path('audit/VOCAB_STRUCTURE_AUDIT.json')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({
    'known_counts': {k:v['count'] for k,v in report['known_terms'].items()},
    'array_assignment_count': report['array_assignment_count'],
    'object_assignment_count': report['object_assignment_count'],
    'key_counts': report['key_counts']
}, ensure_ascii=False, indent=2))
