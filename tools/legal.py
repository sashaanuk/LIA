"""Собирает страницы документов в стиле лендинга из текстов в docs/legal/.

  docs/legal/privacy.md  ->  next/privacy/index.html   (адрес: …/next/privacy/)
  docs/legal/terms.md    ->  next/terms/index.html     (адрес: …/next/terms/)

Шапка, значок LIA и футер берутся из next/index.html, поэтому меняются вместе с лендингом.
Чтобы обновить документ: поправьте .md и запустите  python3 tools/legal.py
Незаполненные места в тексте пишутся в квадратных скобках — [e-mail] — и на странице видны в пунктирной рамке.
"""
import html
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMAIN = 'lia.space'
DOCS = [
    # (файл, папка страницы, короткое имя для ссылки на соседний документ, подзаголовок)
    ('privacy.md', 'privacy', 'Политика конфиденциальности', 'Как ООО «МИССБЬЮТИ» обрабатывает и&nbsp;защищает персональные данные в&nbsp;сервисе&nbsp;LIA'),
    ('terms.md', 'terms', 'Пользовательское соглашение', 'Публичная оферта ООО «МИССБЬЮТИ» на&nbsp;доступ к&nbsp;сервису&nbsp;LIA'),
]

landing = open(os.path.join(ROOT, 'next/index.html'), encoding='utf-8').read()
ver = re.search(r'style\.css\?v=([\w.]+)', landing).group(1)


def cut(s, start, end):
    a = s.index(start)
    return s[a:s.index(end, a) + len(end)]


def relink(block, here):
    """Ссылки лендинга «#раздел» ведут обратно на лендинг, ссылки на документы — на их страницы."""
    def fix(m):
        tag, t = m.group(1), m.group(2)
        if t in ('privacy', 'terms'):
            cur = ' aria-current="page"' if t == here else ''
            return f'{tag}href="../{t}/"{cur}'
        if t == 'top':
            return f'{tag}href="../"'
        return f'{tag}href="../#{t}"'
    # только ссылки <a>: значок LIA (<use href="#logo">) остаётся как есть
    return re.sub(r'(<a\b[^>]*?)href="#?(privacy|terms|[\w-]+)/?"', lambda m: fix(m) if ('#' in m.group(0) or m.group(2) in ('privacy', 'terms')) else m.group(0), block)


symbols = cut(landing, '<svg width="0" height="0"', '</svg>')
header = cut(landing, '<header class="hdr" id="hdr">', '</header>')
footer = cut(landing, '<footer class="sec ft">', '</footer>')


def inline(t):
    t = t.replace('\\[', '\x01').replace('\\]', '\x02').replace('\\*', '\x03')
    t = t.replace('\x01домен LIA\x02/privacy', '\x04').replace('\x01домен LIA\x02', '\x05')
    t = html.escape(t, quote=False)
    # неразрывные пробелы после коротких слов и перед «LIA», чтобы строки не обрывались на предлоге
    # (до вставки тегов, чтобы не задеть «a href»)
    t = re.sub(r'(?<![\wА-Яа-яЁё])([А-Яа-яЁёA-Za-z]{1,2}) (?=\S)', '\\1&nbsp;', t)
    t = t.replace(' LIA', '&nbsp;LIA').replace('№ ', '№&nbsp;').replace('ст. ', 'ст.&nbsp;').replace('ч. ', 'ч.&nbsp;').replace('п. ', 'п.&nbsp;')
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = t.replace('\x03', '*')
    # [домен LIA]/privacy и просто [домен LIA] — настоящий домен; ссылка на политику ведёт на её страницу
    t = t.replace('\x04', f'<a href="../privacy/">{DOMAIN}/privacy</a>').replace('\x05', DOMAIN)
    # остальные квадратные скобки — места, которые ещё надо заполнить
    t = re.sub('\x01(.*?)\x02', r'<mark class="todo">[\1]</mark>', t)
    return t


def table(rows):
    cells = [[c.strip() for c in r.strip().strip('|').split('|')] for r in rows]
    head, body = cells[0], [r for r in cells[2:]]
    if not any(head):  # таблица «название — значение» (реквизиты) — делаем списком пар
        out = ['<dl class="doc-req">']
        for k, v in body:
            out.append(f'<div><dt class="mono">{inline(k)}</dt><dd>{inline(v)}</dd></div>')
        return '\n'.join(out + ['</dl>'])
    out = ['<div class="doc-table"><table>', '<thead><tr>' + ''.join(f'<th class="mono lc">{inline(h)}</th>' for h in head) + '</tr></thead>', '<tbody>']
    for r in body:
        out.append('<tr>' + ''.join(f'<td data-label="{html.escape(h)}">{inline(c)}</td>' for h, c in zip(head, r)) + '</tr>')
    return '\n'.join(out + ['</tbody></table></div>'])


