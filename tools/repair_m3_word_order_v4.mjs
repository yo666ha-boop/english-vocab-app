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
    const tokens=parseParenTokens(q),spec=specFromTokens(tokens);
    if(spec){
      a=buildSentence(spec);
      const fixed=tokens.map(t=>normalizeTokenForSpec(t,spec));
      q=replaceTokenParen(q,`( ${fixed.join(' / ')} )`);
    }
  }else if(x.type==='間違い直し'){
    const src=q.replace(/\s*の誤りを直しなさい。?$/,'').trim().replace(/[.。]$/,'');
    const spec=specFromBrokenSentence(src);if(spec)a=buildSentence(spec);
  }else if(x.type==='英作文'){
    const spec=specFromCorrectSentence(a);
    if(spec){const jp=toJapanese(spec);if(jp){q=`次の日本語に合う英文を書きなさい。『${jp}』`;a=buildSentence(spec);}}
  }else if(x.type==='選択'){
    const b=q.match(/\(A\)\s*([^()]+?)\s*\(B\)\s*([^()]+?)\s*\(C\)\s*([^()]+?)(?=$|\.)/);
    if(b){const spec=specFromLooseSentence(b[2].trim().replace(/[.。]$/,''),true);if(spec){q=q.replace(b[2].trim(),buildSentence(spec).replace(/\.$/,''));a='B';}}
  }else if(x.type==='空所補充'){
    const mm=q.match(/^(.+?)\s*\(\s*\)\s*(.+?)\s*[.。]/)||q.match(/^(.+?)\s*\(\s+\)\s*(.+?)\s*[.。]/);
    if(mm){const subject=normalizeSubjectCapitalization(clean(mm[1])),rest=clean(mm[2]);if(/^to\s+/.test(rest))a=isThird(subject)?'goes':'go';else if(/^(?:soccer|tennis|baseball|basketball|volleyball)\b/i.test(rest))a=isThird(subject)?'plays':'play';a=lowerFirst(a);}
  }else if(x.type==='読解'){
    const src=q.split(/\s*問い：/)[0].trim().replace(/[.。]$/,'');
    const spec=specFromLooseSentence(src,false);if(spec){const jp=toJapanese(spec);if(jp){q=`${buildSentence(spec)} 問い：この英文の意味を書きなさい。`;a=jp;}}
  }
  x.q=q;x.a=a;
}

