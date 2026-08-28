import fs from 'node:fs';

const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_CONTENT_CORE_REPAIR.json';
let html=fs.readFileSync(HTML,'utf8');
const re=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i;
const m=re.exec(html); if(!m) throw new Error('qb-data not found');
const all=JSON.parse(m[1]);
const rows=all.filter(x=>x?.subject==='英語');
const stats={changed_rows:0,hybrid_fixed:0,past_family_fixed:0,progressive_family_fixed:0,meaning_fixed:0,by_category:{},samples:[]};
const changed=new Set();
function mark(x,kind,before){
  changed.add(x.id); stats.by_category[x.category]=(stats.by_category[x.category]||0)+1;
  if(stats.samples.length<80) stats.samples.push({id:x.id,kind,before,after:{q:x.q,a:x.a}});
}
function setQA(x,q,a,kind){
  const before={q:x.q,a:x.a}; let did=false;
  if(q!=null&&q!==x.q){x.q=q;did=true;}
  if(a!=null&&a!==x.a){x.a=a;did=true;}
  if(did)mark(x,kind,before);
  return did;
}
const subjJp={
  'I':'私','You':'あなた','He':'彼','She':'彼女','We':'私たち','They':'彼ら',
  'My father':'私の父','My mother':'私の母','My brother':'私の兄弟','My sister':'私の姉妹',
  'Ken':'ケン','Yuki':'ユキ','Tom':'トム','The boy':'その少年','The girl':'その少女',
  'The student':'その生徒','The teacher':'その先生','Our team':'私たちのチーム','This dog':'この犬','My friend':'私の友達'
};
const placeJp={
  'the library':'図書館','the park':'公園','the station':'駅','the school':'学校','the room':'部屋',
  'the hospital':'病院','the museum':'博物館','the store':'店','the classroom':'教室','the kitchen':'台所',
  'the gym':'体育館','the pool':'プール','the zoo':'動物園','the town':'町','the city':'街'
};
const nounJp={book:'本',pen:'ペン',bag:'かばん',picture:'写真',desk:'机',chair:'いす',table:'テーブル',bike:'自転車',dog:'犬',cat:'猫',window:'窓',door:'ドア',notebook:'ノート',ball:'ボール',shoes:'靴'};
const sportJp={tennis:'テニス',soccer:'サッカー',baseball:'野球',basketball:'バスケットボール',volleyball:'バレーボール',badminton:'バドミントン',swimming:'水泳',running:'ランニング',skiing:'スキー',skating:'スケート'};
const activityVerbJp={swimming:'泳いで',running:'走って',skiing:'スキーをして',skating:'スケートをして'};
const directActivities=new Set(['swimming','running','skiing','skating']);
const lowerAfterDid=s=>s==='I'?'I':s.charAt(0).toLowerCase()+s.slice(1);
function replaceQuoted(q,jp){return String(q).replace(/『[^』]*』/,`『${jp}』`);}
function objJp(s){
  s=String(s).trim().replace(/^the /i,'').replace(/^my /i,'');
  return nounJp[s.toLowerCase()]||s;
}
function prepJp(prep,obj){
  const o=objJp(obj);
  return ({on:`${o}の上`,under:`${o}の下`,in:`${o}の中`,by:`${o}のそば`,behind:`${o}の後ろ`,near:`${o}の近く`})[prep]||`${o}の${prep}`;
}

