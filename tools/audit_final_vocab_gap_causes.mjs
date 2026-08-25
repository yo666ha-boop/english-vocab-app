import fs from 'node:fs';

const html=fs.readFileSync('problem-app/index.html','utf8');
const gaps=JSON.parse(fs.readFileSync('audit/PROBLEM_APP_VOCAB_FINAL_SECTION_GAPS.json','utf8'));
const outPath='audit/PROBLEM_APP_VOCAB_FINAL_GAP_CAUSES.json';

function scriptJson(id){
  const m=new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i').exec(html);
  if(!m) throw new Error(`${id} not found`);
  return JSON.parse(m[1]);
}
const qb=scriptJson('qb-data');
const meta=scriptJson('meta-data');
const english=qb.filter(x=>x.subject==='英語');
const tokens=s=>((String(s??'').replace(/[’‘]/g,"'").match(/[A-Za-z]+(?:'[A-Za-z]+)?/g))||[]).map(x=>x.toLowerCase());
const irregular=new Map(Object.entries({
  am:'be',is:'be',are:'be',was:'be',were:'be',been:'be',being:'be',has:'have',had:'have',having:'have',does:'do',did:'do',done:'do',doing:'do',
  went:'go',gone:'go',came:'come',made:'make',took:'take',taken:'take',wrote:'write',written:'write',saw:'see',seen:'see',ate:'eat',eaten:'eat',
  gave:'give',given:'give',knew:'know',known:'know',thought:'think',bought:'buy',brought:'bring',spoke:'speak',spoken:'speak',told:'tell',said:'say',
  got:'get',gotten:'get',found:'find',left:'leave',felt:'feel',kept:'keep',met:'meet',ran:'run',swam:'swim',swum:'swim',sat:'sit',stood:'stand',
  lost:'lose',taught:'teach',caught:'catch',became:'become',began:'begin',begun:'begin',built:'build',sent:'send',paid:'pay',wore:'wear',worn:'wear',
  broke:'break',broken:'break',chose:'choose',chosen:'choose',flew:'fly',flown:'fly',forgot:'forget',forgotten:'forget',heard:'hear',held:'hold',rode:'ride',ridden:'ride',
  sold:'sell',slept:'sleep',spent:'spend',won:'win',better:'good',best:'good',worse:'bad',worst:'bad'
}));
function lemmas(t){
  const o=new Set([t]); if(irregular.has(t)) o.add(irregular.get(t));
  if(t.endsWith("n't")) o.add(t.slice(0,-3)); if(t.includes("'")) o.add(t.split("'")[0]);
  if(t.length>4&&t.endsWith('ies')) o.add(t.slice(0,-3)+'y');
  if(t.length>3&&t.endsWith('es')){o.add(t.slice(0,-2));o.add(t.slice(0,-1));}
  if(t.length>3&&t.endsWith('s')&&!t.endsWith('ss')) o.add(t.slice(0,-1));
  if(t.length>4&&t.endsWith('ied')) o.add(t.slice(0,-3)+'y');
  if(t.length>3&&t.endsWith('ed')){o.add(t.slice(0,-2));o.add(t.slice(0,-1));}
  if(t.length>4&&t.endsWith('ing')){o.add(t.slice(0,-3));o.add(t.slice(0,-3)+'e');}
  if(t.length>4&&t.endsWith('ier')) o.add(t.slice(0,-3)+'y');
  if(t.length>5&&t.endsWith('iest')) o.add(t.slice(0,-4)+'y');
  if(t.length>3&&t.endsWith('er')) o.add(t.slice(0,-2));
  if(t.length>4&&t.endsWith('est')) o.add(t.slice(0,-3));
  for(const x of [...o]) if(x.length>3&&x.at(-1)===x.at(-2)) o.add(x.slice(0,-1));
  return [...o];
}

const records=[];
for(const gap of gaps.final_under_50pct||[]){
  const pool=english.filter(x=>x.grade===gap.grade && x.category===gap.category);
  const rejected=[]; const accepted=[];
  for(const item of pool){
    const raw=(meta.passMeta?.[item.id]||{})[gap.textbook];
    const val=Number.isInteger(raw)?raw:Number(raw);
    const ok=val===-2 || (Number.isInteger(val)&&val>0&&val<=gap.section_count);
    (ok?accepted:rejected).push({item,val:Number.isFinite(val)?val:null});
  }
  const valueCounts={}; const typeCounts={}; const tokenCounts={}; const lemmaCounts={};
  for(const {item,val} of rejected){
    const vk=val==null?'missing_or_invalid':String(val); valueCounts[vk]=(valueCounts[vk]||0)+1;
    const type=String(item.type||''); typeCounts[type]=(typeCounts[type]||0)+1;
    for(const t of tokens(`${item.q||''} ${item.a||''}`)){
      tokenCounts[t]=(tokenCounts[t]||0)+1;
      for(const l of lemmas(t)) lemmaCounts[l]=(lemmaCounts[l]||0)+1;
    }
  }
  const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,40).map(([value,count])=>({value,count}));
  records.push({
    ...gap,
    original_pool:pool.length,
    accepted_by_final_passmeta:accepted.length,
    rejected_by_final_passmeta:rejected.length,
    rejection_coordinate_values:valueCounts,
    rejected_type_counts:typeCounts,
    top_rejected_surface_tokens:top(tokenCounts),
    top_rejected_lemma_candidates:top(lemmaCounts),
    rejected_samples:rejected.slice(0,20).map(({item,val})=>({id:item.id,type:item.type,q:item.q,a:item.a,passMeta:val}))
  });
}
const out={
  generated_at:new Date().toISOString(),
  source_gap_file:'audit/PROBLEM_APP_VOCAB_FINAL_SECTION_GAPS.json',
  explanation:'This audit classifies mature final-section under-50% categories by passMeta rejection coordinate, problem type, surface tokens, and morphology-normalized lemma candidates. It does not itself whitelist words or hard-code problem IDs.',
  records
};
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(records.map(r=>({scope:`${r.grade}/${r.textbook}/${r.category}`,off:r.off,on:r.on,retention:r.retention_pct,rejected:r.rejected_by_final_passmeta,coords:r.rejection_coordinate_values,types:r.rejected_type_counts,top:r.top_rejected_surface_tokens.slice(0,8)})),null,2));
