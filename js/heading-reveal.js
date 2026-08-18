// "Плавное написание" заголовка блока .stats — тот же приём, что и на
// potokpodcast.com (GSAP SplitText: type "lines", анимация self.lines).
// У нас строки уже разбиты вручную на <p>, поэтому строим тот же эффект
// (каждая строка выезжает снизу с задержкой) напрямую через GSAP, без
// сторонней бета-библиотеки SplitText.

document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined') return;

  const title = document.querySelector('.stats__title');
  if (!title) return;

  const lines = title.querySelectorAll('p');
  if (!lines.length) return;

  gsap.set(lines, { yPercent: 100, opacity: 0 });

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        gsap.to(lines, {
          duration: 1.2,
          yPercent: 0,
          opacity: 1,
          stagger: 0.15,
          ease: 'power2.out'
        });
        obs.disconnect();
      });
    },
    { threshold: 0.5, rootMargin: '0px 0px -100px 0px' }
  );

  observer.observe(title);
});
