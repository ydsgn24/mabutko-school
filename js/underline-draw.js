// Анимация обводки под "комфортного": линия рисуется вдоль самого вектора
// (от его стартовой точки M... до конечной), а не прямоугольной обрезкой
// слева направо. Классический приём stroke-dasharray/stroke-dashoffset,
// длина берётся из самого path через getTotalLength(), поэтому подстраивается
// автоматически, даже если path в svg поменяется.

document.addEventListener('DOMContentLoaded', () => {
  const path = document.querySelector('.hero__underline-path');
  if (!path) return;

  const length = path.getTotalLength();

  path.style.strokeDasharray = String(length);
  path.style.strokeDashoffset = String(length);

  // форсируем reflow, чтобы браузер зафиксировал стартовое состояние
  // до того, как включится transition — иначе анимации не будет видно
  path.getBoundingClientRect();

  path.style.transition = 'stroke-dashoffset 1.1s ease-in-out';

  // старт синхронизирован с появлением заголовка (см. .hero__title в style.css)
  setTimeout(() => {
    path.style.strokeDashoffset = '0';
  }, 600);
});
