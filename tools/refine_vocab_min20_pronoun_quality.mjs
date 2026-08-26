import fs from 'node:fs';
const files=['problem-app/index.html','tools/install_vocab_safe_fallback_v1.mjs','tools/extend_vocab_safe_fallback_min20.mjs'];
const replacements=[
  ["cap+' is my friend. I often talk with (      ).'","'主格 '+cap+' に対応する目的格を空所に書きなさい。 I often talk with (      ).'"],
  ["cap+' is my friend. I often talk with '+r.wrong+'. 2文目の代名詞の誤りを直しなさい。',''+cap+' is my friend. I often talk with '+r.obj+'.'",null]
];
for(const path of files){
  let text=fs.readFileSync(path,'utf8');
  const old1="cap+' is my friend. I often talk with (      ).'";
  const new1="'主格 '+cap+' に対応する目的格を空所に書きなさい。 I often talk with (      ).'";
  if(text.includes(old1)) text=text.replace(old1,new1);
  const old2="cap+' is my friend. I often talk with '+r.wrong+'. 2文目の代名詞の誤りを直しなさい。',cap+' is my friend. I often talk with '+r.obj+'.')";
  const new2="'主格 '+cap+' に対応する目的格を使うように誤りを直しなさい。 I often talk with '+r.wrong+'.','I often talk with '+r.obj+'.')";
  if(text.includes(old2)) text=text.replace(old2,new2);
  if(text.includes(old1)||text.includes(old2)) throw new Error(path+': pronoun quality replacement incomplete');
  fs.writeFileSync(path,text);
  console.log(path+': refined');
}
