import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const pats=['major_unit','section','textbook','grade','テスト作成','暗記プリント','current_confirmed','dataset','問題数','英語→日本語'];
let out='PAGE FILTER CONTEXT\n';
for(const p of pats){
  out+=`\n===== ${p} =====\n`;
  let from=0,count=0;
  while(count<8){
    const i=html.indexOf(p,from); if(i<0) break;
    out+=html.slice(Math.max(0,i-450),Math.min(html.length,i+850)).replace(/\s+/g,' ')+'\n---\n';
    from=i+p.length; count++;
  }
}
const ids=[...html.matchAll(/id=["']([^"']+)["']/g)].map(m=>m[1]);
out+='\n===== IDS =====\n'+ids.join('\n')+'\n';
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/PAGE_FILTER_CONTEXT.txt',out,'utf8');
