from pathlib import Path
from collections import Counter, defaultdict
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
        hits.append({'offset': i, 'snippet': text[max(0, i-300):min(len(text), i+500)]})
        start = i + len(term)
    report['known_terms'][term] = {'count': text.count(term), 'hits': hits}

for k in key_names:
    pats = [rf'"{re.escape(k)}"\s*:', rf"'{re.escape(k)}'\s*:", rf'\b{re.escape(k)}\s*:']
    report['key_counts'][k] = sum(len(re.findall(pat, text, re.I)) for pat in pats)

for m in re.finditer(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[', text):
    report['array_assignments'].append({'name': m.group(1), 'offset': m.start(), 'snippet': text[m.start():min(len(text), m.start()+900)]})
for m in re.finditer(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{', text):
    report['object_assignments'].append({'name': m.group(1), 'offset': m.start(), 'snippet': text[m.start():min(len(text), m.start()+900)]})
report['array_assignment_count'] = len(report['array_assignments'])
report['object_assignment_count'] = len(report['object_assignments'])
report['array_assignments'] = report['array_assignments'][:120]
report['object_assignments'] = report['object_assignments'][:120]

# Extract the embedded textbook records. The app stores them as escaped JSON objects.
records = []
parse_errors = []
pattern = re.compile(r'\{\\"dataset\\"\s*:\s*\\"textbook\\".*?\}')
for idx, m in enumerate(pattern.finditer(text)):
    raw = m.group(0)
    try:
        obj = json.loads(raw.replace('\\"', '"'))
        records.append(obj)
    except Exception as e:
        if len(parse_errors) < 30:
            parse_errors.append({'offset': m.start(), 'error': repr(e), 'raw': raw[:1200]})

counts = Counter((str(r.get('textbook','')), str(r.get('grade',''))) for r in records)
star_counts = Counter((str(r.get('textbook','')), str(r.get('grade',''))) for r in records if str(r.get('star','')) == '1')
phrase_counts = Counter((str(r.get('textbook','')), str(r.get('grade',''))) for r in records if str(r.get('phrase','')) == '1')
field_names = sorted({k for r in records for k in r.keys()})

# Full duplicate rows are suspicious; repeated English words across units are allowed.
full_key_counts = Counter((
    r.get('textbook',''), r.get('grade',''), r.get('major_unit',''), r.get('section',''),
    r.get('english',''), r.get('japanese',''), r.get('star',''), r.get('kana','')
) for r in records)
full_dups = [
    {'count': n, 'key': list(k)} for k,n in full_key_counts.items() if n > 1
]
full_dups.sort(key=lambda x: (-x['count'], x['key']))

term_rows = {}
for term in known_terms:
    term_rows[term] = [r for r in records if term.lower() in str(r.get('english','')).lower()][:25]

summary = {
    'record_count': len(records),
    'parse_error_count': len(parse_errors),
    'parse_errors': parse_errors,
    'fields': field_names,
    'counts_by_textbook_grade': [
        {'textbook': b, 'grade': g, 'count': counts[(b,g)], 'star': star_counts[(b,g)], 'phrase': phrase_counts[(b,g)]}
        for b,g in sorted(counts)
    ],
    'missing_english': sum(not str(r.get('english','')).strip() for r in records),
    'missing_japanese': sum(not str(r.get('japanese','')).strip() for r in records),
    'missing_kana': sum(not str(r.get('kana','')).strip() for r in records),
    'pos_raw_blank': sum(not str(r.get('pos_raw','')).strip() for r in records),
    'full_duplicate_group_count': len(full_dups),
    'full_duplicate_groups': full_dups[:100],
    'term_rows': term_rows,
    'samples': records[:20]
}

Path('audit').mkdir(parents=True, exist_ok=True)
Path('audit/VOCAB_STRUCTURE_AUDIT.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
Path('audit/VOCAB_EMBEDDED_DATA_SUMMARY.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')

# Also write a short line-oriented report that is easy to inspect through the connector.
lines = [
    f'record_count={summary["record_count"]}',
    f'parse_error_count={summary["parse_error_count"]}',
    f'missing_english={summary["missing_english"]}',
    f'missing_japanese={summary["missing_japanese"]}',
    f'missing_kana={summary["missing_kana"]}',
    f'pos_raw_blank={summary["pos_raw_blank"]}',
    f'full_duplicate_group_count={summary["full_duplicate_group_count"]}',
    'fields=' + ','.join(field_names),
    '',
    '[counts_by_textbook_grade]'
]
for row in summary['counts_by_textbook_grade']:
    lines.append(f'{row["textbook"]}\t中{row["grade"]}\tcount={row["count"]}\tstar={row["star"]}\tphrase={row["phrase"]}')
lines += ['', '[known_terms]']
for term in known_terms:
    rows = term_rows[term]
    lines.append(f'{term}\trows={len(rows)}')
    for r in rows[:5]:
        lines.append('  ' + json.dumps(r, ensure_ascii=False, sort_keys=True))
Path('audit/VOCAB_EMBEDDED_DATA_SUMMARY.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')

print('\n'.join(lines[:40]))
