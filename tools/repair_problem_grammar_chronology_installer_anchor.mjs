import fs from 'node:fs';

const path='tools/install_problem_grammar_chronology.mjs';
let s=fs.readFileSync(path,'utf8');
if(s.includes("const renderStart = html.indexOf('function renderStageOptions')")) {
  console.log('installer anchor already resilient');
  process.exit(0);
}
const start=s.indexOf('const renderRe = ');
if(start<0) throw new Error('old renderRe anchor not found');
const endMarker='html = html.replace(renderRe, block);';
const end0=s.indexOf(endMarker,start);
if(end0<0) throw new Error('old renderRe replacement end not found');
const end=end0+endMarker.length;
const replacement=String.raw`const renderStart = html.indexOf('function renderStageOptions');
if (renderStart < 0) throw new Error('renderStageOptions function not found');
let renderEnd = html.indexOf('\n}\n\nfunction renderTypeOptions', renderStart);
if (renderEnd < 0) renderEnd = html.indexOf('\r\n}\r\n\r\nfunction renderTypeOptions', renderStart);
if (renderEnd < 0) throw new Error('renderStageOptions end anchor not found');
renderEnd += html[renderEnd] === '\r' ? 3 : 2;
html = html.slice(0, renderStart) + block + html.slice(renderEnd);`;
s=s.slice(0,start)+replacement+s.slice(end);
fs.writeFileSync(path,s,'utf8');
console.log('repaired chronology installer anchor');