def parse(md):
    lines = md.split('\n')
    title, sections, cur, i = '', [], None, 0
    meta_date = ''
    while i < len(lines):
        ln = lines[i].rstrip()
        if ln.startswith('# '):
            title = ln[2:].strip()
        elif ln.startswith('## '):
            m = re.match(r'(\d+)\.\s*(.+)', ln[3:].strip())
            cur = {'n': m.group(1), 'title': m.group(2), 'html': []}
            sections.append(cur)
        elif re.match(r'^\w{3} \d{1,2}, \d{4} · @', ln):
            pass  # служебная строка из редактора («Nov 17, 2026 · @Sasha») на сайт не идёт
        elif ln.startswith('Редакция от'):
            meta_date = inline(ln.rstrip('.'))
        elif ln.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                rows.append(lines[i]); i += 1
            cur['html'].append(table(rows)); continue
        elif ln.startswith('- '):
            items = []
            while i < len(lines) and lines[i].startswith('- '):
                items.append(f'<li>{inline(lines[i][2:].strip().rstrip(";."))}</li>'); i += 1
            cur['html'].append('<ul class="doc-list">' + ''.join(items) + '</ul>'); continue
        elif ln.startswith('*') and ln.endswith('*') and not ln.startswith('**'):
            cur['html'].append(f'<p class="doc-note">{inline(ln[1:-1])}</p>')
        elif ln.strip():
            m = re.match(r'^(\d+\.\d+\.)\s+(.*)$', ln)
            if m:
                cur['html'].append(f'<p class="cl"><span class="cl-n mono">{m.group(1)}</span><span>{inline(m.group(2))}</span></p>')
            else:
                cur['html'].append(f'<p>{inline(ln)}</p>')
        i += 1
    return title, sections, meta_date


for fname, slug, short, lead in DOCS:
    title, sections, meta_date = parse(open(os.path.join(ROOT, 'docs/legal', fname), encoding='utf-8').read())
    name = re.sub(r'\s*\(оферта\)', '', title).replace(' сервиса LIA', '')
    other = [d for d in DOCS if d[1] != slug][0]
    toc = '\n'.join(f'<li><a href="#p{s["n"]}"><span class="mono">{int(s["n"]):02d}</span>{inline(s["title"])}</a></li>' for s in sections)
    body = '\n'.join(
        f'<section class="doc-sec" id="p{s["n"]}">\n<h2><span class="mono">{int(s["n"]):02d}</span>{inline(s["title"])}</h2>\n' + '\n'.join(s['html']) + '\n</section>'
        for s in sections)
    page = f'''<!doctype html>
<!-- Страница собрана скриптом tools/legal.py из docs/legal/{fname}. Править текст — там, потом запустить скрипт. -->
<html lang="ru" data-tone="laser">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(name)} — LIA</title>
<meta name="description" content="{html.escape(title)}: ООО «МИССБЬЮТИ», {DOMAIN}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#FFFFFF">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml">
<link rel="preload" href="../../fonts/Raleway.ttf" as="font" type="font/ttf" crossorigin>
<link rel="preload" href="../../fonts/IBMPlexMono-Regular.ttf" as="font" type="font/ttf" crossorigin>
<link rel="stylesheet" href="../style.css?v={ver}">
</head>
<body class="doc-page">

{symbols}

{relink(header, slug)}

<main>
<section class="sec doc-top">
<div class="wrap">
<a class="link doc-back mono lc" href="../"><i aria-hidden="true">←</i> На главную</a>
<h1>{inline(name)}</h1>
<p class="lead">{lead}</p>
<p class="doc-meta mono lc"><span>{meta_date}</span><a href="../{other[1]}/">{other[2]} <i aria-hidden="true">→</i></a></p>
</div>
</section>

<section class="sec doc">
<div class="wrap">
<div class="doc-grid">
<nav class="doc-toc" aria-label="Содержание">
<p class="mono lc">Содержание</p>
<ol>
{toc}
</ol>
</nav>
<article class="doc-body">
{body}
</article>
</div>
</div>
</section>
</main>

{relink(footer, slug)}

<script>
/* шапка как на лендинге: прячется при прокрутке вниз, возвращается белой плашкой при прокрутке вверх; меню-бургер */
(function () {{
  var hdr = document.getElementById('hdr'), burger = hdr.querySelector('.burger'), lastY = scrollY;
  function close() {{ hdr.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }}
  addEventListener('scroll', function () {{
    var y = scrollY;
    if (y < 120) hdr.classList.remove('is-down', 'is-up');
    else if (y > lastY + 4) {{ hdr.classList.add('is-down'); hdr.classList.remove('is-up'); close(); }}
    else if (y < lastY - 4) {{ hdr.classList.remove('is-down'); hdr.classList.add('is-up'); }}
    lastY = y;
  }}, {{ passive: true }});
  burger.addEventListener('click', function () {{ var o = hdr.classList.toggle('is-open'); burger.setAttribute('aria-expanded', String(o)); }});
  document.addEventListener('click', function (e) {{ if (!hdr.contains(e.target)) close(); }});
}})();
</script>
</body>
</html>
'''
    os.makedirs(os.path.join(ROOT, 'next', slug), exist_ok=True)
    open(os.path.join(ROOT, 'next', slug, 'index.html'), 'w', encoding='utf-8').write(page)
    print('next/' + slug + '/index.html', len(sections), 'разделов')
