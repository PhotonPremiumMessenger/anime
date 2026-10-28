/* ============================================================
   anime-style.js — аниме-декор
   Добавляет мелкие детали, из которых складывается «постерный»
   вид: полутон поверх фона, вертикальные надписи у разделов,
   стикеры-звёздочки и рамки-уголки. Всё это чистые CSS-элементы,
   поэтому страница не тяжелеет.

   Волна 12 добавила «вау»-слой: рамку кадра с уголками, штрих-
   код в углу, катакана-бегущую строку, звук печати и взрыв
   частиц при нажатии. Всё построено на transform и opacity,
   поэтому работает на телефоне без лагов.
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
  'game.html': '遊戯',
  'weakspots.html': '弱点',
  'favorites.html': '想い',
  'search.html': '探す',
  'updates.html': '更新',
  'register.html': '入門',
  'offline.html': '放置',
  'privacy.html': '約束'
};

// Римские цифры эпизода для верхней метки кадра
const ANIME_EPISODES = {
  'index.html': '第壱話',
  'lessons.html': '第弐話',
  'lesson.html': '第参話',
  'anime.html': '第四話',
  'tests.html': '第五話',
  'grammar.html': '第六話',
  'dictionary.html': '第七話',
  'video.html': '第八話',
  'profile.html': '第九話',
  'rating.html': '第十話'
};

/** Нынешняя страница без пути. */
function currentAnimePage() {
  const parts = window.location.pathname.split('/');
  const name = parts[parts.length - 1];
  return name || 'index.html';
}

/** Облегчённый режим — на телефоне тяжёлые эффекты не включаем. */
function animeLiteMode() {
  return document.documentElement.classList.contains('perf-lite');
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
  if (animeLiteMode()) return;

  document.querySelectorAll('.anime-card').forEach(card => {
    if (card.dataset.tiltMounted === '1') return;
    card.dataset.tiltMounted = '1';

    let frame = 0;
    let lastX = 0;
    let lastY = 0;
    let rect = null;

    const apply = () => {
      frame = 0;
      if (!rect || !rect.width || !rect.height) return;

      const x = lastX / rect.width - 0.5;
      const y = lastY / rect.height - 0.5;

      card.style.transform = 'translateY(-4px) rotateX(' + (-y * 3).toFixed(2) + 'deg) rotateY(' + (x * 3).toFixed(2) + 'deg)';
    };

    card.addEventListener('pointerenter', () => { rect = card.getBoundingClientRect(); });

    card.addEventListener('pointermove', event => {
      if (!rect) rect = card.getBoundingClientRect();
      lastX = event.clientX - rect.left;
      lastY = event.clientY - rect.top;

      if (frame) return;
      frame = requestAnimationFrame(apply);
    });

    card.addEventListener('pointerleave', () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      rect = null;
      card.style.transform = '';
    });
  });
}

/* ---------- Манга-края страницы ---------- */

/** Тонкая штриховка по краям экрана — как поля страницы манги. */
function mountEdges() {
  if (document.querySelector('.anime-edge')) return;
  if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) return;
  if (animeLiteMode()) return;

  ['left', 'right'].forEach(side => {
    const edge = document.createElement('div');
    edge.className = 'anime-edge anime-edge-' + side;
    edge.setAttribute('aria-hidden', 'true');
    document.body.appendChild(edge);
  });
}

/* ============================================================
   ВОЛНА 12: «ВАУ»-СЛОЙ
   ============================================================ */

/**
 * Рамка кадра: четыре уголка по краям экрана и метка эпизода.
 * Как будто страница — кадр из аниме. Совсем не двигается,
 * поэтому стоит ноль кадров в секунду.
 */
function mountFrame() {
  if (document.body.classList.contains('page-offline')) return;
  if (document.querySelector('.anime-frame')) return;

  const frame = document.createElement('div');
  frame.className = 'anime-frame';
  frame.setAttribute('aria-hidden', 'true');

  const episode = ANIME_EPISODES[currentAnimePage()] || '日本語';
  frame.innerHTML =
    '<span class="af-corner af-tl"></span>' +
    '<span class="af-corner af-tr"></span>' +
    '<span class="af-corner af-bl"></span>' +
    '<span class="af-corner af-br"></span>' +
    '<span class="af-episode">' + episode + '</span>' +
    '<span class="af-code">日本 · NIHONGO · 語</span>';

  document.body.appendChild(frame);
}

/**
 * Катакана-строка, которая бежит под шапкой один раз после загрузки.
 * Это единственный анимированный декор всего слоя: 12 секунд и
 * слой убирается из DOM, чтобы не занимать память.
 */
function mountKatakanaRun() {
  if (animeLiteMode()) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.anime-run')) return;

  const words = ['ニホンゴ', 'ガクシュウ', 'アニメ', 'ことば', 'ぶんぽう', 'たんご', 'にほん'];
  const strip = document.createElement('div');
  strip.className = 'anime-run';
  strip.setAttribute('aria-hidden', 'true');

  // Собираем длинную строку один раз, дальше её двигает CSS
  strip.innerHTML = '<span>' + (words.join(' · ') + ' · ').repeat(6) + '</span>';

  document.body.appendChild(strip);

  window.setTimeout(() => strip.remove(), 14000);
}

/**
 * Всплеск частиц при нажатии на главные кнопки.
 * Пять маленьких искр, которые разлетаются за 0.5 секунды, —
 * это compositor-only анимация, поэтому дешёвая.
 */
function mountTapBurst() {
  if (animeLiteMode()) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.documentElement.dataset.tapBurst === '1') return;

  document.documentElement.dataset.tapBurst = '1';

  document.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;

    const button = event.target.closest('.btn-primary, .btn-large, .lesson-card, .anime-card');
    if (!button) return;

    // Не сыплем искрами на каждом клике — только по свежим кнопкам
    const burst = document.createElement('span');
    burst.className = 'anime-burst';
    button.appendChild(burst);

    // Убираем после анимации: один узел живёт полсекунды
    window.setTimeout(() => burst.remove(), 620);
  }, { passive: true });
}

/**
 * Кандзи-подпись у разделов страницы: у каждого крупного блока
 * в левом верхнем углу появляется номер и иероглиф — как разворот
 * манги. Ничего не анимируется.
 */
function mountSectionNumbers() {
  if (animeLiteMode()) return;

  const sections = document.querySelectorAll('main .section > .container');
  sections.forEach((container, index) => {
    if (container.querySelector('.anime-sec-num')) return;

    const num = document.createElement('span');
    num.className = 'anime-sec-num';
    num.setAttribute('aria-hidden', 'true');
    num.textContent = String(index + 1).padStart(2, '0');

    container.appendChild(num);
  });
}

/**
 * Подпись «кликни» при наведении на карточку аниме: появляется
 * стрелка в правом нижнем углу. Чистый CSS через ::after.
 */
function mountCardHint() {
  document.querySelectorAll('.anime-card').forEach(card => {
    card.dataset.hint = '開く';
  });
}

/* ---------- Старт ---------- */

document.addEventListener('DOMContentLoaded', () => {
  mountHalftone();
  mountSideMark();
  mountSectionStars();
  mountTilt();
  mountEdges();

  // «Волна 12»
  mountFrame();
  mountKatakanaRun();
  mountTapBurst();
  mountSectionNumbers();
  mountCardHint();
});

/* Карточки каталога перерисовываются фильтрами — навешиваем заново */
document.addEventListener('anime-grid-rendered', () => {
  mountTilt();
  mountCardHint();
});

window.mountTilt = mountTilt;
window.mountEdges = mountEdges;
window.mountFrame = mountFrame;
