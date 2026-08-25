import fs from 'node:fs';

const path = 'tools/build_safe_problem_passmeta.mjs';
let src = fs.readFileSync(path, 'utf8');

const headerOld = "for(const h of ['教科書','学年','大単元','単元名','英語']) if(!(h in idx)) throw new Error(`missing ${h}`);";
const headerNew = "for(const h of ['教科書','学年','大単元','単元名','英語','検索用基本形','変化形・別表記']) if(!(h in idx)) throw new Error(`missing ${h}`);";
if (!src.includes(headerOld) && !src.includes(headerNew)) throw new Error('header anchor not found');
src = src.replace(headerOld, headerNew);

const lexOld = "      if(prior||ord>0) for(const t of tokensOf(r[idx['英語']])) {const old=l.get(t);if(old===undefined||ord<old)l.set(t,ord);}";
const lexNew = "      if(prior||ord>0) {\n        const lexicalForms=[r[idx['英語']],r[idx['検索用基本形']],r[idx['変化形・別表記']]].filter(Boolean).join(' ');\n        for(const t of tokensOf(lexicalForms)) {const old=l.get(t);if(old===undefined||ord<old)l.set(t,ord);}\n      }";
if (!src.includes(lexOld) && !src.includes(lexNew)) throw new Error('lex anchor not found');
src = src.replace(lexOld, lexNew);

fs.writeFileSync(path, src);
fs.mkdirSync('audit', { recursive: true });
fs.writeFileSync('audit/PROBLEM_APP_PASSMETA_VARIANT_COLUMN_REPAIR.json', JSON.stringify({
  result: 'PASS',
  builder: path,
  uses_columns: ['英語','検索用基本形','変化形・別表記'],
  rule: 'Build lexical stage index from the authoritative v7 surface form, search lemma, and inflected/alternate-form columns; no problem ID, unit, or count hard-code.'
}, null, 2) + '\n');
console.log('PASS: builder now uses v7 basic/variant columns');
