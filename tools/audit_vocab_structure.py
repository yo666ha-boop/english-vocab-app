#!/usr/bin/env python3
import json
from pathlib import Path

summary_path = Path('audit/VOCAB_EMBEDDED_DATA_SUMMARY.json')
out_path = Path('audit/VOCAB_STRUCTURE_AUDIT.json')

result = {
    'status': 'UNKNOWN',
    'errors': [],
    'warnings': [],
    'checks': {},
}

if not summary_path.exists():
    result['errors'].append('VOCAB_EMBEDDED_DATA_SUMMARY.json is missing')
else:
    s = json.loads(summary_path.read_text(encoding='utf-8'))
    n = int(s.get('flattened_row_count') or 0)
    keys = set(s.get('observed_row_keys') or [])
    result['checks']['flattened_row_count'] = n
    result['checks']['observed_row_keys'] = sorted(keys)
    if n <= 0:
        result['errors'].append('No vocabulary rows were extracted')
    if n < 1000:
        result['warnings'].append(f'Vocabulary row count is unexpectedly small: {n}')
    wordish = {'word', 'english', 'en', 'term'}
    if not keys.intersection(wordish):
        result['warnings'].append('No conventional English-word field was detected; inspect observed_row_keys')
    vc = s.get('value_counts') or {}
    for field in ('current_confirmed', 'status'):
        if field in vc:
            result['checks'][f'{field}_counts'] = vc[field]
    result['status'] = 'FAIL' if result['errors'] else ('WARN' if result['warnings'] else 'PASS')

out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False, indent=2))
raise SystemExit(1 if result['errors'] else 0)
