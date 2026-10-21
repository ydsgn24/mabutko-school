// Вариант 8, десктоп: пока первый экран «прилипает» (.hero-pin), выставляем --p от 0 до 1 —
// по нему в var-8.css видео сжимается к правому краю и гаснет, а шапка растягивается на всю ширину.
(function () {
  const pin = document.querySelector('.hero-pin');
  const hero = pin.querySelector('.hero');
  const desktop = window.matchMedia('(min-width: 768px)');
  let lastP = -1;

  function update() {
    const range = pin.offsetHeight - hero.offsetHeight;
    const p = desktop.matches && range > 0 ? Math.min(Math.max(-pin.getBoundingClientRect().top / range, 0), 1) : 0;
    const eased = p * p * (3 - 2 * p); // плавный старт и финиш
    if (Math.abs(eased - lastP) > 0.0005) {
      lastP = eased;
      hero.style.setProperty('--p', eased.toFixed(4));
    }
    requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
})();
