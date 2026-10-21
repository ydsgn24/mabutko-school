// Вариант 9 — дополнение к script.js (первые два блока работают на нём):
//  • слой цветных пятен плавно тянется за курсором;
//  • переход к третьему блоку как на fromanother.love перед Future work:
//    фон перетекает в светлый, строки и фото размыты и бледные у нижнего края экрана,
//    резкие в середине и снова размываются, уходя за верхний край.
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileQuery = window.matchMedia('(max-width: 767px)');

  // ---------- Зерно (один раз, мелкое и слабое) ----------
  const noise = document.createElement('canvas');
  noise.width = noise.height = 200;
  const nctx = noise.getContext('2d');
  const img = nctx.createImageData(200, 200);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 40;
  }
  nctx.putImageData(img, 0, 0);
  document.documentElement.style.setProperty('--noise', `url(${noise.toDataURL()})`);

  const mobileQ = window.matchMedia('(max-width: 767px)');

  // ---------- Лента фото первого экрана (мобайл): дублируем набор для бесшовного цикла ----------
  const photos = document.querySelector('.hero__photos');
  [...photos.children].forEach((photo) => {
    const clone = photo.cloneNode(true);
    clone.classList.add('photo--clone');
    clone.setAttribute('aria-hidden', 'true');
    photos.appendChild(clone);
  });

  // ---------- Стопка карточек второго блока (мобайл) ----------
  const intro = document.querySelector('.intro');
  const stack = ['.card--blue', '.card--cream', '.card--sand', '.card--ink'].map((s) => intro.querySelector(s));
  const stackPhoto = intro.querySelector('.card--m-last');
  const STEP = 256;   // 240 карточка + 16 зазор
  const PEEK = 16;    // сколько остаётся видно от предыдущей карточки в стопке
  let stackWasOn = false;
  // пишем прямо в style (без общего кэша): script-9.js тоже сбрасывает стили карточек при resize
  const put = (el, prop, value) => { if (el.style[prop] !== value) el.style[prop] = value; };

  function layoutStack() {
    if (!mobileQ.matches) {
      if (stackWasOn) {
        [...stack, stackPhoto].forEach((card) => { card.style.transform = ''; card.style.zIndex = ''; });
        stackWasOn = false;
      }
      return;
    }
    stackWasOn = true;
    const s = Math.max(0, -intro.getBoundingClientRect().top); // сколько проскроллили внутри закреплённого блока
    stack.forEach((card, i) => {
      const y = Math.max(i * PEEK, i * STEP - s);
      put(card, 'transform', `translate3d(0px, ${y.toFixed(1)}px, 0px)`);
      put(card, 'zIndex', String(i + 1));
    });
    const py = Math.max(0, stack.length * STEP - s);
    put(stackPhoto, 'transform', `translate3d(0px, ${py.toFixed(1)}px, 0px)`);
    put(stackPhoto, 'zIndex', '10');
  }

  const glows = document.querySelector('.bg__glows');
  const cream = document.querySelector('.bg__cream');
  const calm = document.querySelector('.calm');
  const calmBlur = [...calm.querySelectorAll('.js-blur')];
  const calmPhotos = [...calm.querySelectorAll('.calm__photo')];
  // у второго блока размываем только уход вверх
  const introLeave = [...document.querySelectorAll('.intro__title, .intro .cards')];

  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  // ---------- Пятна за курсором ----------
  let mx = 0, my = 0, gx = 0, gy = 0;
  window.addEventListener('pointermove', (e) => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  // ---------- Применение стилей (пишем только если значение изменилось) ----------
  const last = new Map();
  function set(el, prop, value) {
    let rec = last.get(el);
    if (!rec) last.set(el, rec = {});
    if (rec[prop] === value) return;
    rec[prop] = value;
    el.style[prop] = value;
  }

  function blurBy(el, visible, maxBlur) {
    const blur = (1 - visible) * maxBlur;
    set(el, 'filter', blur < 0.05 ? 'none' : `blur(${blur.toFixed(2)}px)`);
    set(el, 'opacity', (0.12 + 0.88 * visible).toFixed(3));
  }

  function frame() {
    const vh = window.innerHeight;

    if (!reduceMotion) {
      gx += (mx - gx) * 0.04;
      gy += (my - gy) * 0.04;
      set(glows, 'transform', `translate3d(${(gx * 60).toFixed(1)}px, ${(gy * 60).toFixed(1)}px, 0)`);
    }

    // Фон перетекает в светлый, пока третий блок поднимается от низа к верхней трети экрана
    const calmTop = calm.getBoundingClientRect().top;
    const q = smooth(vh * 0.95, vh * 0.25, calmTop);
    set(cream, 'opacity', q.toFixed(3));

    // Второй блок размывается, уходя за верх экрана (только когда третий уже идёт)
    introLeave.forEach((el) => {
      const r = el.getBoundingClientRect();
      const c = r.top + r.height / 2;
      // размытие нарастает вместе с переходом фона, без рывка
      const out = Math.max(smooth(-vh * 0.05, vh * 0.3, c), 1 - q);
      blurBy(el, out, 14);
    });

    // Строки и фото третьего блока: проявляются из размытия снизу и размываются, уходя вверх
    const mobile = mobileQuery.matches;
    layoutStack();
    calmBlur.forEach((el) => {
      const r = el.getBoundingClientRect();
      const c = r.top + r.height / 2;
      const inV = smooth(vh * 0.98, vh * 0.62, c);
      const outV = smooth(-vh * 0.02, vh * 0.2, c);
      blurBy(el, inV * outV, mobile ? 8 : 14);
    });

    // Фото плывут с разной скоростью
    if (!reduceMotion) {
      const rect = calm.getBoundingClientRect();
      const offset = rect.top + rect.height / 2 - vh / 2;
      calmPhotos.forEach((photo) => {
        const speed = parseFloat(photo.dataset.speed) || 0;
        set(photo, 'transform', `translate3d(0, ${(offset * speed).toFixed(1)}px, 0)`);
      });
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
