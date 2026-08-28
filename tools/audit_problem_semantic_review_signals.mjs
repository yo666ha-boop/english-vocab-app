import fs from 'node:fs';

const HTML = 'problem-app/index.html';
const OUT = 'audit/PROBLEM_APP_SEMANTIC_REVIEW_SIGNALS.json';
const html = fs.readFileSync(HTML, 'utf8');
const m = /<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
if (!m) throw new Error('qb-data not found');
const all = JSON.parse(m[1]);
const rows = all.filter(x => x?.subject === '英語');
const norm = s => String(s ?? '').normalize('NFKC').replace(/[“”‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
const stripPunct = s => norm(s).replace(/[.?!。！？]+$/g, '').trim();
const samples = (arr, n=80) => arr.slice(0,n).map(x => ({id:x.id, grade:x.grade, category:x.category, type:x.type, q:x.q, a:x.a, ...x.extra}));
const duplicateChoices = [], correctionNoError = [], answerChoiceMismatch = [], suspiciousChoiceSpelling = [];
function parenChoiceGroups(q) { const out=[]; const re=/\(([^()]*\/[^()]*)\)/g; let mm; while((mm=re.exec(String(q??'')))){const opts=mm[1].split('/').map(s=>s.trim()).filter(Boolean);if(opts.length>=2)out.push(opts);} return out; }
function extractCorrectionSource(q) { let s=String(q??'').trim(); const markers=[' の誤りを','の誤りを',' の間違いを','の間違いを',' を直しなさい','を直しなさい']; let cut=s.length; for(const mk of markers){const i=s.indexOf(mk);if(i>=0)cut=Math.min(cut,i);} s=s.slice(0,cut).trim().replace(/^(次の英文|次の文)[:：]?\s*/,'').trim(); return s; }
for(const x of rows){
  const groups=parenChoiceGroups(x.q); const isChoice=String(x.type||'').includes('選択');
  if(isChoice){ for(const opts of groups){ const ns=opts.map(norm); const dup=[...new Set(ns.filter((v,i)=>ns.indexOf(v)!==i))]; if(dup.length){duplicateChoices.push({...x,extra:{options:opts,duplicate_normalized:dup}});break;} if(opts.some(o=>/\b(writeing|makeing|takeing|comeing|useing|haveing)\b/i.test(o))) suspiciousChoiceSpelling.push({...x,extra:{options:opts}}); }
    if(groups.length && /正しいものを選/i.test(String(x.q||''))){const flattened=groups.flat().map(stripPunct),a=stripPunct(x.a);if(a&&!flattened.includes(a)&&!/^[abc123]$/i.test(a))answerChoiceMismatch.push({...x,extra:{options:groups.flat()}});}
  }
  if(String(x.type||'').includes('間違い直し')){const src=extractCorrectionSource(x.q);if(src&&stripPunct(src)===stripPunct(x.a))correctionNoError.push({...x,extra:{extracted_source:src}});}
}
const hard=[];if(duplicateChoices.length)hard.push(`duplicate_choice_options:${duplicateChoices.length}`);if(correctionNoError.length)hard.push(`correction_source_equals_answer:${correctionNoError.length}`);if(answerChoiceMismatch.length)hard.push(`answer_not_in_choice_options:${answerChoiceMismatch.length}`);
const report={generated_at:new Date().toISOString(),english_count:rows.length,counts:{duplicate_choice_options:duplicateChoices.length,correction_source_equals_answer:correctionNoError.length,answer_not_in_choice_options:answerChoiceMismatch.length,suspicious_choice_spelling_review:suspiciousChoiceSpelling.length},hard_failures:hard,review_signals:suspiciousChoiceSpelling.length?[`suspicious_choice_spelling:${suspiciousChoiceSpelling.length}`]:[],samples:{duplicate_choice_options:samples(duplicateChoices),correction_source_equals_answer:samples(correctionNoError),answer_not_in_choice_options:samples(answerChoiceMismatch),suspicious_choice_spelling_review:samples(suspiciousChoiceSpelling)}};
fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(hard.length)process.exitCode=1;
