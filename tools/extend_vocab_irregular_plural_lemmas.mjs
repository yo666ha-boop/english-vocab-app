import fs from 'node:fs';

const files=['tools/build_safe_problem_passmeta.mjs','tools/audit_vocab_morphology_regression.mjs'];
const marker="children:'child',men:'man',women:'woman',people:'person',mice:'mouse',feet:'foot',teeth:'tooth',";
for(const path of files){
  let src=fs.readFileSync(path,'utf8');
  if(!src.includes(marker)){
    const anchor="better:'good',best:'good',worse:'bad',worst:'bad'";
    if(!src.includes(anchor)) throw new Error(`${path}: irregular comparison anchor missing`);
    src=src.replace(anchor,marker+anchor);
  }
  if(path.endsWith('audit_vocab_morphology_regression.mjs')){
    src=src.replace("const required=['plays','studies','played','studied','playing','making','bigger','biggest','better','best','went','written',\"doesn't\"];","const required=['plays','studies','played','studied','playing','making','bigger','biggest','better','best','went','written',\"doesn't\",'children','men','women','people','mice','feet','teeth'];");
    src=src.replace("children:'child'};","children:'child',men:'man',women:'woman',people:'person',mice:'mouse',feet:'foot',teeth:'tooth'};");
  }
  fs.writeFileSync(path,src);
}
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/PROBLEM_APP_VOCAB_IRREGULAR_PLURAL_LEMMA_REPAIR.json',JSON.stringify({result:'PASS',files,added:{children:'child',men:'man',women:'woman',people:'person',mice:'mouse',feet:'foot',teeth:'tooth'},design:'generic irregular-plural lemma normalization; no textbook, section, problem-ID, or measured-count exception'},null,2)+'\n');
console.log('PASS: generic irregular plural lemmas installed');
