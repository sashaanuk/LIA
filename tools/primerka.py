"""Примерка айдентики: две копии лендинга с новыми шрифтами и логотипом.

Берёт index.html и собирает рядом primerka-1.html (тонкий логотип со звездой)
и primerka-2.html (жирный логотип). Сам index.html не меняется.
Запуск из корня репозитория: python3 tools/primerka.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Логотипы из файлов дизайнера, обрезаны по содержимому. fill=currentColor — цвет берётся из текста.
LOGO_THIN = (
    '<svg class="lia-logo lia-logo--thin" viewBox="60 14 414 270.62" role="img" aria-label="LIA">'
    '<path d="M81.03,165.55v103.99c0,2.79,2.26,5.04,5.04,5.04h72.06c2.79,0,5.04,2.26,5.04,5.04l0,0c0,2.79-2.26,5.04-5.04,5.04H72.11c-2.79,0-5.04-2.26-5.04-5.04V165.55c0-2.79,2.26-5.04,5.04-5.04h3.88C78.77,160.51,81.03,162.76,81.03,165.55z"/>'
    '<path d="M415.21,163.62l52.150,112.62c1.77,3.83-1.02,8.2-5.24,8.2h-2.27c-2.25,0-4.29-1.31-5.24-3.35l-14.77-31.91c-0.94-2.04-2.99-3.35-5.24-3.35h-59.35c-2.26,0-4.31,1.32-5.25,3.37l-14.58,31.86c-0.94,2.05-2.99,3.37-5.25,3.37h-1.95c-4.24,0-7.03-4.42-5.22-8.25l53.46-112.62c0.96-2.01,2.99-3.3,5.21-3.3h8.27C412.22,160.28,414.26,161.58,415.21,163.62zM429.96,227.630l-19.54-43.89c-2.02-4.53-8.44-4.58-10.52-0.07l-20.25,43.89c-1.76,3.83,1.03,8.19,5.240,8.19h39.8C428.87,235.75,431.66,231.45,429.96,227.63z"/>'
    '<path d="M288.6,165.15L288.6,165.15c0-2.69-2.18-4.87-4.87-4.87h-21.85h-13.96h-21.85c-2.69,0-4.87,2.18-4.87,4.87v0c0,2.69,2.18,4.87,4.87,4.87h16.98c2.69,0,4.87,2.18,4.87,4.87v94.96c0,2.69-2.18,4.87-4.87,4.87h-16.98c-2.69,0-4.87,2.18-4.87,4.87l0,0c0,2.69,2.18,4.87,4.87,4.87h21.85h13.96h21.85c2.69,0,4.87-2.18,4.87-4.87l0,0c0-2.69-2.18-4.87-4.87-4.870h-16.98c-2.69,0-4.87-2.18-4.87-4.87v-94.96c0-2.69,2.18-4.87,4.87-4.87h16.98C286.42,170.01,288.6,167.83,288.6,165.15z"/>'
    '<path class="lia-star" d="M348.69,55.2c-0.43-0.04-0.86-0.07-1.28-0.11c-1.3-0.11-2.64-0.23-3.97-0.28c-2.79-0.1-5.58-0.18-8.38-0.26c-4.55-0.13-9.26-0.26-13.88-0.49c-14.47-0.72-29.04-2.94-43.32-6.58c-7.35-1.88-12.23-6.07-14.94-12.83c-1.38-3.44-2.9-6.88-4.38-10.21c-0.52-1.17-1.04-2.34-1.55-3.51c-0.09-0.2-0.18-0.39-0.29-0.58c-0.18-0.33-0.55-0.5-0.92-0.43c-0.37,0.07-0.65,0.36-0.7,0.73c-0.1,0.72-0.13,1.43-0.15,2.12c-0.02,0.48-0.04,0.95-0.08,1.43c-0.16,1.73-0.3,3.46-0.44,5.2c-0.41,4.99-0.84,10.16-1.56,15.19c-0.76,5.3-4.84,9.42-10.16,10.25c-3.74,0.58-7.36,0.79-10.77,0.62c-6.67-0.34-13.45-0.8-20.01-1.24c-5.04-0.34-10.25-0.7-15.38-0.99c-9.82-0.57-34.95-0.52-36.28,1.66c-0.11,0.19-0.12,0.39,0,0.59l0.05,0.09l0.09,0.04c0.58,0.23,1.17,0.35,1.81,0.38c2.96,0.12,5.93,0.23,8.89,0.33c5.82,0.21,11.84,0.43,17.75,0.73c14.6,0.74,29.16,2.97,43.3,6.62c7.13,1.84,11.9,5.91,14.59,12.43c1.13,2.75,2.3,5.43,3.19,7.45c0.17,0.39,0.34,0.77,0.52,1.16c0.29,0.66,0.59,1.31,0.87,1.97c0.58,1.37,1.2,2.74,1.84,4.08c0.05,0.1,0.09,0.19,0.14,0.26c0.15,0.24,0.37,0.35,0.67,0.35c0,0,0,0,0.01,0c0.3,0,0.55-0.14,0.7-0.38c0.18-0.3,0.17-0.65,0.16-0.95c0-0.09-0.01-0.18,0-0.27c0.03-0.69,0.07-1.37,0.12-2.06c0.07-0.92,0.15-1.83,0.23-2.75l0.23-2.74c0.21-2.48,0.42-5.05,0.67-7.57c0.33-3.43,0.66-6.27,1.04-8.94c0.74-5.21,4.21-8.56,9.79-9.42c3.86-0.6,7.76-0.8,11.58-0.61c4.63,0.23,9.34,0.59,13.89,0.93c6.95,0.52,14.14,1.060,21.22,1.19c8.25,0.15,16.65-0.16,24.77-0.47c3.37-0.13,6.86-0.26,10.29-0.36c0.47-0.01,0.84-0.39,0.84-0.86C349.49,55.61,349.15,55.24,348.69,55.2z"/>'
    '</svg>'
)
LOGO_BOLD = (
    '<svg class="lia-logo lia-logo--bold" viewBox="53 112 419 112" role="img" aria-label="LIA">'
    '<path d="M88.4,173.36v-52.21c0-3.88-3.14-7.02-7.02-7.02H62c-3.88,0-7.02,3.14-7.020,7.02v93.84c0,3.88,3.14,7.02,7.02,7.02h13.74H88.4h66.83c3.88,0,7.02-3.14,7.02-7.02v-12.7c0-3.88-3.14-7.02-7.02-7.02H110.3C98.2,195.27,88.4,185.46,88.4,173.36z"/>'
    '<path d="M299.85,221.78h-16.82c-4.37,0-7.92-3.55-7.92-7.92v-91.71c0-4.37,3.55-7.92,7.92-7.92h16.82c4.37,0,7.92,3.55,7.92,7.92v91.71C307.77,218.23,304.22,221.78,299.85,221.78z"/>'
    '<path d="M442.28,222.08h20.9c5.38,0,8.76-5.79,6.12-10.47l-50.29-89.14c-2.87-5.09-8.27-8.24-14.11-8.24h-24.52c-5.85,0-11.24,3.15-14.11,8.24l-50.29,89.140c-2.64,4.68,0.74,10.47,6.12,10.47h20.9c2.58,0,4.96-1.42,6.18-3.7l6.64-12.35c1.22-2.28,3.6-3.7,6.18-3.7h61.27c2.58,0,4.96,1.42,6.18,3.7l6.64,12.35C437.32,220.66,439.69,222.08,442.28,222.08zM373.48,173.2l15.08-28.02c1.75-3.25,6.41-3.25,8.15,0l15.08,28.02c1.66,3.080-0.57,6.82-4.08,6.82h-30.15C374.05,180.02,371.82,176.28,373.48,173.2z"/>'
    '</svg>'
)

FONT_FACES = """
@font-face{font-family:'Raleway';src:url('fonts/Raleway.ttf') format('truetype');font-weight:100 900;font-style:normal;font-display:swap}
@font-face{font-family:'IBM Plex Mono';src:url('fonts/IBMPlexMono-Regular.ttf') format('truetype');font-weight:400;font-style:normal;font-display:swap}
"""

# Правила из PDF «Логотип и основы айдентики», слайд «Шрифты».
# Трекинг в Illustrator — тысячные доли кегля: 40 → 0.04em, −10 → −0.01em, 90 → 0.09em, 20 → 0.02em.
TYPE_CSS = """
:root{--f-sans:'Raleway','Helvetica Neue',Helvetica,Arial,sans-serif;--f-mono:'IBM Plex Mono',ui-monospace,Menlo,monospace}
/* Основной текст: Raleway Regular, трекинг 20 */
body>div:first-of-type{font-family:var(--f-sans) !important;letter-spacing:.02em}
/* Заголовки: Raleway SemiBold, трекинг −10 */
h1,h2,h3,.ht-a p,.why-card h3,.step-now,.duo-name{font-family:var(--f-sans) !important;font-weight:600 !important;letter-spacing:-0.01em !important}
/* Главный заголовок: по PDF 53pt при тексте 19pt — чуть меньше, чем сейчас на сайте, иначе «бренда.» с разрядкой упирается в карточку */
h1[data-split]{font-size:clamp(34px,3.8vw,54px) !important}
/* Акцентное слово в главном заголовке («бренда.»): Light, трекинг 90 */
h1[data-split]>span:last-child>.w:last-child>span,h1[data-split]>span:last-child>.w:last-child{font-weight:300 !important;letter-spacing:.09em}
/* Подписи: IBM Plex Mono Regular, трекинг 40 */
.msg-time,.ht-meta,.stage-label,.step-meta,.b-note,.ds-lbl,.mc-lbl,.tips-h,.tip figcaption,.sign-name,.voice span,.lia-anno>span:last-child,.ex-tr{font-family:var(--f-mono) !important;font-weight:400 !important;letter-spacing:.04em !important}
/* Кнопки и меню: IBM Plex Mono Regular, трекинг 40, строчными — как в макете */
.jh-link,.jh-btn-in,.btn-dark,.btn-light,.jh-mlink,.ben-tab{font-family:var(--f-mono) !important;font-weight:400 !important;letter-spacing:.04em !important;text-transform:lowercase}
.jh-link,.jh-btn-in{font-size:15px !important}
.btn-dark,.btn-light{font-size:15px !important}
/* Логотип в шапке и подвале */
.jh-logo{letter-spacing:0 !important;margin-right:0 !important;top:0 !important;display:flex !important;align-items:center;line-height:0 !important}
.lia-logo{display:block;width:auto;fill:currentColor;overflow:visible}
.jh-logo .lia-logo--thin{height:40px}
.jh-logo .lia-logo--bold{height:22px}
.ft-logo .lia-logo--thin{height:46px}
.ft-logo .lia-logo--bold{height:26px}
@media (max-width:980px){.jh-logo .lia-logo--thin{height:34px}.jh-logo .lia-logo--bold{height:19px}}
/* Метка «это примерка», чтобы не спутать с основным сайтом */
.try-badge{position:fixed;left:12px;bottom:12px;z-index:9998;padding:6px 10px;border-radius:8px;background:#436DEE;color:#fff;font:400 12px/1.2 var(--f-mono);letter-spacing:.04em}
"""


# Вариант 1: меню стоит на одной линии с низом букв логотипа.
# У SVG базовая линия — его нижний край (viewBox обрезан ровно по низу букв), у меню — базовая линия текста.
ALIGN_BOTTOM = """
.jh-left{align-items:baseline !important}
/* Логотип — строчный элемент на базовой линии: тогда базовая линия ссылки-логотипа ровно по низу букв */
.jh-logo{display:block !important;line-height:normal !important}
.jh-logo .lia-logo{display:inline-block;vertical-align:baseline}
"""


# Первый экран: переписка на карточке с зернистым градиентом, реплики — баблы (референс от 12.11).
# Вопрос владельца — прозрачный бабл с белой обводкой справа, ответ LIA — белый бабл слева, под ним плашка со звездой.
_STAR_D = re.search(r'class="lia-star" d="([^"]+)"', LOGO_THIN).group(1)
HERO_OLD_START = '<span class="ht-meta" aria-hidden="true">'
HERO_OLD_END = '</figure>'
HERO_NEW = (
    '<div class="ht2" aria-hidden="true">'
    '<span class="ht2-who">владелец студии</span>'
    '<div class="ht2-b ht2-out">Кто ответит моим гостям в&nbsp;нерабочее&nbsp;время?</div>'
    '<div class="ht2-b ht2-in">AI-администратор для&nbsp;студий лазерной эпиляции на&nbsp;YCLIENTS</div>'
    '<div class="ht2-pill"><span class="ht2-ico"><svg viewBox="170 14 184 76"><path d="' + _STAR_D + '"/></svg></span>LIA, 23:47</div>'
    '</div>\n'
)
_GRAIN = ("url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>"
          "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/>"
          "<feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .6 0'/></filter>"
          "<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")")
HERO_CSS = """
@media (min-width:981px){.hero-grid{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr) !important}}
.hero-talk{max-width:540px}
.ht2{position:relative;isolation:isolate;overflow:hidden;display:flex;flex-direction:column;justify-content:center;gap:12px;
  min-height:clamp(420px,36vw,520px);padding:clamp(28px,3vw,44px);border-radius:24px;color:#fff;
  background:
    radial-gradient(90% 70% at 8% 0%,rgba(190,204,212,.95) 0%,rgba(190,204,212,0) 60%),
    radial-gradient(70% 60% at 30% 85%,rgba(67,109,238,.55) 0%,rgba(67,109,238,0) 70%),
    linear-gradient(118deg,#93A6B3 0%,#6A7F92 24%,#46588A 46%,#2E336E 62%,#171A33 82%,#0A0B12 100%);
  box-shadow:0 40px 80px -40px rgba(10,12,30,.6)}
.ht2::before{content:"";position:absolute;inset:-20%;z-index:-1;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.18) 42%,transparent 55%),linear-gradient(100deg,transparent 52%,rgba(140,120,255,.22) 62%,transparent 72%);filter:blur(18px)}
.ht2::after{content:"";position:absolute;inset:0;z-index:-1;background-image:GRAIN;background-size:220px;mix-blend-mode:overlay;opacity:.55;pointer-events:none}
.ht2-who{align-self:flex-end;margin-right:6px;font:400 12px/1.2 var(--f-mono);letter-spacing:.04em;color:rgba(255,255,255,.72)}
.ht2-b{max-width:86%;border-radius:22px;padding:11px 18px;font-size:var(--fs-body);line-height:1.4;letter-spacing:.01em}
.ht2-out{align-self:flex-end;border:1.5px solid rgba(255,255,255,.72);background:rgba(255,255,255,.05);color:#fff;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.ht2-in{align-self:flex-start;background:#fff;color:#141414;padding:16px 20px;font-size:clamp(19px,1.6vw,23px);font-weight:600;line-height:1.2;letter-spacing:-0.01em;text-wrap:balance;box-shadow:0 10px 30px -12px rgba(0,0,0,.35)}
.ht2-pill{align-self:flex-start;display:inline-flex;align-items:center;gap:10px;padding:6px 16px 6px 6px;border-radius:999px;background:#fff;color:#141414;font-size:var(--fs-small);box-shadow:0 10px 30px -12px rgba(0,0,0,.35)}
.ht2-ico{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#436DEE}
.ht2-ico svg{width:18px;height:auto;fill:#fff}
html.js .ht2>*{opacity:0;transform:translateY(14px) scale(.98)}
html.js.ready .ht2>*{opacity:1;transform:none;transition:opacity .4s ease,transform .8s var(--spring)}
html.js.ready .ht2-who{transition-delay:.7s}
html.js.ready .ht2-out{transition-delay:.8s}
html.js.ready .ht2-in{transition-delay:1.5s}
html.js.ready .ht2-pill{transition-delay:2.1s}
@media (prefers-reduced-motion:reduce){html.js .ht2>*{opacity:1;transform:none;transition:none}}
@media (max-width:980px){.hero-talk{max-width:none;width:100%}.ht2{min-height:0;padding:28px 18px;border-radius:20px}.ht2-b{max-width:92%}}
""".replace('GRAIN', _GRAIN)


def build(logo: str, n: int, note: str, extra_css: str = '') -> None:
    t = (ROOT / 'index.html').read_text(encoding='utf-8')

    def rep(a: str, b: str, count: int = 1) -> None:
        nonlocal t
        assert t.count(a) == count, (a[:60], t.count(a))
        t = t.replace(a, b)

    rep('<title>', f'<meta name="robots" content="noindex">\n<title>Примерка {n} · ')
    rep('</style>\n</head>', FONT_FACES + TYPE_CSS + extra_css + '</style>\n</head>')
    rep('<a href="#top" class="jh-logo" aria-label="LIA, в начало страницы">LIA</a>',
        f'<a href="#top" class="jh-logo" aria-label="LIA, в начало страницы">{logo}</a>')
    rep('<span style="font-weight:500; font-size:var(--fs-intro); letter-spacing:0.5em">LIA</span>',
        f'<span class="ft-logo">{logo}</span>')
    # Первый экран: вместо тёмной карточки — градиент с баблами
    s = t.index(HERO_OLD_START); e = t.index(HERO_OLD_END, s)
    t = t[:s] + HERO_NEW + t[e:]
    t = t.replace('</style>\n</head>', HERO_CSS + '</style>\n</head>', 1)
    # Шрифт курсора-плашки и замера его ширины
    t = t.replace("font-family:Onest,'Helvetica Neue',Helvetica,Arial,sans-serif", 'font-family:var(--f-mono)')
    t = t.replace('font-family:Onest,"Helvetica Neue",Helvetica,Arial,sans-serif', 'font-family:"IBM Plex Mono",monospace')  # двойные кавычки: строка внутри JS в одинарных
    rep('</body>', f'<div class="try-badge" aria-hidden="true">примерка {n} · {note}</div>\n</body>')
    (ROOT / f'primerka-{n}.html').write_text(t, encoding='utf-8')
    print('ok', f'primerka-{n}.html')


build(LOGO_THIN, 1, 'тонкий логотип со звездой', ALIGN_BOTTOM)
build(LOGO_BOLD, 2, 'жирный логотип')