for(const x of rows){
  // User-reported family: When did I arrive at the library? etc.
  if(x.type==='英作文'&&x.category==='疑問詞'){
    const z=/^When did (.+?) arrive at (.+?)\?$/.exec(String(x.a||''));
    if(z&&subjJp[z[1]]&&placeJp[z[2]]){
      if(setQA(x,replaceQuoted(x.q,`${subjJp[z[1]]}はいつ${placeJp[z[2]]}に着きましたか。`),null,'hybrid_when_arrive'))stats.hybrid_fixed++;
    }
  }
  // Imperative place family.
  if(x.type==='英作文'&&x.category==='命令文，there is ～ の文'){
    const z=/^Do not run in (.+?)\.$/.exec(String(x.a||''));
    if(z&&placeJp[z[1]]){
      if(setQA(x,replaceQuoted(x.q,`${placeJp[z[1]]}では走らないでください。`),null,'hybrid_imperative_place'))stats.hybrid_fixed++;
    }
  }
  // Future going-to place family.
  if(x.type==='英作文'&&x.category==='未来の文'){
    const z=/^(.+?) (?:am|are|is) going to go to (.+?) next year\.$/.exec(String(x.a||''));
    if(z&&subjJp[z[1]]&&placeJp[z[2]]){
      if(setQA(x,replaceQuoted(x.q,`${subjJp[z[1]]}は来年${placeJp[z[2]]}へ行くつもりです。`),null,'hybrid_future_place'))stats.hybrid_fixed++;
    }
  }
  // Possessive-pronoun English-composition family.
  if(x.type==='英作文'&&x.category==='人称代名詞'){
    const z=/^The ([A-Za-z]+) is theirs\.$/.exec(String(x.a||''));
    if(z&&nounJp[z[1].toLowerCase()]){
      if(setQA(x,replaceQuoted(x.q,`その${nounJp[z[1].toLowerCase()]}は彼らのものです。`),null,'hybrid_possessive_pronoun'))stats.hybrid_fixed++;
    }
  }
  // Preposition English-composition family.
  if(x.type==='英作文'&&x.category==='前置詞'){
    const z=/^The ([A-Za-z]+) (?:is|are) (on|under|in|by|behind|near) (.+?)\.$/i.exec(String(x.a||''));
    if(z&&nounJp[z[1].toLowerCase()]){
      const subject=nounJp[z[1].toLowerCase()]; const animate=['dog','cat'].includes(z[1].toLowerCase());
      const jp=`${subject}は${prepJp(z[2].toLowerCase(),z[3])}に${animate?'います':'あります'}。`;
      if(setQA(x,replaceQuoted(x.q,jp),null,'hybrid_preposition'))stats.hybrid_fixed++;
    }
  }

  // M3 natural-source past family: play + swimming/running/skiing/skating -> go + activity.
  if(x.category==='be動詞と一般動詞（過去形）'){
    const src=/^(.+?) played (swimming|running|skiing|skating) yesterday\./.exec(String(x.q||''));
    if(src){
      const natural=`${src[1]} went ${src[2]} yesterday.`;
      if(x.type==='見分け'){
        if(setQA(x,String(x.q).replace(/^.+? played (?:swimming|running|skiing|skating) yesterday\./,natural),null,'past_activity_source'))stats.past_family_fixed++;
      }else if(x.type==='変形'&&/疑問文にしなさい/.test(x.q||'')){
        const nq=`${natural} を疑問文にしなさい。`;
        const na=`Did ${lowerAfterDid(src[1])} go ${src[2]} yesterday?`;
        if(setQA(x,nq,na,'past_activity_question'))stats.past_family_fixed++;
      }
    }
    if(x.type==='間違い直し'&&/\b(?:played|play) (?:swimming|running|skiing|skating)\b/i.test(String(x.a||''))){
      const za=/^(.+?) played (swimming|running|skiing|skating) yesterday\.$/.exec(String(x.a||''));
      if(za){
        const na=`${za[1]} went ${za[2]} yesterday.`;
        const nq=`${za[1]} goed ${za[2]} yesterday. の誤りを直しなさい。`;
        if(setQA(x,nq,na,'past_activity_error_correction'))stats.past_family_fixed++;
      }
    }
    // General past-question defect: expected answer must use base form after Did.
    if(x.type==='変形'&&/疑問文にしなさい/.test(x.q||'')){
      const z=/^(.+?) played (tennis|soccer|baseball|basketball|volleyball|badminton) yesterday\. を疑問文にしなさい。$/.exec(String(x.q||''));
      if(z){
        const na=`Did ${lowerAfterDid(z[1])} play ${z[2]} yesterday?`;
        if(setQA(x,null,na,'did_plus_base_repair'))stats.past_family_fixed++;
      }
    }
  }

  // Progressive family: use direct -ing activities instead of "play + activity-ing".
  if(x.category==='進行形'){
    const zq=/^(.+?) is playing (swimming|running|skiing|skating)\. を否定文にしなさい。$/.exec(String(x.q||''));
    if(zq){
      const nq=`${zq[1]} is ${zq[2]}. を否定文にしなさい。`;
      const na=`${zq[1]} is not ${zq[2]}.`;
      if(setQA(x,nq,na,'progressive_direct_activity'))stats.progressive_family_fixed++;
    }
    if(x.type==='英作文'){
      const z=/^(.+?) (was|were) playing (tennis|soccer|baseball|basketball|volleyball|badminton|swimming|running|skiing|skating) then\.$/.exec(String(x.a||''));
      if(z&&subjJp[z[1]]){
        const act=z[3]; let na=x.a; let jp;
        if(directActivities.has(act)){
          na=`${z[1]} ${z[2]} ${act} then.`;
          jp=`そのとき、${subjJp[z[1]]}は${activityVerbJp[act]}いました。`;
        }else{
          jp=`そのとき、${subjJp[z[1]]}は${sportJp[act]}をしていました。`;
        }
        if(setQA(x,replaceQuoted(x.q,jp),na,'progressive_composition')){stats.progressive_family_fixed++;stats.hybrid_fixed++;}
      }
    }
  }

  // High-confidence meaning mismatch already found by audit.
  if(/ピアノを練習します/.test(String(x.q||''))&&/Practices tennis/i.test(String(x.a||''))){
    if(setQA(x,null,String(x.a).replace(/Practices tennis/i,'Practices the piano'),'piano_meaning_alignment'))stats.meaning_fixed++;
  }
}

stats.changed_rows=changed.size;
const newJson=JSON.stringify(all);
html=html.slice(0,m.index)+m[0].replace(m[1],newJson)+html.slice(m.index+m[0].length);
fs.writeFileSync(HTML,html);
fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),...stats},null,2)+'\n');
console.log(JSON.stringify(stats,null,2));
if(!stats.changed_rows) throw new Error('repair made no changes');
