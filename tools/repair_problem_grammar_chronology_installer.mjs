import fs from 'node:fs';

const installerPath = 'tools/install_problem_grammar_chronology.mjs';
let src = fs.readFileSync(installerPath, 'utf8');
const startNeedle = 'const renderRe = ';
const endNeedle = 'html = html.replace(renderRe, block);';
const start = src.indexOf(startNeedle);
const endStart = src.indexOf(endNeedle, start);
if (start < 0 || endStart < 0) {
  if (src.includes('function replaceNamedFunction(source, name, replacement)')) {
    console.log('installer already repaired');
    process.exit(0);
  }
  throw new Error('old renderStageOptions replacement region not found');
}
const end = endStart + endNeedle.length;
const robust = String.raw`function replaceNamedFunction(source, name, replacement) {
  const re = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{');
  const m = re.exec(source);
  if (!m) throw new Error(name + ' function start not found');
  const start = m.index;
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let templateExprDepth = 0;
  for (let i = brace; i < source.length; i++) {
    const c = source[i];
    const n = source[i + 1] || '';
    if (lineComment) {
      if (c === '\\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && n === '/') { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\\\') { escaped = true; continue; }
      if (quote === '\u0060' && c === '$' && n === '{') {
        templateExprDepth++;
        i++;
        continue;
      }
      if (quote === '\u0060' && c === '}' && templateExprDepth > 0) {
        templateExprDepth--;
        continue;
      }
      if (c === quote && templateExprDepth === 0) quote = null;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === '\u0060') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return source.slice(0, start) + replacement + source.slice(i + 1);
    }
  }
  throw new Error(name + ' function end not found');
}
html = replaceNamedFunction(html, 'renderStageOptions', block);`;
src = src.slice(0, start) + robust + src.slice(end);
fs.writeFileSync(installerPath, src, 'utf8');
console.log(JSON.stringify({repaired:true, installerPath, replacement:'balanced function scanner'}, null, 2));
