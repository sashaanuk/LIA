/* =====================================================================
   LIA · новая версия лендинга. Движение страницы.
   Все тексты лежат в index.html. Этот файл только «проигрывает» их:
   печатает ответы, двигает облако, дорисовывает линии.
   Если в системе включено «уменьшить движение», всё показывается сразу.
   ===================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = () => innerWidth < 900;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // Запускает действие, когда блок появился на экране (анимации не идут «за кадром»)
  function onView(els, cb, { threshold = 0.25, margin = '0px', out = null } = {}) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { cb(e.target); if (!out) io.unobserve(e.target); }
        else if (out) out(e.target);
      });
    }, { threshold, rootMargin: margin });
    els.forEach((el) => io.observe(el));
  }

  // Делит текст на слова: нужно, чтобы слова выезжали или темнели по одному
  function splitWords(el, start = 0) {
    const words = el.textContent.trim().split(/[ \n\t]+/);
    el.innerHTML = words.map((w, i) => `<span class="w" style="--i:${start + i}">${w}</span>`).join(' ');
    return words.length;
  }

  /* ===== Линии блоков дорисовываются, когда блок появляется ===== */
  onView($$('.sec'), (el) => el.classList.add('in'), { threshold: 0, margin: '0px 0px -12% 0px' });
  onView($$('[data-in]'), (el) => el.classList.add('in'), { threshold: 0.3 });

  /* =====================================================================
     Живой зернистый градиент (WebGL). Браузер рисует его сам.
     Цвета берутся из style.css (--deep, --sky, --accent), поэтому при смене
     data-tone в index.html облако перекрашивается вместе с кнопками.
     ===================================================================== */
  const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uT; uniform vec2 uM; uniform float uK;
