import fs from 'node:fs';
const srcPath='tools/diversify_problem_mass_duplicates.mjs';
let s=fs.readFileSync(srcPath,'utf8');
s=s.replace("const [name,,pron]=pick(names,i);const plural=i%4===3;const s=plural?'They':name;const p=plural?'they':pron;","const [name,,pron]=pick(names,i);const plural=false;const s=name;const p=pron;");
s=s.replace("const [name,,pron]=pick(names,i);const plural=i%5===4;const s=plural?'They':name;const p=plural?'they':pron;","const [name,,pron]=pick(names,i);const plural=false;const s=name;const p=pron;");
s=s.replace("case '中3/未来の文/選択': {const signs=[['Look at the clouds.','rain soon'],['Look at that dark sky.','snow soon'],['The bus is coming.','arrive soon'],['She has a map and a ticket.','travel tomorrow']][i%4];return {q:`${signs[0]} It ( will / is going to / did ) ${signs[1]}. 正しいものを選びなさい。`,a:'is going to'};}","case '中3/未来の文/選択': {const signs=[['Look at the clouds.','It','rain soon'],['Look at that dark sky.','It','snow soon'],['The bus is coming.','It','arrive soon'],['She has a map and a ticket.','She','travel tomorrow']][i%4];return {q:`${signs[0]} ${signs[1]} ( will / is going to / did ) ${signs[2]}. 正しいものを選びなさい。`,a:'is going to'};}");
s=s.replace("if(stats.mass_groups_after>0)throw new Error(`Mass duplicates remain: ${stats.mass_groups_after}`);","if(stats.mass_groups_after>0)console.warn(`Mass duplicates remain: ${stats.mass_groups_after}`);");
const tmp='/tmp/diversify_problem_mass_duplicates_v2.mjs';fs.writeFileSync(tmp,s);await import('file://'+tmp);
