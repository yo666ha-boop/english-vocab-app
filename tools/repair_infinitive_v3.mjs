#!/usr/bin/env node
import fs from 'node:fs';

const [,,inputPath,outputPath=inputPath]=process.argv;
if(!inputPath){console.error('Usage: node tools/repair_infinitive_v3.mjs <html> [output.html]');process.exit(2);}
let html=fs.readFileSync(inputPath,'utf8');
for(const marker of ['id="qb-data"','M2X-INF-']) if(!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re);if(!m)throw new Error('missing qb-data');
const qb=JSON.parse(m[1]);if(!Array.isArray(qb)||qb.length<10000)throw new Error(`NOT CANONICAL: qb count=${qb.length}`);
let changed=0;
for(const x of qb){
  if(!String(x.id||'').startsWith('M2X-INF-')) continue;
  const oldQ=String(x.q||''),oldA=String(x.a||'');
  let q=oldQ;
  if(x.type==='変形'){
    q=q.replace(/を否定文または疑問文に直しなさい。?$/,'を疑問文にしなさい。');
    if(/を疑問文にしなさい。?$/.test(q)){
      let src=q.replace(/\s*を疑問文にしなさい。?$/,'').trim().replace(/[.。]$/,'');
      const ans=makeQuestion(src);
      if(ans){q=`${src}. を疑問文にしなさい。`;x.a=ans;}
    }
  }
  x.q=q;
  if(x.q!==oldQ||x.a!==oldA) changed++;
}

const errors=[];
for(const x of qb){
  if(!String(x.id||'').startsWith('M2X-INF-'))continue;
  const q=String(x.q||''),a=String(x.a||'');
  if(/否定文または疑問文/.test(q)) errors.push(`${x.id}:non-unique transform`);
  if(/^(?:Do|Does)\s+.+\s+(?:went|came|saw|made|took|used|visited|studied|played)\b/i.test(a)) errors.push(`${x.id}:past verb after do/does ${a}`);
  if(/^Did\s+.+\s+(?:went|came|saw|made|took)\b/i.test(a)) errors.push(`${x.id}:past verb after did ${a}`);
  if(/^(?:Do|Does|Did) (?:You|We|They|He|She)\b/.test(a)) errors.push(`${x.id}:question pronoun case ${a}`);
  if(x.type==='変形'&&/を疑問文にしなさい。$/.test(q)){
    const src=q.replace(/\s*を疑問文にしなさい。$/,'').replace(/[.。]$/,'');
    const want=makeQuestion(src);
    if(want&&a!==want) errors.push(`${x.id}:question mismatch expected ${want} got ${a}`);
  }
}
if(errors.length){console.error(JSON.stringify({status:'FAILED_INFINITIVE_V3',errors},null,2));process.exit(3);}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
console.log(JSON.stringify({status:'OK',changed}));

function makeQuestion(src){
  const p=parseSubject(src);if(!p)return null;
  const {subject,rest}=p;
  const first=rest.match(/^([A-Za-z]+)\b/);if(!first)return null;
  const verb=first[1];
  const tail=rest.slice(verb.length).trim();
  if(isPastVerb(verb)) return `Did ${questionSubject(subject)} ${pastToBase(verb)}${tail?' '+tail:''}?`;
  if(/^(am|is|are)$/i.test(verb)) return `${cap(verb)} ${questionSubject(subject)}${tail?' '+tail:''}?`;
  if(/^(can|will|must|should|may)$/i.test(verb)) return `${cap(verb)} ${questionSubject(subject)}${tail?' '+tail:''}?`;
  return `${isThird(subject)?'Does':'Do'} ${questionSubject(subject)} ${toBase(verb)}${tail?' '+tail:''}?`;
}
function parseSubject(src){
  const s=String(src).trim();
  const known=['My mother','My father','My brother','My sister','My friend','Ken and Emi','Tom and Ken','I','You','We','They','He','She','Mika','Ken','Emi','Tom'];
  for(const sub of known.sort((a,b)=>b.length-a.length)) if(s.startsWith(sub+' ')) return {subject:sub,rest:s.slice(sub.length+1)};
  const m=s.match(/^([A-Z][A-Za-z]+)\s+(.+)$/);return m?{subject:m[1],rest:m[2]}:null;
}
function questionSubject(s){if(s==='I')return'I';return({You:'you',We:'we',They:'they',He:'he',She:'she'})[s]||s;}
function isThird(s){return !['I','You','We','They'].includes(s)&&!/\band\b/i.test(s);}
function isPastVerb(v){return new Set(['went','came','saw','made','took','used','visited','studied','played','wanted','needed','liked','tried','started','finished','helped','worked','lived','called','joined','watched','read']).has(String(v).toLowerCase());}
function pastToBase(v){
  const x=String(v).toLowerCase();
  const irr={went:'go',came:'come',saw:'see',made:'make',took:'take',read:'read'};if(irr[x])return irr[x];
  const map={used:'use',visited:'visit',studied:'study',played:'play',wanted:'want',needed:'need',liked:'like',tried:'try',started:'start',finished:'finish',helped:'help',worked:'work',lived:'live',called:'call',joined:'join',watched:'watch'};if(map[x])return map[x];
  return x;
}
function toBase(v){
  const x=String(v).toLowerCase(),irr={has:'have',does:'do',goes:'go'};if(irr[x])return irr[x];
  if(/ies$/.test(x))return x.replace(/ies$/,'y');
  if(/(?:ches|shes|sses|xes|zes|oes)$/.test(x))return x.replace(/es$/,'');
  if(/s$/.test(x)&&!/ss$/.test(x))return x.slice(0,-1);
  return x;
}
function cap(s){s=String(s).toLowerCase();return s[0].toUpperCase()+s.slice(1);}
