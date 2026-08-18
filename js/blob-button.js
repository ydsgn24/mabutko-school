// Блоб-кнопка: круг из N точек на canvas, между ними — кривые Безье
// (получается гладкая органическая форма). У точки, ближайшей к курсору,
// один раз (в момент входа/выхода) даётся импульс — дальше её "тянет"
// обратно к радиусу соседями и трением, как пружину.
//
// Физика (число точек, elasticity/friction, формула силы импульса от скорости
// курсора) сверена с рабочим прод-примером на potokpodcast.com — та же
// блоб-кнопка (десктопная ветка их кода: friction=0.05, elasticity=0.001).
//
// Состояния: idle (статичный круг без заливки) -> hover (заливка, лёгкий
// разовый прогиб внутрь в точке входа) -> tearing (заливка гаснет, разовый
// всплеск наружу в точке выхода) -> обратно idle.

const POINTS = 28;
const ELASTICITY = 0.001;
const FRICTION = 0.05;
const IMPULSE_VELOCITY_MULT = 10; // множитель скорости курсора при пересечении границы
const IMPULSE_CAP = 100; // потолок силы (как в референсе)
const CLAMP_RATIO = 0.7; // точка не может уйти дальше 70% радиуса — защита от выброса
const SETTLE_EPS = 0.8; // ниже этого считаем точку "успокоившейся"
const FADE_MS = 220; // угасание заливки после разрыва

function createPoints() {
  const points = [];
  for (let i = 0; i < POINTS; i++) {
    const angle = -Math.PI + (2 * Math.PI * i) / POINTS;
    points.push({ angle, cos: Math.cos(angle), sin: Math.sin(angle), speed: 0, radial: 0 });
  }
  return points;
}

function resetPoints(points) {
  points.forEach((p) => {
    p.speed = 0;
    p.radial = 0;
  });
}

function stepPoints(points, clamp) {
  const n = points.length;
  const accel = new Array(n);

  for (let i = 0; i < n; i++) {
    const left = points[(i - 1 + n) % n].radial;
    const right = points[(i + 1) % n].radial;
    const cur = points[i].radial;
    accel[i] = (-0.3 * cur + (left - cur) + (right - cur)) * ELASTICITY - points[i].speed * FRICTION;
  }

  for (let i = 0; i < n; i++) {
    points[i].speed += accel[i] * 2;
    const radial = points[i].radial + points[i].speed * 5;
    points[i].radial = Math.max(-clamp, Math.min(clamp, radial));
  }
}

function isSettled(points) {
  return points.every((p) => Math.abs(p.radial) < SETTLE_EPS && Math.abs(p.speed) < SETTLE_EPS);
}

function nearestPoint(points, angle) {
  let best = points[0];
  let bestDiff = Infinity;
  for (const p of points) {
    let diff = Math.abs(angle - p.angle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff; // кратчайшее расстояние по кругу
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best;
}

// Рисует гладкий блоб через середины отрезков между соседними точками
// (тот же приём, что и в оригинальном демо interactive-blob).
function drawBlob(ctx, points, center, radius, fillColor, fillAlpha, strokeColor, width, height) {
  ctx.clearRect(0, 0, width, height);

  const pos = (p) => ({
    x: center.x + p.cos * (radius + p.radial),
    y: center.y + p.sin * (radius + p.radial)
  });

  const n = points.length;
  const first = pos(points[0]);
  const last = pos(points[n - 1]);

  ctx.beginPath();
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);

  let prev = first;
  for (let i = 1; i <= n; i++) {
    const cur = pos(points[i % n]);
    const mid = { x: (prev.x + cur.x) / 2, y: (prev.y + cur.y) / 2 };
    ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
    prev = cur;
  }

  if (fillAlpha > 0) {
    ctx.globalAlpha = fillAlpha;
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();
}

function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d');
  // работаем дальше в CSS-пикселях — эта матрица сама пересчитает их в реальные
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function initBlobButton(container) {
  const canvas = container.querySelector('canvas');
  const text = container.querySelector('.hero__badge-text');
  if (!canvas) return;

  const fillColor = container.dataset.blobHoverColor || '#fcf7f1';
  const strokeColor = container.dataset.strokeColor || '#fcf7f1';
  const textColor = container.dataset.textColor || (text ? getComputedStyle(text).color : '#fcf7f1');
  const textHoverColor = container.dataset.textHoverColor || '#446c8f';

  const points = createPoints();
  let ctx, width, height, center, radius, clamp;

  function measure() {
    const fit = fitCanvas(canvas);
    ctx = fit.ctx;
    width = fit.width;
    height = fit.height;
    center = { x: width / 2, y: height / 2 };
    radius = Math.min(width, height) / 2.4;
    clamp = radius * CLAMP_RATIO;
  }

  measure();

  let state = 'idle'; // idle | hover | tearing
  let looping = false;
  let tearStart = 0;
  let oldMouse = { x: 0, y: 0 };

  function drawIdle() {
    resetPoints(points);
    drawBlob(ctx, points, center, radius, fillColor, 0, strokeColor, width, height);
  }

  function loop() {
    if (!looping) return;

    if (state === 'hover') {
      stepPoints(points, clamp);
      drawBlob(ctx, points, center, radius, fillColor, 1, strokeColor, width, height);
    } else if (state === 'tearing') {
      stepPoints(points, clamp);
      const elapsed = performance.now() - tearStart;
      const alpha = Math.max(0, 1 - elapsed / FADE_MS);
      drawBlob(ctx, points, center, radius, fillColor, alpha, strokeColor, width, height);

      const forceSettle = elapsed > FADE_MS + 2000; // страховка от бесконечного цикла
      if (alpha <= 0 && (isSettled(points) || forceSettle)) {
        looping = false;
        state = 'idle';
        drawIdle();
        return;
      }
    } else {
      looping = false;
      return;
    }

    requestAnimationFrame(loop);
  }

  function startLoop() {
    if (looping) return;
    looping = true;
    requestAnimationFrame(loop);
  }

  // Сила импульса пропорциональна тому, как быстро курсор двигался в момент
  // пересечения границы круга (как в референсе) — плавный заход даёт лёгкий
  // прогиб, резкий свайп через границу — заметно сильнее.
  function impulseAt(angle, pos, sign) {
    const point = nearestPoint(points, angle);
    let strength = Math.hypot(oldMouse.x - pos.x, oldMouse.y - pos.y) * IMPULSE_VELOCITY_MULT;
    if (strength > IMPULSE_CAP) strength = IMPULSE_CAP;
    point.speed += (strength / IMPULSE_CAP) * sign * 2;
  }

  drawIdle();

  container.addEventListener('pointermove', (e) => {
    const rect = container.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    if (dist < radius && state !== 'hover') {
      state = 'hover';
      if (text) text.style.color = textHoverColor;
      impulseAt(angle, pos, -1);
      startLoop();
    } else if (dist >= radius && state === 'hover') {
      if (text) text.style.color = textColor;
      impulseAt(angle, pos, 1);
      state = 'tearing';
      tearStart = performance.now();
      startLoop();
    }

    oldMouse = pos;
  });

  container.addEventListener('pointerleave', (e) => {
    if (state !== 'hover') return;
    const rect = container.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const angle = Math.atan2(pos.y - center.y, pos.x - center.x);

    if (text) text.style.color = textColor;
    impulseAt(angle, pos, 1);
    state = 'tearing';
    tearStart = performance.now();
    startLoop();
    oldMouse = pos;
  });

  window.addEventListener('resize', () => {
    measure();
    if (state === 'idle') drawIdle();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.js-blob-button').forEach(initBlobButton);
});
