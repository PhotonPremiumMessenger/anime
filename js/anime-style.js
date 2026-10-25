/* ============================================================
   anime-style.js — аниме-декор
   Добавляет мелкие детали, из которых складывается «постерный»
   вид: полутон поверх фона, вертикальные надписи у разделов,
   стикеры-звёздочки и рамки-уголки. Всё это чистые CSS-элементы,
   поэтому страница не тяжелеет.
   ============================================================ */

'use strict';

// Вертикальные подписи для разных страниц
const ANIME_SIDE_MARKS = {
  'index.html': '物語',
  'lessons.html': '学び',
  'lesson.html': '稽古',
  'anime.html': '世界',
  'tests.html': '試練',
  'grammar.html': '文法',
  'dictionary.html': '言葉',
  'video.html': '映像',
  'profile.html': '旅路',
  'rating.html': '頂上',
  'shop.html': '店',
  'settings.html': '調整',
  'about.html': '物語',
  'exam.html': '試験',
  'flashcards.html': '暗記',
  'match.html': '遊び',
  'listening.html': '耳',
  'speed.html': '疾走',
  'weakspots.html': '弱点',
  'favorites.html': '想い',
  'search.html': '探す',
  'updates.html': '更新',
  'register.html': '入門'
};

/** Нынешняя страница без пути. */
function currentAnimePage() {
  const parts = window.location.pathname.split('/');
  const name = parts[parts.length - 1];
  return name || 'index.html';
}

/** Тонкий слой полутона поверх фона. */
function mountHalftone() {
  if (document.querySelector('.anime-halftone')) return;

  const layer = document.createElement('div');
  layer.className = 'anime-halftone';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
}

/** Вертикальная надпись слева у первого раздела. */
function mountSideMark() {
  const section = document.querySelector('main .section, main .catalog-hero, main .hero');
  if (!section || section.querySelector('.anime-side-mark')) return;

  const text = ANIME_SIDE_MARKS[currentAnimePage()] || '日本語';
  const mark = document.createElement('span');
  mark.className = 'anime-side-mark';
  mark.textContent = text;
  mark.setAttribute('aria-hidden', 'true');

  section.appendChild(mark);
}

/** Звёздочки-стикеры рядом с заголовками разделов. */
function mountSectionStars() {
  document.querySelectorAll('.section-head h2').forEach(title => {
    if (title.querySelector('.anime-star')) return;

    const star = document.createElement('span');
    star.className = 'anime-star';
    star.setAttribute('aria-hidden', 'true');
    star.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="m12 2 2.4 6.2L21 10.6l-5 4.2 1.4 6.5L12 17.9 6.6 21.3 8 14.8 3 10.6l6.6-2.4L12 2Z"/></svg>';

    title.appendChild(star);
  });
}

/**
 * Лёгкий наклон карточек при наведении — «оживляет» сетку.
 * Пересчёт идёт не чаще одного раза за кадр: pointermove сыплется
 * десятками событий в секунду, а getBoundingClientRect заставляет
 * браузер пересчитывать раскладку каждый раз.
 */
function mountTilt() {
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.anime-card').forEach(card => {
    if (card.dataset.tiltMounted === '1') return;
    card.dataset.tiltMounted = '1';

    let frame = 0;
    let lastX = 0;
    let lastY = 0;

    const apply = () => {
      frame = 0;

      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = lastX / rect.width - 0.5;
      const y = lastY / rect.height - 0.5;

      card.style.transform = 'translateY(-4px) rotateX(' + (-y * 3).toFixed(2) + 'deg) rotateY(' + (x * 3).toFixed(2) + 'deg)';
    };

    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      lastX = event.clientX - rect.left;
      lastY = event.clientY - rect.top;

      if (frame) return;
      frame = requestAnimationFrame(apply);
    });

    card.addEventListener('pointerleave', () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      card.style.transform = '';
    });
  });
}

/* ---------- Старт ---------- */

document.addEventListener('DOMContentLoaded', () => {
  mountHalftone();
  mountSideMark();
  mountSectionStars();
  mountTilt();
});

/* Карточки каталога перерисовываются фильтрами — навешиваем заново */
document.addEventListener('anime-grid-rendered', mountTilt);

window.mountTilt = mountTilt;
