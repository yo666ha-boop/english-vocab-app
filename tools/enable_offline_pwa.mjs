import fs from 'node:fs';

const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');

const headMarker = '<meta name="mikami-offline-pwa" content="v1">';
const bodyMarker = 'data-mikami-sw="v1"';

if (!html.includes(headMarker)) {
  const headClose = html.indexOf('</head>');
  if (headClose < 0) throw new Error('</head> not found');
  const headInsert = [
    headMarker,
    '<link rel="manifest" href="./manifest.webmanifest">',
    '<meta name="theme-color" content="#1f6feb">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    '<meta name="apple-mobile-web-app-title" content="みかみ塾 英単語">'
  ].join('\n') + '\n';
  html = html.slice(0, headClose) + headInsert + html.slice(headClose);
}

if (!html.includes(bodyMarker)) {
  const bodyClose = html.lastIndexOf('</body>');
  if (bodyClose < 0) throw new Error('</body> not found');
  const bodyInsert = `\n<script ${bodyMarker}>\nif ('serviceWorker' in navigator) {\n  window.addEventListener('load', () => {\n    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(err => console.error('Service Worker registration failed:', err));\n  });\n}\n</script>\n`;
  html = html.slice(0, bodyClose) + bodyInsert + html.slice(bodyClose);
}

if (!html.includes('rel="manifest" href="./manifest.webmanifest"')) throw new Error('manifest link missing after patch');
if (!html.includes("navigator.serviceWorker.register('./sw.js'")) throw new Error('service worker registration missing after patch');

fs.writeFileSync(path, html);
console.log(JSON.stringify({status:'pass',manifest_link:true,service_worker_registration:true,bytes:Buffer.byteLength(html)}, null, 2));
