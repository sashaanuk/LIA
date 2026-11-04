#!/usr/bin/env node
// Локальный редактор текста лендинга: http://localhost:8788
// Показывает index.html без скриптов, каждый кусок текста можно поправить прямо на странице.
// «Сохранить» записывает правки обратно в index.html. На сайт они попадают только после git push.
const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PAGE = path.join(ROOT, 'index.html');
const PORT = 8788;
const TOKEN = /<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<svg\b[\s\S]*?<\/svg>|<[^>]+>|[^<]+/g;
const TYPES = { '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.js': 'text/javascript' };

const TOOLS = String.raw`
<style>
e-t{cursor:text;border-radius:3px;outline:1px dashed transparent;outline-offset:2px}
e-t:hover{outline-color:#436DEE}
e-t:focus{outline:2px solid #436DEE;background:rgba(67,109,238,.14)}
e-t.changed{background:rgba(255,214,0,.4);color:#000}
[hidden]:not([data-who="typing"]):not([data-hero="typing"]):not([data-hero="replay"]){display:revert !important}
.chat-stage{height:auto !important;overflow:visible !important}
.chat-stage .thread{position:static !important;height:auto !important;overflow:visible !important;-webkit-mask-image:none !important;mask-image:none !important}
#edit-bar{position:fixed;z-index:99999;left:50%;bottom:20px;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:10px 12px 10px 20px;border-radius:999px;background:#000;color:#fff;font:500 15px/1.2 Onest,Helvetica,Arial,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.35);white-space:nowrap}
#edit-bar button{min-height:40px;padding:0 18px;border:0;border-radius:999px;font:inherit;cursor:pointer}
#edit-save{background:#436DEE;color:#fff}#edit-save:disabled{background:#4A4A48;color:#AFAFAB;cursor:default}
#edit-undo{background:none;color:#fff}#edit-undo[hidden]{display:none !important}
</style>
<div id="edit-bar"><span id="edit-status">Кликните по тексту, чтобы поправить</span><button type="button" id="edit-undo" hidden>Отменить</button><button type="button" id="edit-save" disabled>Сохранить</button></div>
<script>
(() => {
  const REV = '__REV__';
  const items = [...document.querySelectorAll('e-t')];
  const start = new Map(items.map((el) => [el, el.textContent]));
  const status = document.getElementById('edit-status');
  const save = document.getElementById('edit-save');
  const undo = document.getElementById('edit-undo');
  const changed = () => items.filter((el) => el.textContent !== start.get(el));
  const refresh = () => {
    items.forEach((el) => el.classList.toggle('changed', el.textContent !== start.get(el)));
    const n = changed().length;
    status.textContent = n ? 'Изменено: ' + n : 'Кликните по тексту, чтобы поправить';
    save.disabled = !n;
    undo.hidden = !n;
  };
  items.forEach((el) => {
    el.contentEditable = 'plaintext-only';
    el.spellcheck = true;
    el.addEventListener('input', refresh);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
  });
  // ссылки и раскрывашки на странице-редакторе никуда не ведут
  document.addEventListener('click', (e) => {
    if (e.target.closest('#edit-bar')) return;
    if (e.target.closest('a,summary,button,label')) e.preventDefault();
  }, true);
  undo.addEventListener('click', () => { items.forEach((el) => { el.textContent = start.get(el); }); refresh(); });
  save.addEventListener('click', async () => {
    save.disabled = true;
    status.textContent = 'Сохраняю…';
    const edits = changed().map((el) => ({ id: +el.dataset.e, text: el.textContent }));
    try {
      const r = await fetch('/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rev: REV, edits }) });
      if (r.status === 409) { status.textContent = 'Файл изменился. Обновите страницу и повторите правки'; return; }
      if (!r.ok) throw new Error();
      location.reload();
    } catch (e) { status.textContent = 'Не сохранилось. Проверьте, что редактор запущен'; save.disabled = false; }
  });
  window.addEventListener('beforeunload', (e) => { if (changed().length && save.disabled === false) e.preventDefault(); });
})();
</script>
`;

// Куски видимого текста в <body>: [начало, конец] без пробелов по краям
function segments(source) {
  const found = [];
  TOKEN.lastIndex = source.indexOf('<body');
  for (let m; (m = TOKEN.exec(source));) {
    const raw = m[0];
    if (raw.startsWith('<') || !raw.trim()) continue;
    const start = m.index + (raw.length - raw.trimStart().length);
    found.push([start, start + raw.trim().length]);
  }
  return found;
}

const revOf = (source) => crypto.createHash('sha256').update(source).digest('hex').slice(0, 16);

function editablePage() {
  const source = fs.readFileSync(PAGE, 'utf8');
  let page = '', pos = 0;
  segments(source).forEach(([a, b], i) => {
    page += source.slice(pos, a) + '<e-t data-e="' + i + '">' + source.slice(a, b) + '</e-t>';
    pos = b;
  });
  page += source.slice(pos);
  page = page.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<details/g, '<details open');
  return page.replace('</body>', () => TOOLS.replace('__REV__', revOf(source)) + '</body>');
}

const toSource = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u00a0/g, '&nbsp;');

function send(res, code, body, type = 'text/html; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (req.method === 'POST' && url === '/save') {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      const data = JSON.parse(body);
      let source = fs.readFileSync(PAGE, 'utf8');
      if (data.rev !== revOf(source)) return send(res, 409, '{}', 'application/json');
      const spots = segments(source);
      data.edits.sort((x, y) => y.id - x.id).forEach((e) => {
        const [a, b] = spots[e.id];
        source = source.slice(0, a) + toSource(e.text) + source.slice(b);
      });
      fs.writeFileSync(PAGE, source);
      send(res, 200, '{}', 'application/json');
    });
    return;
  }
  if (url === '/' || url === '/index.html') return send(res, 200, editablePage());
  const file = path.resolve(ROOT, '.' + url);
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'Not found');
  send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
}).listen(PORT, '127.0.0.1', () => console.log('Редактор текста: http://localhost:' + PORT));
