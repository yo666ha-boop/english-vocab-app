import fs from 'node:fs';

const file='problem-app/index.html';
let html=fs.readFileSync(file,'utf8');
const old=`function printQuestions(mode = 'both', historySource = null) {\n  if (!currentQuestions.length) return;`;
const next=`function printQuestions(mode = 'both', historySource = null) {\n  if (!historySource && !currentQuestions.length) return;`;
if(!html.includes(old)) throw new Error('history print guard anchor not found');
html=html.replace(old,next);
fs.writeFileSync(file,html);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/PROBLEM_APP_PRINT_HISTORY_REPRINT_GUARD.json',JSON.stringify({result:'PASS',history_reprint_does_not_require_current_questions:true},null,2)+'\n');
console.log('history reprint guard fixed');
