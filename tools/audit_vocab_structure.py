from pathlib import Path
from collections import Counter
import re, json, hashlib, sys

p = Path('index.html')
text = p.read_text(encoding='utf-8')

known_terms = [
    'sweet(s)', 'friend(s)', 'English', 'want to', 'How about you?',
    "don't", 'Malala Yousafzai', 'Cafe Maria', 'Diane Kichijitsu',
    'South Africa', 'natural gas'
]

report = {
    'index_bytes_utf8': len(text.encode('utf-8')),
    'index_sha256': hashlib.sha256(text.encode('utf-8')).hexdigest(),
    'parser': 'independent Python DATA bracket scan + json.loads',
}

m = re.search(r'\b(?:const|let|var)\s+DATA\s*=\s*', text)
if not m:
    raise SystemExit('DATA declaration not found')
start = m.end()
while start < len(text) and text[start].isspace():
    start += 1
if start >= len(text) or text[start] != '[':
    raise SystemExit('DATA does not start with [')

# Independent bracket scanner: do not reuse the Node extractor implementation.
depth = 0
quote = None
escaped = False
line_comment = False
block_comment = False
end = None
i = start
while i < len(text):
    c = text[i]
    n = text[i + 1] if i + 1 < len(text) else ''
    if line_comment:
        if c == '\n':
            line_comment = False
        i += 1
        continue
    if block_comment:
        if c == '*' and n == '/':
            block_comment = False
            i += 2
            continue
        i += 1
        continue
    if quote:
        if escaped:
            escaped = False
        elif c == '\\':
            escaped = True
        elif c == quote:
            quote = None
        i += 1
        continue
    if c == '/' and n == '/':
        line_comment = True
        i += 2
        continue
    if c == '/' and n == '*':
        block_comment = True
        i += 2
        continue
    if c in ('"', "'"):
        quote = c
        i += 1
        continue
    if c == '[':
        depth += 1
    elif c == ']':
        depth -= 1
        if depth == 0:
            end = i
            break
    i += 1

if end is None:
    raise SystemExit('DATA closing bracket not found')

expr = text[start:end + 1]
try:
    data = json.loads(expr)
except Exception as e:
    Path('audit').mkdir(parents=True, exist_ok=True)
    Path('audit/VOCAB_SECONDARY_PARSE_ERROR.txt').write_text(repr(e), encoding='utf-8')
    raise

if not isinstance(data, list):
    raise SystemExit('DATA is not an array')
records = [r for r in data if isinstance(r, dict) and r.get('dataset') == 'textbook']
all_dataset_counts = Counter(str(r.get('dataset', '(blank)')) for r in data if isinstance(r, dict))
counts = Counter((str(r.get('textbook','')), str(r.get('grade',''))) for r in records)
star_counts = Counter((str(r.get('textbook','')), str(r.get('grade',''))) for r in records if str(r.get('star','')) == '1')
phrase_counts = Counter((str(r.get('textbook','')), str(r.get('grade',''))) for r in records if str(r.get('phrase','')) == '1')
field_names = sorted({k for r in records for k in r.keys()})

full_key_counts = Counter((
    r.get('textbook',''), r.get('grade',''), r.get('major_unit',''), r.get('section',''),
    r.get('english',''), r.get('japanese',''), r.get('star',''), r.get('kana','')
) for r in records)
full_dups = [{'count': n, 'key': list(k)} for k,n in full_key_counts.items() if n > 1]
full_dups.sort(key=lambda x: (-x['count'], x['key']))

term_rows = {
    term: [r for r in records if term.lower() in str(r.get('english','')).lower()][:25]
    for term in known_terms
}

summary = {
    'data_array_count': len(data),
    'dataset_counts': dict(sorted(all_dataset_counts.items())),
    'record_count': len(records),
    'parse_error_count': 0,
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
    'samples': records[:20],
    'index_sha256': report['index_sha256']
}

Path('audit').mkdir(parents=True, exist_ok=True)
Path('audit/VOCAB_STRUCTURE_AUDIT.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
Path('audit/VOCAB_SECONDARY_AUDIT.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')

lines = [
    f'data_array_count={summary["data_array_count"]}',
    'dataset_counts=' + json.dumps(summary['dataset_counts'], ensure_ascii=False, sort_keys=True),
    f'record_count={summary["record_count"]}',
    f'parse_error_count={summary["parse_error_count"]}',
    f'missing_english={summary["missing_english"]}',
    f'missing_japanese={summary["missing_japanese"]}',
    f'missing_kana={summary["missing_kana"]}',
    f'pos_raw_blank={summary["pos_raw_blank"]}',
    f'full_duplicate_group_count={summary["full_duplicate_group_count"]}',
    'fields=' + ','.join(field_names),
    '', '[counts_by_textbook_grade]'
]
for row in summary['counts_by_textbook_grade']:
    lines.append(f'{row["textbook"]}\t中{row["grade"]}\tcount={row["count"]}\tstar={row["star"]}\tphrase={row["phrase"]}')
lines += ['', '[known_terms]']
for term in known_terms:
    rows = term_rows[term]
    lines.append(f'{term}\trows={len(rows)}')
    for r in rows[:5]:
        lines.append('  ' + json.dumps(r, ensure_ascii=False, sort_keys=True))
Path('audit/VOCAB_SECONDARY_AUDIT.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')

print('\n'.join(lines))

# Hard gates for the completed v7 vocabulary app.
expected = {'textbook': 3975, 'exam': 534, 'elementary': 104}
errors = []
if len(data) != 4613: errors.append(f'data_array_count={len(data)} != 4613')
for k, v in expected.items():
    if all_dataset_counts.get(k, 0) != v: errors.append(f'{k}={all_dataset_counts.get(k,0)} != {v}')
if len(records) != 3975: errors.append(f'textbook={len(records)} != 3975')
if summary['missing_english'] != 0: errors.append('missing_english != 0')
if summary['missing_japanese'] != 0: errors.append('missing_japanese != 0')
if summary['missing_kana'] != 0: errors.append('missing_kana != 0')
if summary['full_duplicate_group_count'] != 0: errors.append('full duplicate textbook rows detected')
if errors:
    print('SECONDARY AUDIT FAIL:', *errors, sep='\n- ', file=sys.stderr)
    sys.exit(1)
print('SECONDARY AUDIT PASS')