uniform vec3 uNight; uniform vec3 uDeep; uniform vec3 uBlue; uniform vec3 uSky; uniform vec3 uViolet; uniform vec3 uLilac; uniform vec3 uLight;
uniform float uHero; uniform float uPortrait; uniform float uGrain; uniform float uZoom;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<4;i++){ v += a*noise(p); p = p*2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - 0.5) * asp, uv.y - 0.5);
  vec2 m = vec2((uM.x - 0.5) * asp, uM.y - 0.5);
  vec2 d = p - m; float g = uK * exp(-dot(d, d) * 6.0);
  float a = g * 1.6; float c = cos(a), s = sin(a);
  p = m + mat2(c, -s, s, c) * d;                          // ткань закручивается за курсором
  float t = uT * 0.07;
  vec2 q = p * uZoom + vec2(0.35, -0.15);
  for (int i = 1; i < 5; i++) { float fi = float(i);      // складки: координаты несколько раз «сминаются» синусами
    q.x += 0.55 / fi * sin(fi * 1.7 * q.y + t + fi * 1.3);
    q.y += 0.50 / fi * cos(fi * 1.5 * q.x - t * 0.8 + fi * 2.1);
  }
  float n = fbm(q * 0.9 + vec2(t * 0.3, 0.0));
  float a1 = 0.5 + 0.5 * sin(q.x * 1.3 + q.y * 0.5 + n * 2.0);
  float a2 = 0.5 + 0.5 * sin(q.y * 1.7 - q.x * 0.6 + 1.7 + n * 1.5);
  float a3 = 0.5 + 0.5 * sin((q.x + q.y) * 1.1 + 3.1 - n);
  float w  = 0.5 + 0.5 * sin(q.x * 2.9 - q.y * 2.1 + n * 3.5);    // складка: 0 — ложбина, 1 — гребень
  float sheen = pow(w, 4.0);                              // атласный блик на гребне
  vec3 hue = mix(uDeep, uBlue, a1);
  hue = mix(hue, uViolet, smoothstep(0.40, 0.95, a2) * 0.42);
  vec3 deep = mix(uNight, hue, smoothstep(-0.10, 0.50, w - 0.35 * a3));   // в ложбинах тень
  deep = mix(deep, mix(uSky, uLilac, a2), sheen * mix(0.32, 0.78, uHero)); // на гребнях свет
  deep += smoothstep(0.972, 1.0, w) * 0.16;               // тонкая светлая «вспышка» по самому гребню
  vec3 col = deep;
  if (uHero > 0.5) {                                      // первый экран: под текстом светлая пастель, дальше глубокий шёлк
    vec3 pastel = mix(uLight, uSky, 0.15 + 0.50 * sheen);
    pastel = mix(pastel, uLilac, 0.40 * smoothstep(0.40, 1.0, a2));
    pastel = mix(pastel, vec3(1.0), 0.35 * smoothstep(0.60, 1.0, a3));
    float edge = uPortrait > 0.5 ? (0.40 - uv.y) : (uv.x - 0.565 - 0.9 * smoothstep(0.72, 1.0, uv.y));
    edge += (n - 0.5) * 0.30 + 0.07 * sin(q.y * 1.4 + t);
    col = mix(pastel, deep, smoothstep(-0.08, 0.16, edge));
  }
  col += g * 0.14;                                        // под курсором светлее
  vec2 gp = gl_FragCoord.xy + mod(floor(uT * 12.0), 50.0) * vec2(3.7, 5.3);
  col += (fract(sin(dot(gp, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * uGrain;   // крупное зерно
  gl_FragColor = vec4(col, 1.0);
}`;
  const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  const cssColor = (name) => {
    const v = getComputedStyle(root).getPropertyValue(name).trim().replace('#', '');
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  };

  // Шесть фонов для цветных карточек. Палитры подобраны по скриншотам, сами фоны рисует наш шейдер «шёлк».
  // night — тень в складках, deep / blue / violet — основные тона, sky / lilac — блики на гребнях,
  // sheen — сила бликов, zoom — крупность складок, t — «кадр» (меняет рисунок).
  const BACKDROPS = {
    steel: { night: '#0A0E1C', deep: '#1C2A4A', blue: '#3F5F86', violet: '#5E7FA0', sky: '#9DB9C4', lilac: '#C9D6DA', sheen: 0.30, zoom: 1.05, t: 131 },
    green: { night: '#0A1512', deep: '#1F4A3C', blue: '#3F7A62', violet: '#2E6451', sky: '#8FC0A6', lilac: '#B5C4BE', sheen: 0.30, zoom: 1.00, t: 47 },
    terra: { night: '#0F0706', deep: '#4A1A13', blue: '#A84A36', violet: '#D6705A', sky: '#B6B1FF', lilac: '#EFE6F4', sheen: 0.38, zoom: 0.90, t: 212 },
    edu:   { night: '#12160E', deep: '#2F5A32', blue: '#F0913E', violet: '#E4572E', sky: '#F6C98A', lilac: '#7FA6A8', sheen: 0.30, zoom: 0.95, t: 88 },
    peach: { night: '#9A3415', deep: '#DE5F2A', blue: '#F0894B', violet: '#F4A261', sky: '#F9D29A', lilac: '#FCE5BF', sheen: 0.34, zoom: 0.85, t: 303 },
    ember: { night: '#6E170E', deep: '#C0281C', blue: '#E87A2A', violet: '#D9482A', sky: '#8E9BB5', lilac: '#C9CBD6', sheen: 0.34, zoom: 0.95, t: 170 },
  };
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

  // Собирает программу для видеокарты
  function silk(gl) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ['uRes', 'uT', 'uM', 'uK', 'uNight', 'uDeep', 'uBlue', 'uSky', 'uViolet', 'uLilac', 'uLight', 'uHero', 'uPortrait', 'uGrain', 'uZoom']
      .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    return U;
  }
  // Передаёт видеокарте цвета одной палитры
  function tone(gl, U, pal) {
    gl.uniform3fv(U.uNight, rgb(pal.night));
    gl.uniform3fv(U.uDeep, rgb(pal.deep));
    gl.uniform3fv(U.uBlue, rgb(pal.blue));
    gl.uniform3fv(U.uViolet, rgb(pal.violet));
    gl.uniform3fv(U.uSky, rgb(pal.sky));
    gl.uniform3fv(U.uLilac, rgb(pal.lilac));
    gl.uniform3fv(U.uLight, [1, 1, 1]);
    gl.uniform1f(U.uHero, pal.sheen);      // до 0.5 это просто сила бликов
  }

  // Каждый фон один раз «фотографируется» в картинку и подставляется в карточки с классом bg-<имя>.
  function bakeBackdrops() {
    // на телефоне фоны рисуются вдвое меньше (карточки узкие, а облако мягкое), по одному за раз
    const small = matchMedia('(max-width:899px)').matches;
    const c = document.createElement('canvas');
    c.width = small ? 640 : 1200; c.height = small ? 420 : 800;
    const gl = c.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    const U = gl && silk(gl);
    if (!U) return;
    gl.viewport(0, 0, c.width, c.height);
    gl.uniform2f(U.uRes, c.width, c.height);
    gl.uniform2f(U.uM, 0.5, 0.5);
    gl.uniform1f(U.uK, 0);
    gl.uniform1f(U.uGrain, 0);
    gl.uniform1f(U.uPortrait, 0);
    const names = Object.keys(BACKDROPS);
    let left = names.length, ok = 0, i = 0;
    const next = () => {
      const name = names[i++];
      const pal = BACKDROPS[name];
      tone(gl, U, pal);
      gl.uniform1f(U.uT, pal.t);
      gl.uniform1f(U.uZoom, pal.zoom);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const copy = document.createElement('canvas');
      copy.width = c.width; copy.height = c.height;
      copy.getContext('2d').drawImage(c, 0, 0);
      copy.toBlob((blob) => {
        if (blob) { root.style.setProperty('--bg-' + name, 'url(' + URL.createObjectURL(blob) + ')'); ok++; }
        if (--left === 0 && ok === names.length) root.classList.add('has-bg');
      }, 'image/jpeg', small ? 0.85 : 0.9);
      if (i < names.length) setTimeout(next, 80);
      else { const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); }
    };
    next();
  }
  // фоны готовятся после загрузки страницы, когда браузер свободен, а не поверх неё
  const bakeLater = () => (window.requestIdleCallback ? requestIdleCallback(bakeBackdrops, { timeout: 3000 }) : setTimeout(bakeBackdrops, 600));
  if (document.readyState === 'complete') bakeLater(); else addEventListener('load', bakeLater, { once: true });

  function cloud(canvas) {
    const mode = canvas.dataset.gl;
    const host = canvas.parentElement;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    const U = gl && silk(gl);
    if (!U) { canvas.classList.add('gl-fallback'); return; }
    tone(gl, U, BACKDROPS.steel);
    gl.uniform1f(U.uGrain, 0.12);

    let w = 0, h = 0;
    const size = () => {
      const k = Math.min(devicePixelRatio || 1, 1.25);
      w = Math.max(2, Math.round(canvas.clientWidth * k));
      h = Math.max(2, Math.round(canvas.clientHeight * k));
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U.uRes, w, h);
      gl.uniform1f(U.uPortrait, h > w ? 1 : 0);
      gl.uniform1f(U.uZoom, h > w ? 1.9 : 1.35);
    };
    size();
    new ResizeObserver(size).observe(canvas);

    const mouse = { x: 0.7, y: 0.5, tx: 0.7, ty: 0.5, k: 0, tk: 0 };
    if (fine) {
      host.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.tx = (e.clientX - r.left) / r.width;
        mouse.ty = 1 - (e.clientY - r.top) / r.height;
        mouse.tk = 1;
      });
      host.addEventListener('pointerleave', () => { mouse.tk = 0; });
    }

    const t0 = performance.now() - (mode === 'hero' ? 21000 : 64000);
    let raf = 0, visible = false;
    const frame = (now) => {
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      mouse.k += (mouse.tk - mouse.k) * 0.05;
      gl.uniform1f(U.uT, (now - t0) / 1000);
      gl.uniform2f(U.uM, mouse.x, mouse.y);
      gl.uniform1f(U.uK, mouse.k);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = visible && !reduce ? requestAnimationFrame(frame) : 0;
    };
    frame(performance.now());
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf && !reduce && !document.hidden) raf = requestAnimationFrame(frame);
    }).observe(canvas);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && visible && !raf && !reduce) raf = requestAnimationFrame(frame);
    });
  }
  $$('canvas[data-gl]').forEach(cloud);

  /* =====================================================================
     Зернистое поле со свечением под курсором: первый экран (светлое, от серебра
     к глубокому синему) и блок заявки (тёмное). Перенесено с текущего сайта:
     чем быстрее двигается мышка, тем ярче вспышка; без мышки свечение дрейфует само.
     ===================================================================== */
  const FIELD = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 u_res;uniform float u_time;uniform vec2 u_mouse;uniform float u_energy;uniform float u_dark;uniform float u_navy;uniform vec3 u_c1;uniform vec3 u_c2;uniform float u_grain;uniform float u_add;',
    'float hs(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}',
    'float ns(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 w=f*f*(3.0-2.0*f);return mix(mix(hs(i),hs(i+vec2(1.0,0.0)),w.x),mix(hs(i+vec2(0.0,1.0)),hs(i+vec2(1.0,1.0)),w.x),w.y);}',
    'float fb(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<4;i++){v+=a*ns(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return v;}',
    // шкала первого экрана: серебро, сталь, синий, глубокий синий, почти чёрный
    'vec3 rmp(float k){vec3 c=mix(vec3(0.933,0.945,0.953),vec3(0.706,0.761,0.804),smoothstep(0.0,0.38,k));c=mix(c,vec3(0.498,0.576,0.659),smoothstep(0.38,0.55,k));c=mix(c,vec3(0.29,0.353,0.573),smoothstep(0.55,0.68,k));c=mix(c,vec3(0.165,0.184,0.40),smoothstep(0.68,0.82,k));c=mix(c,vec3(0.04,0.043,0.07),smoothstep(0.82,1.0,k));return c;}',
    'void main(){',
    ' float asp=u_res.x/u_res.y;',
    ' vec2 uv=gl_FragCoord.xy/u_res;',
    ' vec2 p=vec2(uv.x*asp,uv.y);',
    ' float t=u_time*0.05;',
    ' float f=fb(p*1.3+vec2(t,-t*0.6));',
    ' float g=fb(p*2.4+vec2(-t*1.3,t)+f*1.5);',
    ' vec2 m=vec2(u_mouse.x*asp,u_mouse.y);',
    ' vec2 d=p-m+(vec2(f,g)-0.5)*0.22;',
    ' float r=length(d*vec2(1.0,1.2));',
    ' float halo=exp(-r*r*6.0);',
    ' float core=exp(-r*r*40.0);',
    ' float streak=exp(-abs(d.y)*140.0)*exp(-abs(d.x)*3.0);',
    ' float lumD=mix(0.17,0.27,smoothstep(0.3,0.8,f))+0.03*g;',
    ' float ph=step(asp,0.9);',
    ' float k=mix(uv.x*0.72+(1.0-uv.y)*0.22,(1.0-uv.y)*1.25,ph)+(f-0.5)*0.36+(g-0.5)*0.08;',
    ' vec3 cl=rmp(clamp(k,0.0,mix(1.0,0.84,ph)));',   // на телефоне низ — глубокий синий, без ухода в чёрное,
    ' cl=mix(cl,vec3(0.945,0.949,0.957),smoothstep(mix(0.16,0.045,ph),0.0,uv.y));',
    // тёмное поле бывает серым (заявка) и тёмно-синим (полоса «Круто?»)
    ' vec3 cn=mix(vec3(0.035,0.04,0.075),vec3(0.13,0.17,0.46),smoothstep(0.3,0.85,f));',
    ' cn=mix(cn,vec3(0.26,0.43,0.93),smoothstep(0.62,0.95,g)*0.35);',
    ' vec3 col=mix(cl,mix(vec3(lumD),cn,u_navy),u_dark);',
    ' col+=mix(-0.05,0.06,u_dark)*halo;',
    ' float e=clamp(u_energy,0.0,1.0);',
    ' float s=smoothstep(0.0,0.6,r);',
    ' vec3 tint=mix(mix(u_c2,u_c1,s),mix(u_c2,u_c2*0.45,s),u_dark);',
    // только свет (для вопросов): синее свечение и белая молния на чёрном, дальше смешивается через screen
    ' if(u_add>0.5){vec3 tn=mix(u_c2,u_c2*0.45,s);gl_FragColor=vec4(clamp(tn*halo*e*0.9+vec3(core*e*0.2+streak*e*0.75),0.0,1.0),1.0);return;}',
    ' col=mix(col,tint,halo*e*0.8);',
    ' col+=vec3(core*e*0.16+streak*e*0.5);',
    ' float gr=hs(mod(gl_FragCoord.xy,701.0)+floor(u_time*12.0)*1.618)-0.5;',
    ' col+=gr*u_grain*mix(1.0,1.25,u_dark);',
    ' gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);',
    '}',
  ].join('\n');
  const laser = (root.dataset.tone || 'laser') === 'laser';
  const GLOW = {                     // цвет свечения; для кобальта — те же значения, что на текущем сайте
    c1: laser ? [0.76, 0.84, 0.96] : cssColor('--sky'),
    c2: laser ? [0.23, 0.38, 0.86] : cssColor('--accent'),
  };
  const coarse = matchMedia('(pointer: coarse)').matches;
  const fields = [];
  $$('canvas[data-field]').forEach((canvas) => {
    const navy = canvas.dataset.field === 'navy';
    const add = canvas.dataset.field === 'glow';
    const dark = navy || add || canvas.dataset.field === 'dark';
    let gl = null;
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: false }); } catch (e) { gl = null; }
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const vs = gl && mk(gl.VERTEX_SHADER, VERT);
    const fs = gl && mk(gl.FRAGMENT_SHADER, FIELD);
    const fail = () => { if (dark) canvas.style.display = 'none'; else canvas.classList.add('gl-fallback'); };
    if (!vs || !fs) { fail(); return; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { fail(); return; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    ['u_res', 'u_time', 'u_mouse', 'u_energy', 'u_dark', 'u_navy', 'u_c1', 'u_c2', 'u_grain', 'u_add'].forEach((n) => { u[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1f(u.u_navy, navy ? 1 : 0);
    gl.uniform1f(u.u_add, add ? 1 : 0);
    const ix = parseFloat(canvas.dataset.x) || 0.5, iy = parseFloat(canvas.dataset.y) || 0.5;
    const F = { gl, u, canvas, dark, ix, iy, mx: ix, my: iy, tx: ix, ty: iy, energy: dark ? 0 : 0.6, visible: true, hover: false, lx: null, ly: null, off: add };
    canvas._field = F;
    fields.push(F);
    const host = canvas.parentElement;
    host.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      F.tx = (e.clientX - r.left) / r.width;
      F.ty = 1 - (e.clientY - r.top) / r.height;
      if (F.lx != null) F.energy = Math.min(1, F.energy + Math.hypot(e.clientX - F.lx, e.clientY - F.ly) / 240);
      F.lx = e.clientX; F.ly = e.clientY; F.hover = true;
    });
    host.addEventListener('pointerleave', () => { F.hover = false; F.lx = null; });
    new IntersectionObserver(([en]) => { F.visible = en.isIntersecting; }).observe(canvas);
  });
  const drawField = (F, t) => {
    const { gl, u, canvas } = F;
    const w = Math.max(2, Math.round(canvas.clientWidth || 2));
    const h = Math.max(2, Math.round(canvas.clientHeight || 2));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    if (!F.hover) {
      F.tx = F.ix + 0.14 * Math.sin(t * 0.23);
      F.ty = F.iy + 0.16 * Math.sin(t * 0.17 + 1.3);
    }
    F.mx += (F.tx - F.mx) * 0.08;
    F.my += (F.ty - F.my) * 0.08;
    F.energy *= 0.975;
    if (coarse && !F.hover) F.energy = Math.max(F.energy, F.dark ? 0.32 : 0.48);   // на телефоне свечение дрейфует само
    gl.uniform2f(u.u_res, w, h);
    gl.uniform1f(u.u_time, t);
    gl.uniform2f(u.u_mouse, F.mx, F.my);
    gl.uniform1f(u.u_energy, F.energy);
    gl.uniform1f(u.u_dark, F.dark ? 1 : 0);
    gl.uniform3fv(u.u_c1, GLOW.c1);
    gl.uniform3fv(u.u_c2, GLOW.c2);
    gl.uniform1f(u.u_grain, 0.08);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  if (fields.length) {
    if (reduce) fields.forEach((F) => drawField(F, 8));
    else {
      const fieldT0 = performance.now();
      const fieldTick = (now) => {
        requestAnimationFrame(fieldTick);
        const t = (now - fieldT0) / 1000;
        fields.forEach((F) => { if (F.visible && !F.off) drawField(F, t); });
      };
      requestAnimationFrame(fieldTick);
    }
  }

  /* =====================================================================
     Переписки играются как настоящие: сообщение гостя, «LIA печатает…»,
     ответ по буквам с мигающим курсором. Старые сообщения уезжают вверх.
     ===================================================================== */
  class Chat {
    constructor(el) {
      this.el = el;
      this.items = Array.from(el.children);
      this.run = 0;
      this.played = false;
      this.texts = new Map();
      this.items.forEach((it) => { const t = this.target(it); if (t) this.texts.set(t, t.textContent); });
    }
    target(it) {
      if (it.matches('.msg.l, [data-typed]')) return it;
      return it.querySelector('.msg.l');
    }
    restore() {
      this.texts.forEach((txt, t) => { t.textContent = txt; t.classList.remove('is-typing'); });
      const ind = this.el.querySelector('.typing');
      if (ind) ind.remove();
    }
    showAll() {
      this.run++; this.restore();
      this.items.forEach((it) => { it.classList.remove('is-hid', 'pop'); it.classList.add('tag-on'); });
    }
    hideAll() {
      this.run++; this.restore();
      this.items.forEach((it) => { it.classList.add('is-hid'); it.classList.remove('tag-on', 'pop'); });
    }
    reserve() {   // запоминает высоту, чтобы страница не прыгала, пока сообщения появляются
      const oy = getComputedStyle(this.el).overflowY;
      if (oy === 'auto' || oy === 'scroll') return;
      this.el.style.minHeight = '';
      if (this.el.offsetHeight) this.el.style.minHeight = this.el.offsetHeight + 'px';
    }
    bottom() {
      const el = this.el;
      if (el.scrollHeight > el.clientHeight + 2) el.scrollTop = el.scrollHeight;
    }
    show(it) { it.classList.remove('is-hid'); it.classList.add('pop'); }
    async type(t, ok) {
      const chars = Array.from(this.texts.get(t));
      const step = Math.max(1, Math.round(chars.length / 55));
      t.textContent = '';
      t.classList.add('is-typing');
      for (let i = step; ; i += step) {
        if (!ok()) return;
        t.textContent = chars.slice(0, i).join('');
        this.bottom();
        if (i >= chars.length) break;
        await wait(22);
      }
      t.classList.remove('is-typing');
    }
    async play() {
      this.played = true;
      if (reduce) { this.showAll(); return; }
      this.hideAll();
      const run = this.run;
      const ok = () => run === this.run;
      await wait(250);
      let who = [];
      for (const it of this.items) {
        if (!ok()) return;
        if (it.matches('.who')) { who.push(it); continue; }
        const t = this.target(it);
        if (t) {
          const ind = document.createElement('p');
          ind.className = 'typing';
          ind.innerHTML = 'LIA печатает…<i><b></b></i>';
          this.el.insertBefore(ind, who[0] || it);
          this.bottom();
          await wait(640);
          ind.remove();
          if (!ok()) return;
          who.forEach((w) => this.show(w));
          this.show(it);
          await this.type(t, ok);
          if (!ok()) return;
          it.classList.add('tag-on');
          await wait(280);
        } else {
          who.forEach((w) => this.show(w));
          this.show(it);
          it.classList.add('tag-on');
          this.bottom();
          await wait(it.matches('.note, .hint') ? 520 : 680);
        }
        who = [];
      }
    }
  }

  const chats = new Map();
  $$('[data-chat]').forEach((el) => chats.set(el, new Chat(el)));
  const chatOf = (el) => chats.get(el);

  // Лента примеров на телефоне: переписка карточки видна сразу, без «пустой карточки» и набора по буквам.
  // Пока набирался текст, карточка после листания несколько секунд оставалась пустой, а каждая буква
  // заставляла телефон перерисовывать полупрозрачные сообщения: это и ощущалось как тормоза.
  const instant = (c) => isMobile() && c.el.closest('.ex');
  const armChats = () => {
    chats.forEach((c) => {
      if (c.played) return;
      if (instant(c)) { c.played = true; c.showAll(); requestAnimationFrame(() => c.bottom()); return; }
      c.showAll(); c.reserve(); if (!reduce) c.hideAll();
    });
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
    const deep = location.hash.match(/^#shag-(\d)$/);      // ссылка вида …/#shag-3 открывает сразу третий шаг
    if (deep && stepEls[deep[1] - 1]) { setStep(deep[1] - 1, false); $('.steps-nav').scrollIntoView(); }
    armChats();
    // обычные переписки стартуют сами, когда доезжают до экрана
    onView($$('[data-chat]').filter((el) => el.dataset.chat === ''), (el) => { const c = chatOf(el); if (!c.played) c.play(); }, { threshold: 0.35 });
    // на телефоне карточка ленты примеров показывается целиком, как только до неё долистали (если ещё не показана)
    onView($$('.ex'), (el) => {
      if (!isMobile()) return;
      const c = chatOf($('[data-chat]', el));
      if (!c.played) { c.played = true; c.showAll(); requestAnimationFrame(() => c.bottom()); }
    }, { threshold: 0.6 });
  });

  let lastW = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    chats.forEach((c) => { c.el.style.minHeight = ''; if (c.played) c.showAll(); });
    exActive = -1;
  });

  $$('[data-replay]').forEach((b) => b.addEventListener('click', () => {
    const c = chatOf(document.getElementById(b.dataset.replay));
    if (c) c.play();
  }));

  /* ===== Первый экран: заголовок выезжает по словам с пружинкой, потом играет диалог ===== */
  const hero = $('.hero');
  if (hero) {
    let n = 0;
    $$('h1 .ln', hero).forEach((ln) => { n += splitWords(ln, n); });
    setTimeout(() => hero.classList.add('go'), 60);
    const hc = chatOf($('[data-chat="hero"]'));
    if (hc) { if (!reduce) hc.hideAll(); setTimeout(() => hc.play(), reduce ? 0 : 1500); }
  }

  /* ===== Шапка: вниз — остаются кнопка и бургер, вверх — выезжает белой плашкой ===== */
  const hdr = $('#hdr');
  const burger = $('.burger');
  let lastY = scrollY;
  const closeMenu = () => { hdr.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); };
  // на телефоне направление прокрутки «дрожит» (инерция, резинка у краёв), поэтому шапка меняется
  // только после уверенного хода в одну сторону (48px) и не чаще раза в 450мс; на компьютере — как раньше
  let dir = 0, acc = 0, flipAt = 0;
  function headerTick() {
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const y = Math.min(Math.max(scrollY, 0), max);
    const phone = isMobile();
    const dy = y - lastY;
    lastY = y;
    if (y < 120) { hdr.classList.remove('is-down', 'is-up'); acc = 0; dir = 0; return; }
    if (!dy) return;
    const d = dy > 0 ? 1 : -1;
    if (d !== dir) { dir = d; acc = 0; }
    acc += dy;
    if (Math.abs(acc) < (phone ? 48 : 4)) return;
    if (phone && performance.now() - flipAt < 450) return;
    const down = d > 0;
    if (hdr.classList.contains('is-down') === down && hdr.classList.contains('is-up') !== down) return;
    flipAt = performance.now();
    hdr.classList.toggle('is-down', down);
    hdr.classList.toggle('is-up', !down);
    if (down) closeMenu();
  }
  burger.addEventListener('click', () => {
    const open = hdr.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('.menu a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', (e) => { if (!hdr.contains(e.target)) closeMenu(); });

  /* ===== Лента примеров: телефон прилипает, переписки листаются вместе с прокруткой ===== */
  const exs = $('[data-exs]');
  const exItems = exs ? $$('.ex', exs) : [];
  let exActive = -1;
  function setEx(i) {
    if (i === exActive) return;
    exActive = i;
    exItems.forEach((e, k) => {
      e.classList.toggle('is-on', k === i);
      const c = chatOf($('[data-chat]', e));
      if (k === i) c.play(); else c.hideAll();
    });
  }
  function exTick() {
    if (!exs || isMobile()) return;
    const r = exs.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const total = r.height - innerHeight;
    const f = clamp(-r.top / total, 0, 0.9999) * exItems.length;
    const i = Math.floor(f);
    exItems.forEach((e, k) => $('.ex-cap', e).style.setProperty('--p', k === i ? (f - i).toFixed(3) : 0));
    if (r.top < innerHeight * 0.55) setEx(i);
  }
  exItems.forEach((e, k) => $('.ex-cap', e).addEventListener('click', () => {
    if (isMobile()) return;
    const r = exs.getBoundingClientRect();
    const total = r.height - innerHeight;
    scrollTo({ top: r.top + scrollY + total * (k + 0.04) / exItems.length, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ===== Шаги как вкладки: клик по шагу меняет текст слева и переписку в телефоне ===== */
  const stepTabs = $$('.steps-nav a');
  const stepEls = $$('.step');
  let stepOn = -1;
  function setStep(i, play) {
    if (i === stepOn || !stepEls[i]) return;
    stepOn = i;
    stepTabs.forEach((t, k) => {
      t.classList.toggle('is-on', k === i);
      if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
    });
    stepEls.forEach((s, k) => {
      s.classList.toggle('is-on', k === i);
      const c = chatOf($('[data-chat]', s));
      c.showAll();                                   // останавливает переписку, если она ещё играла
      if (k === i && play) { c.reserve(); c.play(); }
    });
    const nav = stepTabs[i].parentElement;          // на узком экране лента пилюль сама доезжает до выбранного шага
    if (nav.scrollWidth > nav.clientWidth) {
      const t = stepTabs[i];
      nav.scrollTo({ left: t.offsetLeft - nav.offsetLeft - (nav.clientWidth - t.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  setStep(0, false);
  stepTabs.forEach((t, k) => t.addEventListener('click', (e) => {
    e.preventDefault();
    setStep(k, true);
  }));
  addEventListener('hashchange', () => {
    const m = location.hash.match(/^#shag-(\d)$/);
    if (m && stepEls[m[1] - 1]) { setStep(m[1] - 1, true); $('.steps-nav').scrollIntoView(); }
  });

  /* ===== Крупные фразы темнеют по словам по мере прокрутки ===== */
  const scrubs = $$('[data-scrub]').map((el) => ({ el, n: splitWords(el), words: null }));
  scrubs.forEach((s) => { s.words = $$('.w', s.el); });
  function scrubTick() {
    if (reduce) return;
    const vh = innerHeight;
    scrubs.forEach((s) => {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      // слова темнеют, проходя «линию чтения»: на десктопе в нижней части экрана, на телефоне — ближе к середине, где глаз читает
      const line = isMobile() ? 0.6 : 0.84;
      const p = clamp((vh * line - r.top) / (r.height + 60));
      s.words.forEach((w, i) => w.style.setProperty('--o', clamp(p * (s.n + 2) - i).toFixed(2)));
    });
  }

  /* ===== Цепочка: линии дорисовываются при прокрутке ===== */
  const chain = $('[data-chain]');
  const links = chain ? $$('li', chain) : [];
  function chainTick() {
    if (!chain || reduce) return;
    const r = chain.getBoundingClientRect();
    if (r.bottom < -50 || r.top > innerHeight + 50) return;
    const p = clamp((innerHeight * 0.88 - r.top) / (innerHeight * 0.4)) * (links.length - 0.4);
    links.forEach((li, k) => {
      li.style.setProperty('--p', clamp(p - k).toFixed(3));
      li.style.setProperty('--d', p >= k ? 1 : 0);
    });
  }

  let ticking = false;
  const tick = () => { ticking = false; headerTick(); exTick(); scrubTick(); chainTick(); };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
  addEventListener('resize', tick);
  tick();

  /* ===== Счётчики набегают от нуля ===== */
  if (!reduce) {
    onView($$('[data-count]'), (el) => {
      const to = Number(el.dataset.count);
      const t0 = performance.now();
      const dur = 1500;
      const step = (now) => {
        const p = clamp((now - t0) / dur);
        el.textContent = Math.round(to * (1 - Math.pow(2, -10 * p)) / (1 - Math.pow(2, -10)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
  }

  /* ===== Боли: на компьютере свечение идёт за курсором, на телефоне лента листается сама, пока её не тронули ===== */
  /* пузыри LIA в «Профиле студии»: свечение идёт за курсором, как в блоке болей */
  const profile = $('.profile');
  if (profile && fine) {
    const bubbles = $$('.msg.l', profile);
    let pe = null;
    profile.addEventListener('pointermove', (e) => {
      if (pe) { pe = e; return; }
      pe = e;
      requestAnimationFrame(() => {
        bubbles.forEach((b) => {
          const r = b.getBoundingClientRect();
          b.style.setProperty('--x', (pe.clientX - r.left) + 'px');
          b.style.setProperty('--y', (pe.clientY - r.top) + 'px');
        });
        pe = null;
      });
    });
  }

  const pains = $('[data-pains]');
  if (pains) {
    const cards = $$('.pain', pains);
    if (fine) {
      let pe = null;
      pains.addEventListener('pointermove', (e) => {
        if (pe) { pe = e; return; }
        pe = e;
        requestAnimationFrame(() => {
          cards.forEach((c) => {
            const r = c.getBoundingClientRect();
            c.style.setProperty('--x', (pe.clientX - r.left) + 'px');
            c.style.setProperty('--y', (pe.clientY - r.top) + 'px');
          });
          pe = null;
        });
      });
    }
    const dotsBox = $('.pains-dots');
    cards.forEach(() => dotsBox.appendChild(document.createElement('i')));
    const dots = $$('i', dotsBox);
    const current = () => {
      const mid = pains.scrollLeft + pains.clientWidth / 2;
      let best = 0, bd = Infinity;
      cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
      return best;
    };
    const paint = () => { const i = current(); dots.forEach((d, k) => d.classList.toggle('on', k === i)); };
    pains.addEventListener('scroll', paint, { passive: true });
    paint();
    let touched = false, seen = false;
    ['pointerdown', 'touchstart', 'wheel'].forEach((ev) => pains.addEventListener(ev, () => { touched = true; }, { passive: true }));
    onView([pains], () => { seen = true; }, { threshold: 0.6, out: () => { seen = false; } });
    if (!reduce) {
      setInterval(() => {
        if (touched || !seen || !isMobile() || document.hidden) return;
        const next = (current() + 1) % cards.length;
        pains.scrollTo({ left: cards[next].offsetLeft - (pains.clientWidth - cards[next].offsetWidth) / 2, behavior: 'smooth' });
      }, 3400);
    }
  }

  /* ===== «Что изменится»: вкладки на телефоне ===== */
  const tabs = $$('.ben-tab');
  const cols = $$('.ben-col');
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    cols.forEach((c, i) => c.classList.toggle('is-on', i === Number(t.dataset.ben)));
  }));

  /* ===== «Круто?» выпрыгивает в нижней трети экрана, затем LIA печатает ответ ===== */
  const kruto = $('#kruto');
  if (kruto) {
    onView([kruto], () => {
      kruto.classList.add('in');
      const c = chatOf($('#reply'));
      setTimeout(() => c && c.play(), reduce ? 0 : 750);
    }, { threshold: 0.5, margin: '0px 0px -30% 0px' });   // порог 1 не срабатывал при масштабе окна не 100%
  }

  /* ===== «Пыль» в блоке «Кто мы»: гуще к правому верхнему углу, под курсором расступается и подсвечивается ===== */
  const dustCanvas = $('[data-dust]');
  if (dustCanvas) {
    const sec = dustCanvas.parentElement;
    const ctx = dustCanvas.getContext('2d');
    let W = 0, H = 0, pts = [], mx = -9999, my = -9999, raf = 0, calm = 0, seen = false;
    const build = () => {
      const k = Math.min(devicePixelRatio || 1, 2);
      W = dustCanvas.clientWidth; H = dustCanvas.clientHeight;
      dustCanvas.width = W * k; dustCanvas.height = H * k;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      const n = Math.min(14000, Math.round(W * H / 100));   // плотность крупинок
      pts = [];
      for (let i = 0; i < n; i++) {
        const far = Math.random() < 0.3;        // часть крупинок рассыпана по всему блоку, остальные тянутся к правому верхнему углу
        pts.push({
          x: far ? Math.random() * W : W * (1 - Math.pow(Math.random(), 1.9)),
          y: far ? Math.random() * H : H * Math.pow(Math.random(), 2.1),
          r: 0.4 + Math.random() * 0.9,
          tone: Math.floor(Math.random() * 3),  // три степени прозрачности чёрного
          ox: 0, oy: 0,
        });
      }
      draw();
    };
    const TONES = ['rgba(20,20,20,.30)', 'rgba(20,20,20,.55)', 'rgba(20,20,20,.85)'];
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      let moving = false;
      const R = 140;
      const paths = [new Path2D(), new Path2D(), new Path2D()];   // точки одного тона рисуются одним махом — так быстрее
      for (const p of pts) {
        const dx = p.x - mx, dy = p.y - my;
        const d = Math.hypot(dx, dy);
        let tx = 0, ty = 0;
        if (d < R) { const f = (1 - d / R); tx = dx / (d || 1) * f * 42; ty = dy / (d || 1) * f * 42; }
        p.ox += (tx - p.ox) * 0.14; p.oy += (ty - p.oy) * 0.14;
        if (Math.abs(p.ox - tx) > 0.05 || Math.abs(p.oy - ty) > 0.05) moving = true;
        const px = p.x + p.ox, py = p.y + p.oy;
        paths[p.tone].moveTo(px + p.r, py);
        paths[p.tone].arc(px, py, p.r, 0, 6.2832);
      }
      paths.forEach((path, i) => { ctx.fillStyle = TONES[i]; ctx.fill(path); });
      return moving;
    };
    const loop = () => {
      const moving = draw();
      calm = moving ? 0 : calm + 1;
      raf = seen && calm < 30 ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => { calm = 0; if (!raf && seen) raf = requestAnimationFrame(loop); };
    build();
    new ResizeObserver(build).observe(dustCanvas);
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(sec);
    if (fine && !reduce) {
      sec.addEventListener('pointermove', (e) => {
        const r = dustCanvas.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top; wake();
      });
      sec.addEventListener('pointerleave', () => { mx = my = -9999; wake(); });
    }
  }

  /* ===== «Почему не подведёт»: карточки пружинят, на телефоне — аккордеон ===== */
  const whys = $$('.why');
  onView(whys, (el) => el.classList.add('in'), { threshold: 0.3 });
  whys.forEach((w) => $('.why-h', w).addEventListener('click', () => {
    if (!isMobile()) return;
    const open = !w.classList.contains('is-open');
    $$('.why', w.parentElement).forEach((x) => x.classList.remove('is-open'));
    if (open) {
      w.classList.add('is-open');
      const c = chatOf($('[data-chat]', w));
      if (c && !c.played) c.play();
      // закрытая сверху карточка сдвигает страницу — возвращаем открытую под шапку
      requestAnimationFrame(() => {
        const hdr = $('.hdr');
        const top = w.getBoundingClientRect().top + scrollY - ((hdr ? hdr.getBoundingClientRect().bottom : 70) + 12);
        scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
      });
    }
  }));

  /* ===== Вопросы: открыт всегда один. Заливка строки и светлая полоса — в style.css, молния первого экрана — холст .faq-glow ===== */
  const faqList = $('[data-faq]');
  if (faqList) {
    const items = $$('.faq', faqList);
    // молния: холст переезжает в строку под курсором, на входе вспышка, дальше светит от движения мыши
    const glow = $('.faq-glow', faqList);
    const G = glow && glow._field;
    if (G && fine && !reduce) {
      let offT = 0;
      $$('.faq-q', faqList).forEach((q) => q.addEventListener('pointerenter', (e) => {
        clearTimeout(offT);
        q.prepend(glow);
        const r = glow.getBoundingClientRect();
        G.tx = G.mx = (e.clientX - r.left) / r.width;
        G.ty = G.my = 1 - (e.clientY - r.top) / r.height;
        G.energy = 1; G.off = false;
      }));
      faqList.addEventListener('pointerleave', () => { offT = setTimeout(() => { G.off = true; }, 400); });
    }
    items.forEach((it) => {
      const q = $('.faq-q', it);
      q.addEventListener('click', () => {
        const open = !it.classList.contains('is-open');
        items.forEach((x) => { x.classList.remove('is-open'); $('.faq-q', x).setAttribute('aria-expanded', 'false'); });
        if (open) { it.classList.add('is-open'); q.setAttribute('aria-expanded', 'true'); }
      });
    });
  }

  /* ===== Письмо основательницы: на телефоне свёрнуто до ключевой фразы ===== */
  const more = $('.m-more');
  if (more) more.addEventListener('click', () => { more.closest('.letter').classList.add('is-open'); more.setAttribute('aria-expanded', 'true'); });

  /* ===== Свой курсор: маленький скруглённый квадратик; над ссылками и кнопками вырастает в кружок,
     над фото — в плашку с именем. Цвет «вычитается» из фона, поэтому курсор виден на любом блоке. ===== */
  if (fine) {
    const cur = $('.cur');
    const label = $('span', cur);
    root.classList.add('has-cur');
    let x = -100, y = -100, tx = -100, ty = -100;
    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      // у самой границы окна (≈4px, «за миллиметр до края») свой курсор исчезает, возвращается обычная стрелка
      const edge = e.clientX < 4 || e.clientY < 4 || e.clientX > innerWidth - 4 || e.clientY > innerHeight - 4;
      root.classList.toggle('has-cur', !edge);
      if (edge) { cur.classList.add('is-off'); return; }
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      const tagged = t.closest('[data-cursor]');
      const link = t.closest('a, button, [role="tab"]');
      cur.classList.toggle('is-label', !!tagged);
      cur.classList.toggle('is-link', !tagged && !!link);
      cur.classList.remove('is-off');
      let text = tagged ? tagged.dataset.cursor : '';
      if (tagged && tagged.dataset.cursorLeft) {      // у фото две подписи: левая и правая половина
        const r = tagged.getBoundingClientRect();
        text = e.clientX < r.left + r.width / 2 ? tagged.dataset.cursorLeft : tagged.dataset.cursorRight;
      }
      label.textContent = text;
    }, { passive: true });
    // мышь вышла из окна (на вкладки, в другое окно, за экран) — наш курсор гаснет, возвращается обычная стрелка
    const away = () => { cur.classList.add('is-off'); root.classList.remove('has-cur'); };
    document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) away(); });
    document.documentElement.addEventListener('mouseleave', away);
    addEventListener('blur', away);
    document.addEventListener('visibilitychange', () => { if (document.hidden) away(); });
    const follow = () => {
      x += (tx - x) * (reduce ? 1 : 0.32); y += (ty - y) * (reduce ? 1 : 0.32);
      cur.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
      requestAnimationFrame(follow);
    };
    follow();
  }

  /* ===== Кнопки ведут в Telegram-бот: у каждой своя метка (start=site_<место> и utm_content=<место>).
     Если посетитель пришёл по рекламе с UTM-метками, источник и кампания дописываются в start:
     бот увидит, с какой кнопки и из какой рекламы пришёл гость. Telegram пропускает в бота только start (до 64 знаков). ===== */
  (() => {
    let q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    const clean = (v) => (v || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
    const src = clean(q.get('utm_source'));
    const camp = clean(q.get('utm_campaign'));
    if (!src && !camp) return;
    $$('a[data-bot]').forEach((a) => {
      try {
        const u = new URL(a.href);
        u.searchParams.set('start', ('site_' + a.dataset.bot + '__' + [src, camp].filter(Boolean).join('__')).slice(0, 64));
        a.href = u.toString();
      } catch (e) { /* оставляем ссылку как есть */ }
    });
  })();
})();

// Серое зерно старого лендинга (блок «Кто мы»): перенесено как есть из корневого index.html
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  // ===== «Кто мы»: неравномерное зерно, как во второй версии лендинга (холст «LIA — лендинг») =====
  // Серые крупинки с синими вкраплениями. Плотность — мягкий градиент к правому верхнему углу × «облака» шума.
  // Под курсором зерно расступается с лёгким завихрением и подсвечивается.
  (() => {
    const canvas = document.querySelector('canvas[data-dust]');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const host = canvas.parentElement;
    const PAL = { dust: '#A7A7A2', dot: '#86A2FF' }; // серое зерно и синие крупинки (примерно каждая четвёртая)
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const sw = { W: 0, H: 0, dpr: 1, G: null, grid: null, moving: new Set(), near: new Set(), ptr: { x: -1e4, y: -1e4, on: false, down: false }, raf: 0, visible: false, born: 0, shown: false };
    const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

    const toLocal = (e) => { const r = canvas.getBoundingClientRect(); sw.ptr.x = e.clientX - r.left; sw.ptr.y = e.clientY - r.top; };
    host.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' && !sw.ptr.down) return; toLocal(e); sw.ptr.on = true; start(); }, { passive: true });
    host.addEventListener('pointerdown', (e) => { sw.ptr.down = true; toLocal(e); sw.ptr.on = true; start(); }, { passive: true });
    host.addEventListener('pointerleave', () => { sw.ptr.on = false; start(); }, { passive: true });
    const up = (e) => { if (e.pointerType !== 'mouse') { sw.ptr.down = false; sw.ptr.on = false; start(); } };
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });

    function layout() {
      const W = host.clientWidth, H = host.clientHeight;
      if (!W || !H) return;
      sw.W = W; sw.H = H;
      sw.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * sw.dpr);
      canvas.height = Math.round(H * sw.dpr);
      ctx.setTransform(sw.dpr, 0, 0, sw.dpr, 0, 0);
      const rnd = rng(Math.imul(W, 73856093) ^ Math.imul(H, 19349663) ^ 0x51ed27);
      const GS = 64;
      const lat = new Float32Array(GS * GS);
      for (let i = 0; i < lat.length; i++) lat[i] = rnd();
      const vn = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const ix = ((xi % GS) + GS) % GS, iy = ((yi % GS) + GS) % GS, ix1 = (ix + 1) % GS, iy1 = (iy + 1) % GS;
        const a = lat[iy * GS + ix], b = lat[iy * GS + ix1], c = lat[iy1 * GS + ix], d = lat[iy1 * GS + ix1];
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
      };
      const fbm = (x, y) => 0.6 * vn(x / 210, y / 210) + 0.28 * vn(x / 84 + 17.3, y / 84 + 5.1) + 0.12 * vn(x / 30 + 3.7, y / 30 + 11.9);
      const wide = W >= 900;
      const sm = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
      const dens = (x, y) => {
        const nx = x / W, ny = y / H;
        const g = wide ? sm(0.3, 1.02, nx * 0.82 + (1 - ny) * 0.18) : sm(0.02, 1.0, (1 - ny) * 0.85 + nx * 0.15);
        const n = fbm(x, y);
        const mod = 0.08 + 2.1 * Math.pow(Math.max(0, n - 0.3) / 0.42, 1.5);
        return Math.min(1, Math.pow(g, 1.25) * mod);
      };
      const target = Math.round(Math.min(coarse ? 7000 : 20000, W * H * 0.019));
      const G = [];
      let tries = 0;
      while (G.length < target && tries++ < target * 40) {
        const x = rnd() * W, y = rnd() * H;
        const p = dens(x, y);
        if (rnd() < p) {
          const big = rnd() < 0.05;
          G.push({ x, y, ox: 0, oy: 0, b: 0, s: big ? 1.4 + rnd() * 0.5 : 0.6 + rnd() * 0.8, a: 0.18 + rnd() * 0.55 * (0.4 + 0.6 * p), c: rnd() < 0.24 ? 1 : 0, d: rnd() });
        }
      }
      sw.G = G;
      const CS = 40, cols = Math.ceil(W / CS) + 1, rows = Math.ceil(H / CS) + 1;
      const cells = [];
      for (let i = 0; i < cols * rows; i++) cells.push([]);
      for (let i = 0; i < G.length; i++) cells[((G[i].y / CS) | 0) * cols + ((G[i].x / CS) | 0)].push(i);
      sw.grid = { CS, cols, rows, cells };
      sw.moving.clear();
      draw(performance.now());
    }

    function step(now) {
      const G = sw.G;
      if (!G) return false;
      const busy = !!sw.born && now - sw.born < 1900;
      const R = coarse ? 120 : 165, R2 = R * R;
      const near = sw.near;
      near.clear();
      if (sw.ptr.on) {
        const gr = sw.grid, px = sw.ptr.x, py = sw.ptr.y;
        const c0 = Math.max(0, ((px - R) / gr.CS) | 0), c1 = Math.min(gr.cols - 1, ((px + R) / gr.CS) | 0);
        const r0 = Math.max(0, ((py - R) / gr.CS) | 0), r1 = Math.min(gr.rows - 1, ((py + R) / gr.CS) | 0);
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const cell = gr.cells[r * gr.cols + c];
            for (let k = 0; k < cell.length; k++) {
              const g = G[cell[k]], dx = g.x - px, dy = g.y - py;
              if (dx * dx + dy * dy < R2) { near.add(cell[k]); sw.moving.add(cell[k]); }
            }
          }
        }
      }
      let maxd = 0;
      for (const i of sw.moving) {
        const g = G[i];
        let tx = 0, ty = 0, tb = 0;
        if (near.has(i)) {
          const dx = g.x - sw.ptr.x, dy = g.y - sw.ptr.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = 1 - d / R, f2 = f * f, push = f2 * 15, swirl = f2 * 7;
          tx = (dx / d) * push - (dy / d) * swirl;
          ty = (dy / d) * push + (dx / d) * swirl;
          tb = f2;
        }
        const ex = tx - g.ox, ey = ty - g.oy, eb = tb - g.b;
        g.ox += ex * 0.13; g.oy += ey * 0.13; g.b += eb * 0.12;
        const m = Math.abs(ex) + Math.abs(ey) + Math.abs(eb) * 20;
        if (m > maxd) maxd = m;
        if (!near.has(i) && Math.abs(g.ox) < 0.04 && Math.abs(g.oy) < 0.04 && g.b < 0.01) { g.ox = 0; g.oy = 0; g.b = 0; sw.moving.delete(i); }
      }
      return busy || maxd > 0.05;
    }

    function draw(now) {
      const G = sw.G;
      if (!G) return;
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, sw.W, sw.H);
      if (!sw.shown) return; // до первого появления блока на экране зерно не рисуем, чтобы оно проявилось при прокрутке
      const age = sw.born ? now - sw.born : 1e9;
      const fading = age < 1900;
      const tones = [PAL.dust, PAL.dot];
      for (let k = 0; k < 2; k++) {
        ctx.fillStyle = tones[k];
        for (let i = 0; i < G.length; i++) {
          const g = G[i];
          if (g.c !== k) continue;
          let m = 1;
          if (fading) { m = (age - g.d * 1300) / 550; if (m <= 0) continue; if (m > 1) m = 1; }
          const a = Math.min(1, g.a + g.b * 0.75) * m;
          if (a < 0.02) continue;
          ctx.globalAlpha = a;
          const z = g.s * (1 + g.b * 0.6);
          ctx.fillRect(g.x + g.ox - z / 2, g.y + g.oy - z / 2, z, z);
        }
      }
      ctx.globalAlpha = 1;
    }

    const frame = (now) => {
      sw.raf = 0;
      if (coarse && !sw.ptr.down) { sw.ptr.x = sw.W * (0.5 + 0.38 * Math.sin(now / 4200)); sw.ptr.y = sw.H * (0.45 + 0.3 * Math.sin(now / 3100 + 1.7)); sw.ptr.on = true; }
      const busy = step(now) || coarse;
      draw(now);
      if (busy && sw.visible && !document.hidden) sw.raf = requestAnimationFrame(frame);
    };
    function start() {
      if (!sw.G) return;
      if (reduce) { draw(performance.now()); return; }
      if (!sw.raf && sw.visible && !document.hidden) sw.raf = requestAnimationFrame(frame);
    }
    const reveal = () => {
      if (sw.shown) return;
      sw.shown = true;
      sw.born = reduce ? 0 : performance.now();
      start();
    };
    if (hasIO) {
      new IntersectionObserver((es) => { sw.visible = es[0].isIntersecting; if (sw.visible) { reveal(); start(); } }, { threshold: 0.05 }).observe(host);
    } else {
      sw.visible = true;
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    if (typeof ResizeObserver !== 'undefined') {
      let pend = 0;
      new ResizeObserver(() => {
        if (pend) cancelAnimationFrame(pend);
        pend = requestAnimationFrame(() => { pend = 0; if (host.clientWidth !== sw.W || host.clientHeight !== sw.H) { layout(); start(); } });
      }).observe(host);
    }
    layout();
    if (!hasIO) reveal();
  })();
})();