function tokenParenMatches(q){
  return [...String(q).matchAll(/\(([^()]+)\)/g)].filter(m=>m[1].includes('/'));
}
function parseParenTokens(q){
  const matches=tokenParenMatches(q);const m=matches.at(-1);return m?m[1].split('/').map(clean):[];
}
function replaceTokenParen(q,replacement){
  const matches=tokenParenMatches(q);const m=matches.at(-1);if(!m)return q;
  return q.slice(0,m.index)+replacement+q.slice(m.index+m[0].length);
}
function specFromTokens(tokens){
  if(tokens.length<3)return null;
  const verb=tokens.find(t=>/^(?:play|plays|go|goes)$/i.test(t));
  const time=tokens.find(isTimePhrase)||null;
  if(!verb)return null;
  const remaining=tokens.filter(t=>t!==verb&&t!==time);if(remaining.length<2)return null;
  const subject=normalizeSubjectCapitalization(remaining[0]),complement=remaining.slice(1).join(' ');
  return{subject,kind:activityKind(complement),complement,time};
}
function specFromBrokenSentence(src){
  const {core,time}=splitTime(src);
  const subject=detectKnownSubject(core);if(!subject)return null;
  const rest=core.slice(subject.length).trim();
  let m=rest.match(/^(the\s+.+?)\s+(?:go|goes)$/i);
  if(m)return{subject,kind:'destination',complement:clean(m[1]),time};
  return specFromLooseSentence(src,false);
}
function specFromLooseSentence(src,allowNoTime=false){
  const {core,time}=splitTime(src);
  if(!time&&!allowNoTime)return null;
  const subject=detectKnownSubject(core);if(!subject)return null;
  const rest=core.slice(subject.length).trim();
  let m=rest.match(/^(?:play|plays)\s+(.+)$/i);if(m)return{subject,kind:activityKind(m[1]),complement:clean(m[1]),time};
  m=rest.match(/^(?:go|goes)\s+(.+)$/i);if(m){const c=clean(m[1]);return{subject,kind:/^to\s+/.test(c)?'destination':activityKind(c),complement:c.replace(/^to\s+/,'').trim(),time};}
  m=rest.match(/^(?:play|go)\s+(.+)$/i);if(m){const c=clean(m[1]);return{subject,kind:/^to\s+/.test(c)?'destination':activityKind(c),complement:c.replace(/^to\s+/,'').trim(),time};}
  return null;
}
function specFromCorrectSentence(s){return specFromLooseSentence(String(s||'').trim().replace(/[.。]$/,''),true);}
function splitTime(src){
  const s=clean(src);
  const patterns=[/\s+(every day)$/i,/\s+(every morning)$/i,/\s+(every evening)$/i,/\s+(every night)$/i,/\s+(in the morning)$/i,/\s+(in the afternoon)$/i,/\s+(in the evening)$/i,/\s+(after class)$/i,/\s+(after school)$/i,/\s+(before breakfast)$/i,/\s+(before dinner)$/i,/\s+(on Sunday)$/i,/\s+(on weekends)$/i,/\s+(at noon)$/i,/\s+(at midnight)$/i,/\s+(at (?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve))$/i];
  for(const re of patterns){const m=s.match(re);if(m)return{core:s.slice(0,m.index).trim(),time:clean(m[1])};}
  return{core:s,time:null};
}
function isTimePhrase(t){return !!splitTime(`X ${t}`).time;}
function detectKnownSubject(core){
  const list=['The student','The teacher','Our team','This dog','My mother','My father','My brother','My sister','My friend','Ken and Emi','Tom and Ken','They','We','You','I','He','She','Yuki','Mika','Ken','Emi','Tom'];
  for(const s of list.sort((a,b)=>b.length-a.length))if(core.toLowerCase().startsWith(s.toLowerCase()+' '))return normalizeSubjectCapitalization(s);
  const m=core.match(/^((?:The|This|Our|My)\s+\w+|[A-Z][A-Za-z]+)\s+/);return m?normalizeSubjectCapitalization(m[1]):null;
}
function activityKind(c){const x=clean(c).toLowerCase();if(['running','swimming'].includes(x))return'go-activity';if(/^the\s+/.test(x))return'destination';return'play-sport';}
function buildSentence(s){const tail=s.time?` ${s.time}`:'';if(s.kind==='destination')return`${s.subject} ${isThird(s.subject)?'goes':'go'} to ${s.complement.replace(/^to\s+/i,'')}${tail}.`;if(s.kind==='go-activity')return`${s.subject} ${isThird(s.subject)?'goes':'go'} ${s.complement}${tail}.`;return`${s.subject} ${isThird(s.subject)?'plays':'play'} ${s.complement}${tail}.`;}
function normalizeTokenForSpec(t,s){if(/^(?:play|plays)$/i.test(t))return isThird(s.subject)?'plays':'play';if(/^(?:go|goes)$/i.test(t))return isThird(s.subject)?'goes':'go';return t;}
function toJapanese(s){
  const subj=jpSubject(s.subject),time=jpTime(s.time);if(!subj||!time)return null;
  if(s.kind==='destination'){const dest=jpDestination(s.complement);return dest?`${subj}は${time}${dest}へ行きます。`:null;}
  if(s.kind==='go-activity'){const act={running:'走りに',swimming:'泳ぎに'}[s.complement.toLowerCase()];return act?`${subj}は${time}${act}行きます。`:null;}
  const sport=jpSport(s.complement);return sport?`${subj}は${time}${sport}をします。`:null;
}
function jpSubject(s){return{'The student':'その生徒','The teacher':'その先生','Our team':'私たちのチーム','This dog':'この犬','My mother':'私の母','My father':'私の父','My brother':'私の兄弟','My sister':'私の姉妹','My friend':'私の友達','He':'彼','She':'彼女','Yuki':'ユキ','Mika':'ミカ','Ken':'ケン','Emi':'エミ','Tom':'トム','I':'私','You':'あなた','We':'私たち','They':'彼ら'}[s]||null;}
function jpTime(t){if(!t)return null;const x=t.toLowerCase();const map={'every day':'毎日','every morning':'毎朝','every evening':'毎晩','every night':'毎晩','in the morning':'朝に','in the afternoon':'午後に','in the evening':'夕方に','after class':'授業の後に','after school':'放課後に','before breakfast':'朝食前に','before dinner':'夕食前に','on sunday':'日曜日に','on weekends':'週末に','at noon':'正午に','at midnight':'真夜中に','at one':'1時に','at two':'2時に','at three':'3時に','at four':'4時に','at five':'5時に','at six':'6時に','at seven':'7時に','at eight':'8時に','at nine':'9時に','at ten':'10時に','at eleven':'11時に','at twelve':'12時に'};return map[x]||null;}
function jpDestination(c){const x=c.replace(/^to\s+/i,'').toLowerCase();return{'the station':'駅','the library':'図書館','the room':'部屋','the park':'公園','the school':'学校','the pool':'プール','the office':'事務所','the zoo':'動物園','the gym':'体育館','the store':'店'}[x]||null;}
function jpSport(c){return{soccer:'サッカー',tennis:'テニス',baseball:'野球',basketball:'バスケットボール',volleyball:'バレーボール'}[c.toLowerCase()]||null;}
function isThird(s){return !['I','You','We','They'].includes(s)&&! /\band\b/i.test(s);}
function normalizeSubjectCapitalization(s){const x=clean(s);const map={'the student':'The student','the teacher':'The teacher','our team':'Our team','this dog':'This dog','he':'He','she':'She','you':'You','we':'We','they':'They','i':'I','yuki':'Yuki','mika':'Mika','ken':'Ken','emi':'Emi','tom':'Tom'};return map[x.toLowerCase()]||x;}
function clean(s){return String(s||'').trim().replace(/\s+/g,' ');}
function lowerFirst(s){s=String(s||'');return /^[A-Z]/.test(s)?s[0].toLowerCase()+s.slice(1):s;}
function singularSubjectsPattern(){return'(?:He|She|Yuki|Mika|Ken|Emi|Tom|The student|The teacher|Our team|This dog|My mother|My father|My brother|My sister|My friend)';}

function auditWordOrder(qb){
  const errors=[],sing=singularSubjectsPattern();
  for(const x of qb){
    if(!String(x.id||'').startsWith('M3N-')||x.category!=='英語の語順')continue;
    const q=String(x.q||''),a=String(x.a||''),both=`${q} ${a}`;
    if(new RegExp(`\\b${sing} (?:play|go)\\b`).test(both))errors.push(`${x.id}:bare verb remains for singular subject`);
    if(x.type==='空所補充'&&/^[A-Z]/.test(a))errors.push(`${x.id}:capitalized blank answer ${a}`);
    if(/(?:は(?:at |every |after |before |in the |on )|に(?:soccer|tennis|baseball|basketball|volleyball|running|swimming)\b|the\s+\w+へ)/i.test(both))errors.push(`${x.id}:code-switched Japanese remains`);
    if(x.type==='選択'&&new RegExp(`\\(B\\)\\s*${sing} (?:play|go)\\b`).test(q))errors.push(`${x.id}:ungrammatical B remains`);
    if(x.type==='読解'&&/[A-Za-z]+は/.test(a))errors.push(`${x.id}:mixed-language reading answer`);
  }
  return{errors};
}
