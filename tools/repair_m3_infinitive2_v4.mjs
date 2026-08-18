#!/usr/bin/env node
import fs from 'node:fs';

const [,, inputPath, outputPath=inputPath]=process.argv;
if(!inputPath){console.error('Usage: node tools/repair_m3_infinitive2_v4.mjs <html> [output.html]');process.exit(2);}
let html=fs.readFileSync(inputPath,'utf8');
for(const marker of ['id="qb-data"','M3N-','不定詞②']) if(!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re); if(!m) throw new Error('missing qb-data');
const qb=JSON.parse(m[1]); if(!Array.isArray(qb)||qb.length<10000) throw new Error(`NOT CANONICAL: qb count=${qb.length}`);

const changes=[];
for(const x of qb){
  if(!String(x.id||'').startsWith('M3N-') || x.category!=='不定詞②') continue;
  const before={q:String(x.q||''),a:String(x.a||''),type:x.type};
  repair(x);
  if(x.q!==before.q||x.a!==before.a||x.type!==before.type) changes.push({id:x.id,type_before:before.type,type_after:x.type,q_before:before.q,q_after:x.q,a_before:before.a,a_after:x.a});
}
const audit=auditBank(qb);
if(audit.errors.length){console.error(JSON.stringify({status:'FAILED_M3_INFINITIVE2_V4',...audit},null,2));process.exit(3);}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
fs.writeFileSync(outputPath+'.m3-infinitive2-v4.audit.json',JSON.stringify({status:'OK',changed:changes.length,changes,audit},null,2),'utf8');
console.log(JSON.stringify({status:'OK',changed:changes.length,audit},null,2));

function repair(x){
  let q=String(x.q||''),a=String(x.a||'');

  if(x.type==='空所補充' && /I have a book\s*\(\s*\)\s*read|I have a book\s*\(\s+\)\s*read/i.test(q)){
    q='I have a book (      ) read. 「読むための本」になるように、空所に入る最も適切な語を書きなさい。';
    a='to';
  }

  if(x.type==='間違い直し'){
    const src=q.replace(/\s*の誤りを直しなさい。?$/,'').trim().replace(/[.。]$/,'');
    const mm=src.match(/^(.+?)\s+went there to played\s+(soccer|tennis|baseball|basketball|volleyball|swimming|running)$/i);
    if(mm){
      const subject=normalizeSubject(mm[1]);
      const act=mm[2].toLowerCase();
      if(['swimming','running'].includes(act)){
        const wrong=act==='swimming'?'swam':'ran';
        const base=act==='swimming'?'swim':'run';
        q=`${subject} went there to ${wrong}. の誤りを直しなさい。`;
        a=`${subject} went there to ${base}.`;
      }else{
        q=`${subject} went there to played ${act}. の誤りを直しなさい。`;
        a=`${subject} went there to play ${act}.`;
      }
    }
  }

  if(x.type==='読解'){
    const body=q.split(/\s*問い：/)[0].trim().replace(/[.。]$/,'');
    if(/^He got up early to catch the first train$/i.test(body) || /^He gots up early to catch the first train$/i.test(body)){
      q='He got up early to catch the first train. 問い：この文の意味として最も適切なものを書きなさい。';
      a='彼は始発電車に乗るために早く起きました。';
    }
  }

  if(x.type==='英作文' && /私は英語を勉強するために図書館へ行きました/.test(q)){
    q='次の日本語に合う英文を書きなさい。『私は英語を勉強するために図書館へ行きました。』';
    a='I went to the library to study English.';
  }

  if(x.type==='並びかえ' && /to\s*\/\s*I\s*\/\s*a\s*\/\s*friend\s*\/\s*have\s*\/\s*talk\s*\/\s*with/i.test(q)){
    q='次の語(句)を正しい順に並べかえなさい。 ( I / have / a / friend / to / talk / with )';
    a='I have a friend to talk with.';
  }

  if(x.type==='選択' && /I have a lot of homework to do/.test(q)){
    q='I have a lot of homework to do. の to do のはたらきとして最も適切なものを選びなさい。 (A) 名詞を説明する (B) 理由を表す (C) 結果を表す';
    a='A';
  }

  x.q=q; x.a=a;
}

function normalizeSubject(s){
  const t=String(s||'').trim().replace(/\s+/g,' ');
  const map={'i':'I','you':'You','we':'We','they':'They','he':'He','she':'She','my father':'My father','my mother':'My mother','my brother':'My brother','my sister':'My sister','the student':'The student','the boy':'The boy','the girl':'The girl','emi':'Emi','mika':'Mika','ken':'Ken','tom':'Tom','yuki':'Yuki'};
  return map[t.toLowerCase()]||t;
}

function auditBank(qb){
  const errors=[];
  for(const x of qb){
    if(!String(x.id||'').startsWith('M3N-') || x.category!=='不定詞②') continue;
    const q=String(x.q||''), a=String(x.a||''), both=`${q} ${a}`;
    if(x.type==='空所補充' && /^To$/.test(a)) errors.push(`${x.id}:capitalized to blank`);
    if(/\bto played\b/i.test(a)) errors.push(`${x.id}:answer still has to played`);
    if(/\bwent(?:s)? there\b/i.test(a)) errors.push(`${x.id}:invalid wents/went-family answer artifact`);
    if(/\bHe gots up\b/i.test(both)) errors.push(`${x.id}:gots remains`);
    if(/to played (?:swimming|running)\b/i.test(q)) errors.push(`${x.id}:mixed infinitive+collocation error remains`);
    if(x.type==='読解' && /^He got up early to catch the first train/.test(q) && a!=='彼は始発電車に乗るために早く起きました。') errors.push(`${x.id}:reading answer mismatch`);
  }
  return {errors};
}
