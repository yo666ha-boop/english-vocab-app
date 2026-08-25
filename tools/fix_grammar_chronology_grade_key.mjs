import fs from 'node:fs';

const APP='problem-app/index.html';
const INSTALLER='tools/install_problem_grammar_chronology.mjs';
const oldText="return ((meta.sections?.[textbook] || {})[grade] || []);";
const newText="const gradeKey = String(grade ?? '').replace('中','');\n  return ((meta.sections?.[textbook] || {})[gradeKey] || []);";

function patch(path, requireChange=true) {
  let s=fs.readFileSync(path,'utf8');
  if(s.includes(newText)) return false;
  if(!s.includes(oldText)) {
    if(requireChange) throw new Error(`${path}: grammarChronologySections grade-key baseline not found`);
    return false;
  }
  s=s.replace(oldText,newText);
  fs.writeFileSync(path,s,'utf8');
  return true;
}

const appChanged=patch(APP,true);
const installerChanged=patch(INSTALLER,true);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/PROBLEM_APP_GRAMMAR_CHRONOLOGY_GRADE_KEY_FIX.json',JSON.stringify({
  fixed_at_utc:new Date().toISOString(),
  appChanged,
  installerChanged,
  defect:"grammar chronology used 中1/中2/中3 directly against meta.sections numeric grade keys 1/2/3",
  fix:"normalize currentGrade by removing 中 before meta.sections lookup",
  questionIdHardcode:false,
  rootIndexModified:false
},null,2)+'\n');
console.log(JSON.stringify({appChanged,installerChanged},null,2));
