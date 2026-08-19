import fs from 'node:fs';

const instructions = fs.readFileSync('gpt/mikami_answer_analysis_gpt_instructions.md','utf8');
const schema = JSON.parse(fs.readFileSync('gpt/mikami_answer_analysis_output_schema.json','utf8'));
const cases = JSON.parse(fs.readFileSync('gpt/tests/mikami_answer_gpt_photo_acceptance_cases.json','utf8'));

const failures=[];
const must = (ok,msg)=>{ if(!ok) failures.push(msg); };

must(cases.version==='mikami-answer-gpt-photo-acceptance-v1','acceptance version mismatch');
must(Array.isArray(cases.cases) && cases.cases.length===4,'exactly four photo acceptance cases required');
for (const id of ['correct_original','multi_category_errors','unreadable_answer','school_test']) {
  must(cases.cases.some(x=>x.id===id),`missing case ${id}`);
}

for (const text of [
  '問題IDが見える場合は、必ずIDでKnowledgeを照合する',
  '写真が読めない箇所を推測採点しない',
  '問題IDがKnowledgeに見つからない場合、似た問題を代用しない',
  '学校テスト／正本外',
  '改善項目は原則3つまでに絞る',
  'A4縦1〜2枚',
  '横に広い表は避ける',
  '分析できなかった箇所'
]) must(instructions.includes(text),`instructions missing required contract: ${text}`);

const props=schema.properties||{};
must(props.source_mode?.enum?.includes('mikami_canonical'),'schema missing mikami_canonical');
must(props.source_mode?.enum?.includes('school_test'),'schema missing school_test');
must(props.question_results?.items?.properties?.status?.enum?.includes('held'),'schema missing held status');
must(props.question_results?.items?.properties?.confidence?.enum?.includes('low'),'schema missing low confidence');
must(props.root_causes?.maxItems===3,'root_causes maxItems must be 3');
must(props.return_points?.maxItems===3,'return_points maxItems must be 3');
must(props.next_actions?.maxItems===3,'next_actions maxItems must be 3');
must(props.unreadable_or_missing?.type==='array','schema missing unreadable_or_missing');

const report = cases.a4_report_acceptance||{};
must(report.orientation==='portrait','A4 orientation must be portrait');
must(report.target_pages_min===1 && report.target_pages_max===2,'A4 target must be 1-2 pages');
for (const section of ['基本情報','1. 今回できていたこと','2. 間違いが集中したところ','3. いちばん大きな原因','4. 戻るならここ','5. 次にやること','6. 生徒へのひとこと']) {
  must(report.required_sections?.includes(section),`A4 required section missing: ${section}`);
}

if (failures.length) {
  console.error(JSON.stringify({status:'FAIL',failures},null,2));
  process.exit(1);
}
console.log(JSON.stringify({
  status:'PASS',
  photo_cases:cases.cases.map(x=>x.id),
  photo_case_count:cases.cases.length,
  a4_orientation:report.orientation,
  a4_target_pages:[report.target_pages_min,report.target_pages_max],
  held_status_supported:true,
  root_cause_limit:props.root_causes.maxItems,
  return_point_limit:props.return_points.maxItems,
  next_action_limit:props.next_actions.maxItems
},null,2));
