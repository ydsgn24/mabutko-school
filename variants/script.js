// Один цикл requestAnimationFrame на всю страницу:
//  • рисует вектор на канвасе (перелив + блик, бегущий по контуру туда и обратно);
//  • по скроллу увеличивает вектор и меняет фон;
//  • переход блоков: первый уходит в размытие, второй проявляется из размытия;
//  • карточки второго блока едут по дуге (как Awards на fromanother.love).
// При скролле меняются только transform / opacity / filter конкретных элементов —
// без пересчёта стилей всей страницы.
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const header = document.querySelector('.header');
  const hero = document.querySelector('.hero');
  const intro = document.querySelector('.intro');
  const introSticky = intro.querySelector('.intro__sticky');
  const cards = [...intro.querySelectorAll('.card')];
  const tint = document.querySelector('.bg__tint');
  const blobs = document.querySelector('.bg__blobs');
  const swirl = document.querySelector('.swirl');
  const canvas = document.querySelector('.swirl__canvas');
  const ctx = canvas.getContext('2d');

  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

  // ---------- Канвас вектора ----------
  // Форма размыта, поэтому рисуем в небольшом разрешении и растягиваем — это очень дёшево.
  const VB_W = 1209.6;
  const VB_H = 671.6;
  const CW = 720;
  const CH = Math.round(CW * VB_H / VB_W);
  const K = CW / VB_W;
  canvas.width = CW;
  canvas.height = CH;

  const maskA = document.createElement('canvas');
  const maskB = document.createElement('canvas');
  const mask = document.createElement('canvas');
  [maskA, maskB, mask].forEach((c) => { c.width = CW; c.height = CH; });
  const maskCtx = mask.getContext('2d');
  let masksReady = 0;
  let maskFor = -1;

  function loadMask(src, target) {
    const img = new Image();
    img.onload = () => {
      target.getContext('2d').drawImage(img, 0, 0, CW, CH);
      masksReady += 1;
      maskFor = -1;
    };
    img.src = src;
  }
  loadMask('assets/swirl-1.svg', maskA);
  loadMask('assets/swirl-2.svg', maskB);

  // Маска = форма первого блока, перетекающая в форму второго
  function updateMask(p) {
    const key = Math.round(p * 100);
    if (key === maskFor) return;
    maskFor = key;
    maskCtx.clearRect(0, 0, CW, CH);
    maskCtx.globalAlpha = 1 - p;
    maskCtx.drawImage(maskA, 0, 0);
    maskCtx.globalAlpha = p;
    maskCtx.drawImage(maskB, 0, 0);
    maskCtx.globalAlpha = 1;
  }

  // Точки контура: блик бежит по нему — по одному краю линии до конца и обратно по другому
  const pathEl = document.getElementById('swirl-path');
  const pathLen = pathEl.getTotalLength();
  const SAMPLES = 600;
  const pts = Array.from({ length: SAMPLES }, (_, i) => pathEl.getPointAtLength(i / SAMPLES * pathLen));

  function mix(a, b, t) {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
  }

  function glow(x, y, r, rgb, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${alpha})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const FLOW_PERIOD = 1400;
  const FLOW_COLORS = ['#718AA0', '#A9C6E1', '#FCF7F1', '#A9C6E1'];
  const FLOW_ANGLE = 20 * Math.PI / 180;
  const RUN_TIME = 8;

  function drawSwirl(t, p) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, CW, CH);
    ctx.setTransform(K, 0, 0, K, 0, 0);

    // 1. Базовый градиент из макета (тёмный → светлый по мере скролла)
    ctx.save();
    ctx.transform(739, 173, -324.871, 1379.37, 444.8, 143.8);
    const base = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    base.addColorStop(0.293, mix('#718AA0', '#A9C6E1', p));
    base.addColorStop(1, '#FCF7F1');
    ctx.fillStyle = base;
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();

    // 2. Цветовой перелив, который постоянно течёт
    const dx = Math.cos(FLOW_ANGLE);
    const dy = Math.sin(FLOW_ANGLE);
    const start = -2 * FLOW_PERIOD + (t / 12 % 1) * FLOW_PERIOD;
    const flow = ctx.createLinearGradient(dx * start, dy * start, dx * (start + 4 * FLOW_PERIOD), dy * (start + 4 * FLOW_PERIOD));
    for (let i = 0; i <= 16; i++) flow.addColorStop(i / 16, FLOW_COLORS[i % 4]);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = flow;
    ctx.fillRect(0, 0, VB_W, VB_H);
    ctx.globalAlpha = 1;

    // 3. Мягкие блики, плавающие внутри формы
    glow(300 + 350 * Math.sin(t * 0.57), 220 + 130 * Math.sin(t * 0.74 + 1), 340, '252,247,241', 0.8);
    glow(850 + 330 * Math.sin(t * 0.42 + 2), 420 + 120 * Math.sin(t * 0.55), 380, '201,220,238', 0.75);
    glow(600 + 250 * Math.sin(t * 0.7 + 4), 330 + 90 * Math.sin(t * 0.9 + 2), 300, '79,106,130', 0.6 * (1 - p));

    // 4. Яркий блик с хвостом, бегущий по контуру
    ctx.globalCompositeOperation = 'lighter';
    const head = Math.floor((t / RUN_TIME % 1) * SAMPLES);
    const at = (i) => pts[((i % SAMPLES) + SAMPLES) % SAMPLES];
    for (let j = 18; j >= 0; j--) {
      const pt = at(head - j * 3);
      const a = Math.pow(1 - j / 19, 1.6);
      glow(pt.x, pt.y, 80 - j * 1.5, '252,247,241', 0.35 * a);
    }
    const hp = at(head);
    glow(hp.x, hp.y, 34, '255,255,255', 0.9);

    // 5. Обрезаем всё по форме вектора
    if (masksReady === 2) {
      updateMask(p);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(mask, 0, 0);
    }
  }

  // ---------- Размеры (пересчитываются только при resize) ----------
  let vh, u, heroH, introTop, introLen, cardU;
  function measure() {
    vh = window.innerHeight;
    u = swirl.offsetWidth / VB_W;
    heroH = hero.offsetHeight;
    introTop = intro.offsetTop;
    introLen = intro.offsetHeight - vh;
    cardU = cards[0].offsetWidth / 360;
  }

  // ---------- Применение стилей (пишем только если значение изменилось) ----------
  const last = new Map();
  function set(el, prop, value) {
    const key = el;
    let rec = last.get(key);
    if (!rec) last.set(key, rec = {});
    if (rec[prop] === value) return;
    rec[prop] = value;
    el.style[prop] = value;
  }

  function fadeBlur(el, visible, maxBlur) {
    set(el, 'opacity', visible.toFixed(3));
    const blur = (1 - visible) * maxBlur;
    set(el, 'filter', blur < 0.05 ? 'none' : `blur(${blur.toFixed(2)}px)`);
    set(el, 'visibility', visible < 0.005 ? 'hidden' : 'visible');
  }

  // Параметры дуги карточек подобраны по макету: шаг 385px, наклон 5.34° / 7.34°, опускание 15px / 60px
  const STEP_X = 385;
  const DROP_Y = 15;
  const TILT = 5.34;
  const TILT_CURVE = 0.46;
  const lastIndex = cards.length - 1;

  function layoutCards(progress) {
    cards.forEach((card, i) => {
      const pos = i - progress * lastIndex;
      const abs = Math.abs(pos);
      const x = pos * STEP_X * cardU;
      const y = DROP_Y * abs * abs * cardU;
      const r = Math.sign(pos) * TILT * Math.pow(abs, TILT_CURVE);
      set(card, 'transform', `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${r.toFixed(2)}deg)`);
      set(card, 'zIndex', String(100 - Math.round(abs * 10)));
    });
  }

  // ---------- Цикл ----------
  let smoothY = window.scrollY;
  let t0 = null;

  function frame(now) {
    if (t0 === null) t0 = now;
    const y = window.scrollY;
    smoothY += (y - smoothY) * 0.12;
    if (Math.abs(y - smoothY) < 0.1) smoothY = y;

    // Прогресс первого экрана: вектор растёт, фон меняется
    const p = clamp01(smoothY / (heroH * 0.85));
    const cy = 464 * u * (1 - p) + (vh / 2) * p;
    set(swirl, 'transform', `translate3d(0, ${cy.toFixed(1)}px, 0) scale(${(1 + p * 0.6).toFixed(4)})`);
    set(tint, 'opacity', p.toFixed(3));
    set(blobs, 'transform', `translate3d(0, ${-y}px, 0)`);
    set(blobs, 'opacity', (1 - p).toFixed(3));

    // Первый блок уходит в размытие
    const out = clamp01((smoothY - heroH * 0.25) / (heroH * 0.5));
    fadeBlur(hero, 1 - out, 12);
    fadeBlur(header, 1 - out, 12);

    // Второй блок проявляется из размытия
    const introOnScreen = introTop - smoothY;
    const reveal = clamp01((vh * 0.85 - introOnScreen) / (vh * 0.55));
    fadeBlur(introSticky, reveal, 14);

    // Карточки
    layoutCards(clamp01((smoothY - introTop) / introLen));

    drawSwirl(reduceMotion ? 0 : (now - t0) / 1000, p);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  measure();
  requestAnimationFrame(frame);
})();
