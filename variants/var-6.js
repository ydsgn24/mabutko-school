// Вариант 6: вектор на плашке первого экрана — тот же приём, что в script.js (01-gradient-vector.html):
// базовый градиент из макета + постоянно текущий перелив + мягкие блики внутри формы
// + яркий блик с хвостом, бегущий по контуру. Всё обрезается по форме размытого swirl.svg.
// Остальная страница работает на var-5.js.
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector('.split__swirl-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Форма размыта, поэтому рисуем в небольшом разрешении и растягиваем — это очень дёшево.
  const VB_W = 747.6;
  const VB_H = 425.6;
  const CW = 720;
  const CH = Math.round(CW * VB_H / VB_W);
  const K = CW / VB_W;
  const S = VB_W / 1209.6; // эта форма — уменьшенная копия вектора из 01-gradient-vector.html
  canvas.width = CW;
  canvas.height = CH;

  const mask = document.createElement('canvas');
  mask.width = CW;
  mask.height = CH;
  let maskReady = false;
  const img = new Image();
  img.onload = () => {
    mask.getContext('2d').drawImage(img, 0, 0, CW, CH);
    maskReady = true;
  };
  img.src = 'assets/v6/swirl.svg';

  // Точки контура: блик бежит по нему — по одному краю линии до конца и обратно по другому
  const pathEl = document.getElementById('swirl-path');
  const pathLen = pathEl.getTotalLength();
  const SAMPLES = 600;
  const pts = Array.from({ length: SAMPLES }, (_, i) => pathEl.getPointAtLength(i / SAMPLES * pathLen));

  function glow(x, y, r, rgb, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${alpha})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const FLOW_PERIOD = 1400 * S;
  const FLOW_COLORS = ['#718AA0', '#A9C6E1', '#FCF7F1', '#A9C6E1'];
  const FLOW_ANGLE = 20 * Math.PI / 180;
  const RUN_TIME = 8;

  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, CW, CH);
    ctx.setTransform(K, 0, 0, K, 0, 0);

    // 1. Базовый градиент из макета
    ctx.save();
    ctx.transform(444.166, 104.358, -195.259, 832.069, 277.634, 96.9806);
    const base = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    base.addColorStop(0.293, '#718AA0');
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
    glow(S * (300 + 350 * Math.sin(t * 0.57)), S * (220 + 130 * Math.sin(t * 0.74 + 1)), S * 340, '252,247,241', 0.8);
    glow(S * (850 + 330 * Math.sin(t * 0.42 + 2)), S * (420 + 120 * Math.sin(t * 0.55)), S * 380, '201,220,238', 0.75);
    glow(S * (600 + 250 * Math.sin(t * 0.7 + 4)), S * (330 + 90 * Math.sin(t * 0.9 + 2)), S * 300, '79,106,130', 0.6);

    // 4. Яркий блик с хвостом, бегущий по контуру
    ctx.globalCompositeOperation = 'lighter';
    const head = Math.floor((t / RUN_TIME % 1) * SAMPLES);
    const at = (i) => pts[((i % SAMPLES) + SAMPLES) % SAMPLES];
    for (let j = 18; j >= 0; j--) {
      const pt = at(head - j * 3);
      const a = Math.pow(1 - j / 19, 1.6);
      glow(pt.x, pt.y, S * (80 - j * 1.5), '252,247,241', 0.35 * a);
    }
    const hp = at(head);
    glow(hp.x, hp.y, S * 34, '255,255,255', 0.9);

    // 5. Обрезаем всё по форме вектора
    if (maskReady) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(mask, 0, 0);
    }
  }

  // Рисуем только когда плашка на экране
  let visible = true;
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(canvas);

  let t0 = null;
  function frame(now) {
    if (t0 === null) t0 = now;
    if (visible) draw(reduceMotion ? 0 : (now - t0) / 1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
