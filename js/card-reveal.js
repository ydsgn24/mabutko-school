// Появление карточек статистики при скролле — тот же приём, что и на
// potokpodcast.com (isometric-animation): карточка стартует наклонённой
// назад и приподнятой, при скролле "укладывается" плашмя на место.
// Анимация привязана к прогрессу скролла (scrub), а не к таймеру.

document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll('.stats__card-wrap').forEach((wrap) => {
    const card = wrap.querySelector('.stats__card');
    if (!card) return;

    wrap.style.perspective = '1000px';
    wrap.style.transformStyle = 'preserve-3d';

    gsap.set(card, {
      transformOrigin: '50% 100%',
      y: '40%',
      rotationX: 50,
      scale: 1.3,
      z: -150,
      opacity: 0.8
    });

    gsap.to(card, {
      y: '0%',
      rotationX: 0,
      scale: 1,
      z: 0,
      opacity: 1,
      ease: 'power2.inOut',
      scrollTrigger: {
        trigger: wrap,
        start: 'top 90%',
        end: 'top 30%',
        scrub: 4
      }
    });
  });
});
