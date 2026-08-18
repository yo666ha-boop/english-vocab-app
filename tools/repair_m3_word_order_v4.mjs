#!/usr/bin/env node
import fs from 'node:fs';

const [,, inputPath, outputPath=inputPath]=process.argv;
if(!inputPath){console.error('Usage: node tools/repair_m3_word_order_v4.mjs <html> [output.html]');process.exit(2);}
let html=fs.readFileSync(inputPath,'utf8');
for(const marker of ['id="qb-data"','M3N-','英語の語順']) if(!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re);if(!m)throw new Error('missing qb-data');
const qb=JSON.parse(m[1]);if(!Array.isArray(qb)||qb.length<10000)throw new Error(`NOT CANONICAL: qb count=${qb.length}`);

const changes=[];
for(const x of qb){
  if(!String(x.id||'').startsWith('M3N-')||x.category!=='英語の語順')continue;
  const before={q:String(x.q||''),a:String(x.a||'')};
  repair(x);
  if(x.q!==before.q||x.a!==before.a)changes.push({id:x.id,q_before:before.q,q_after:x.q,a_before:before.a,a_after:x.a});
}
const audit=auditWordOrder(qb);
if(audit.errors.length){console.error(JSON.stringify({status:'FAILED_M3_WORD_ORDER_V4',...audit},null,2));process.exit(3);}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
fs.writeFileSync(outputPath+'.m3-word-order-v4.audit.json',JSON.stringify({status:'OK',changed:changes.length,changes,audit},null,2),'utf8');
console.log(JSON.stringify({status:'OK',changed:changes.length,audit},null,2));

function repair(x){
  let q=String(x.q||''),a=String(x.a||'');
  if(x.type==='並びかえ'){
    const tokens=parseParenTokens(q);
    const spec=specFromTokens(tokens);
    if(spec){
      const sentence=buildSentence(spec);
      a=sentence;
      // Keep the learning target visible in the token bank, but correct the verb form token.
      const fixed=tokens.map(t=>normalizeTokenForSpec(t,spec));
      q=q.replace(/\([^()]+\)/,`( ${fixed.join(' / ')} )`);
    }
  }else if(x.type==='間違い直し'){
    const src=q.replace(/\s*の誤りを直しなさい。?$/,'').trim().replace(/[.。]$/,'');
    const spec=specFromBrokenSentence(src);
    if(spec)a=buildSentence(spec);
  }else if(x.type==='英作文'){
    const answerSpec=specFromCorrectSentence(a);
    if(answerSpec){
      q=`次の日本語に合う英文を書きなさい。『${toJapanese(answerSpec)}』`;
      a=buildSentence(answerSpec);
    }
  }else if(x.type==='選択'){
    const b=q.match(/\(A\)\s*([^()]+?)\s*\(B\)\s*([^()]+?)\s*\(C\)\s*([^()]+?)(?:$|\.)/);
    if(b){
      const spec=specFromLooseSentence(b[2].trim().replace(/[.。]$/,''));
      if(spec){
        const correct=buildSentence(spec).replace(/\.$/,'');
        q=q.replace(b[2].trim(),correct);
        a='B';
      }
    }
  }else if(x.type==='空所補充'){
    const mm=q.match(/^(.+?)\s*\(\s*\)\s*(.+?)\s*[.。]/)||q.match(/^(.+?)\s*\(\s+\)\s*(.+?)\s*[.。]/);
    if(mm){
      const subject=clean(mm[1]);
      const rest=clean(mm[2]);
      if(/^to\s+/.test(rest))a=isThird(subject)?'goes':'go';
      else if(/^(?:soccer|tennis|baseball|basketball|volleyball)\b/i.test(rest))a=isThird(subject)?'plays':'play';
      a=lowerFirst(a);
    }
  }else if(x.type==='読解'){
    const src=q.split(/\s*問い：/)[0].trim().replace(/[.。]$/,'');
    const spec=specFromLooseSentence(src);
    if(spec){
      q=`${buildSentence(spec)} 問い：この英文の意味を書きなさい。`;
      a=toJapanese(spec);
    }
  }
  x.q=q;x.a=a;
}

