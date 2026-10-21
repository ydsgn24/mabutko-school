// Вариант 5. Один цикл requestAnimationFrame на всю страницу:
//  • первый экран стартует, когда загрузился постер видео (класс .is-ready);
//  • заголовки «заливаются» цветом по линии на экране (как на референсе ashleybrookecs.com);
//  • десктоп: карточки едут веером, как Awards на fromanother.love —
//    от «левая в центре» до «правая видна целиком»;
//  • мобайл: карточки складываются в стопку (чистый CSS, position: sticky);
//  • фото третьего блока плывут с разной скоростью поверх текста.
(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileQuery = window.matchMedia('(max-width: 767px)');

  // ---------- Старт первого экрана ----------
  const video = document.querySelector('.hero__bg');
  let started = false;
  function start() {
    if (started) return;
    started = true;
    requestAnimationFrame(() => root.classList.add('is-ready'));
  }
  const poster = new Image();
  poster.onload = poster.onerror = start;
  poster.src = video.poster;
  setTimeout(start, 1200); // не держим экран пустым на медленной сети

  // iOS в режиме энергосбережения не запускает autoplay — пробуем ещё раз по первому касанию
  const play = () => video.play().catch(() => {});
  play();
  window.addEventListener('touchstart', play, { once: true, passive: true });

  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

  const intro = document.querySelector('.intro');
  const cards = [...intro.querySelectorAll('.card')];
  const fills = [...document.querySelectorAll('.js-fill')];
  const calm = document.querySelector('.calm');
  const calmPhotos = [...calm.querySelectorAll('.calm__photo')];

  // Карточки проявляются по очереди, когда блок попадает в кадр
  new IntersectionObserver((entries, obs) => {
    if (!entries[0].isIntersecting) return;
    intro.classList.add('is-in');
    obs.disconnect();
  }, { threshold: 0.15 }).observe(intro);

  // ---------- Размеры (пересчитываются только при resize) ----------
  let vw, vh, u, introTop, introLen, mobile;
  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    mobile = mobileQuery.matches;
    u = parseFloat(getComputedStyle(cards[0]).width) / 360;
    introTop = intro.offsetTop;
    introLen = intro.offsetHeight - vh;
    last.clear();
    cards.forEach((card) => {
      card.style.transform = '';
      card.style.zIndex = '';
    });
  }

  // ---------- Применение стилей (пишем только если значение изменилось) ----------
  const last = new Map();
  function set(el, prop, value) {
    let rec = last.get(el);
    if (!rec) last.set(el, rec = {});
    if (rec[prop] === value) return;
    rec[prop] = value;
    if (prop.startsWith('--')) el.style.setProperty(prop, value);
    else el.style[prop] = value;
  }

  // ---------- Заливка заголовков ----------
  // Линия заливки — на 62% высоты экрана: всё, что выше неё, уже цветное.
  function layoutFills() {
    const line = vh * 0.62;
    fills.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const fill = Math.min(Math.max(line - rect.top, -10), rect.height + 10);
      set(el, '--fill', `${fill.toFixed(1)}px`);
    });
  }

  // ---------- Карусель (десктоп) ----------
  // Формула как у Awards на fromanother.love: rel — позиция карточки относительно центра в шагах,
  // сдвиг = шаг · rel, опускание = GAP_Y · |rel|^1.5, наклон = 4° · rel вокруг точки ниже карточки.
  const STEP_X = 385;
  const GAP_Y = 23;
  const ROT_PER_STEP = 4;
  const EDGE_GAP = 32;   // отступ крайней правой карточки от края экрана
  const HALF_BOX = 230;  // полуширина наклонённой карточки с учётом сдвига от поворота (px макета)
  const deskCards = cards.filter((card) => !card.classList.contains('card--m-only'));

  function layoutCarousel(progress) {
    const step = STEP_X * u;
    const lastRel = deskCards.length - 1;
    // в конце правая карточка целиком в кадре: её правый край — у края экрана
    const endRel = Math.min(lastRel, (vw / 2 - EDGE_GAP - HALF_BOX * u) / step);
    const shift = progress * (lastRel - Math.max(0, endRel));

    deskCards.forEach((card, i) => {
      const rel = i - shift;
      const x = rel * step;
      const y = GAP_Y * Math.pow(Math.abs(rel), 1.5) * u;
      set(card, 'transform', `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(rel * ROT_PER_STEP).toFixed(2)}deg)`);
      set(card, 'zIndex', String(100 - Math.round(Math.abs(rel) * 10)));
    });
  }

  // ---------- Фото третьего блока ----------
  function layoutCalm() {
    const rect = calm.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > vh) return;
    // 0 — блок в центре экрана; знак — выше/ниже
    const offset = rect.top + rect.height / 2 - vh / 2;
    calmPhotos.forEach((photo) => {
      // на мобайле своя скорость (data-speed-m): фото лишь касаются текста
      const speed = parseFloat(mobile && photo.dataset.speedM ? photo.dataset.speedM : photo.dataset.speed) || 0;
      set(photo, 'transform', `translate3d(0, ${(offset * speed).toFixed(1)}px, 0)`);
    });
  }

  // ---------- Цикл ----------
  let smoothY = window.scrollY;

  function frame() {
    const y = window.scrollY;
    smoothY += (y - smoothY) * (reduceMotion ? 1 : 0.12);
    if (Math.abs(y - smoothY) < 0.1) smoothY = y;

    layoutFills();
    if (!mobile) layoutCarousel(clamp01((smoothY - introTop) / introLen));
    if (!reduceMotion) layoutCalm();

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  measure();
  requestAnimationFrame(frame);
})();