function parseParenTokens(q){const m=String(q).match(/\(([^()]+)\)/);return m?m[1].split('/').map(clean):[];}
function specFromTokens(tokens){
  if(tokens.length<4)return null;
  const verbToken=tokens.find(t=>/^(?:play|plays|go|goes)$/i.test(t));
  const time=tokens.find(t=>/^at\s+/.test(t));
  if(!verbToken||!time)return null;
  const remaining=tokens.filter(t=>t!==verbToken&&t!==time);
  if(remaining.length<2)return null;
  const subject=normalizeSubjectCapitalization(remaining[0]);
  const complement=remaining.slice(1).join(' ');
  return {subject,kind:activityKind(complement),complement,time};
}
function specFromBrokenSentence(src){
  // destination pattern: Subject the station go at noon -> Subject goes to the station at noon
  let m=src.match(/^(.+?)\s+(the\s+\w+(?:\s+\w+)*)\s+(?:go|goes)\s+(at\s+.+)$/i);
  if(m)return{subject:normalizeSubjectCapitalization(m[1]),kind:'destination',complement:clean(m[2]),time:clean(m[3])};
  return specFromLooseSentence(src);
}
function specFromLooseSentence(src){
  const timeMatch=src.match(/\s+(at\s+(?:noon|midnight|\w+))$/i);if(!timeMatch)return null;
  const time=clean(timeMatch[1]);const core=src.slice(0,timeMatch.index).trim();
  const subject=detectKnownSubject(core);if(!subject)return null;
  const rest=core.slice(subject.length).trim();
  let m=rest.match(/^(?:play|plays)\s+(.+)$/i);if(m)return{subject,kind:activityKind(m[1]),complement:clean(m[1]),time};
  m=rest.match(/^(?:go|goes)\s+(.+)$/i);if(m){const c=clean(m[1]);return{subject,kind:/^to\s+/.test(c)?'destination':activityKind(c),complement:c.replace(/^to\s+/,'').trim(),time};}
  return null;
}
function specFromCorrectSentence(s){return specFromLooseSentence(String(s||'').trim().replace(/[.。]$/,''));}
function detectKnownSubject(core){
  const list=['The student','The teacher','Our team','This dog','My mother','My father','My brother','My sister','My friend','Ken and Emi','Tom and Ken','They','We','You','I','He','She','Mika','Ken','Emi','Tom'];
  for(const s of list.sort((a,b)=>b.length-a.length))if(core.toLowerCase().startsWith(s.toLowerCase()+' '))return normalizeSubjectCapitalization(s);
  const m=core.match(/^((?:The|This|Our|My)\s+\w+|[A-Z][A-Za-z]+)\s+/);return m?normalizeSubjectCapitalization(m[1]):null;
}
function activityKind(c){const x=clean(c).toLowerCase();if(['running','swimming'].includes(x))return'go-activity';if(/^the\s+/.test(x))return'destination';return'play-sport';}
function buildSentence(s){
  if(s.kind==='destination')return`${s.subject} ${isThird(s.subject)?'goes':'go'} to ${s.complement.replace(/^to\s+/i,'')} ${s.time}.`;
  if(s.kind==='go-activity')return`${s.subject} ${isThird(s.subject)?'goes':'go'} ${s.complement} ${s.time}.`;
  return`${s.subject} ${isThird(s.subject)?'plays':'play'} ${s.complement} ${s.time}.`;
}
function normalizeTokenForSpec(t,s){
  if(/^(?:play|plays)$/i.test(t))return isThird(s.subject)?'plays':'play';
  if(/^(?:go|goes)$/i.test(t))return isThird(s.subject)?'goes':'go';
  return t;
}
function toJapanese(s){
  const subj=jpSubject(s.subject),time=jpTime(s.time);
  if(!subj||!time)throw new Error(`Unsupported Japanese mapping: ${JSON.stringify(s)}`);
  if(s.kind==='destination'){
    const dest=jpDestination(s.complement);if(!dest)throw new Error(`Unsupported destination: ${s.complement}`);
    return`${subj}は${time}${dest}へ行きます。`;
  }
  if(s.kind==='go-activity'){
    const act={running:'走りに',swimming:'泳ぎに'}[s.complement.toLowerCase()];if(!act)throw new Error(`Unsupported activity: ${s.complement}`);
    return`${subj}は${time}${act}行きます。`;
  }
  const sport=jpSport(s.complement);if(!sport)throw new Error(`Unsupported sport: ${s.complement}`);
  return`${subj}は${time}${sport}をします。`;
}
function jpSubject(s){return{'The student':'その生徒','The teacher':'その先生','Our team':'私たちのチーム','This dog':'この犬','My mother':'私の母','My father':'私の父','My brother':'私の兄［弟］','My sister':'私の姉［妹］','My friend':'私の友達','He':'彼','She':'彼女','Mika':'ミカ','Ken':'ケン','Emi':'エミ','Tom':'トム','I':'私は','You':'あなた','We':'私たち','They':'彼ら'}[s]||null;}
function jpTime(t){const x=t.toLowerCase();const map={'at noon':'正午に','at midnight':'真夜中に','at six':'6時に','at seven':'7時に','at eight':'8時に','at nine':'9時に','at ten':'10時に','at eleven':'11時に'};return map[x]||null;}
function jpDestination(c){const x=c.replace(/^to\s+/i,'').toLowerCase();return{'the station':'駅','the library':'図書館','the room':'部屋','the park':'公園','the school':'学校'}[x]||null;}
function jpSport(c){return{soccer:'サッカー',tennis:'テニス',baseball:'野球',basketball:'バスケットボール',volleyball:'バレーボール'}[c.toLowerCase()]||null;}
function isThird(s){return !['I','You','We','They'].includes(s)&&! /\band\b/i.test(s);}
function normalizeSubjectCapitalization(s){const x=clean(s);const map={'the student':'The student','the teacher':'The teacher','our team':'Our team','this dog':'This dog'};return map[x.toLowerCase()]||x;}
function clean(s){return String(s||'').trim().replace(/\s+/g,' ');}
function lowerFirst(s){s=String(s||'');return /^[A-Z]/.test(s)?s[0].toLowerCase()+s.slice(1):s;}

function auditWordOrder(qb){
  const errors=[];
  for(const x of qb){
    if(!String(x.id||'').startsWith('M3N-')||x.category!=='英語の語順')continue;
    const q=String(x.q||''),a=String(x.a||'');
    if(/\b(?:The student|The teacher|Our team|This dog) (?:play|go)\b/.test(`${q} ${a}`))errors.push(`${x.id}:bare verb remains for singular subject`);
    if(x.type==='空所補充'&&/^[A-Z]/.test(a))errors.push(`${x.id}:capitalized blank answer ${a}`);
    if(/(?:はat\b|に(?:soccer|tennis|baseball|running|swimming)\b|the\s+\w+へ)/i.test(`${q} ${a}`))errors.push(`${x.id}:code-switched Japanese remains`);
    if(x.type==='選択'&&/\(B\)\s*(?:The student|The teacher|Our team|This dog) (?:play|go)\b/.test(q))errors.push(`${x.id}:ungrammatical B remains`);
    if(x.type==='読解'&&/^[A-Za-z].*[ぁ-んァ-ン一-龯]/.test(a))errors.push(`${x.id}:mixed-language reading answer`);
  }
  return{errors};
}
