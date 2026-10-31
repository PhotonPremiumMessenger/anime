/* ============================================================
   perf.js — плавность на слабых устройствах
   Ничего не перерисовывает и не меняет вид: только убирает
   лишнюю работу браузера там, где её не видно.

   • телефонный режим: класс .perf-lite на <html> — из него
     выключаются бесконечные анимации и «стекло»;
   • шейдерные фильтры (backdrop-filter) у панелей, которые и так
     лежат на тёмном фоне, заменяются на плотную подложку —
     пиксель в пиксель не отличить, а compositor разгружается;
   • тяжёлые тени и свечения на телефоне становятся проще;
   • анимации останавливаются, когда вкладка скрыта.

   Всё решается один раз при загрузке — без слежения за прокруткой,
   поэтому сам файл ничего не стоит.
   ============================================================ */

'use strict';

const PERF_LITE_CLASS = 'perf-lite';
const PERF_SAVE_KEY = 'anilingo_light_graphics';   // ручной выключатель эффектов

/**
 * Устройство слабое? Телефон, мало ядер или включён режим
 * «меньше анимаций» в системе — тогда облегчённый режим.
 */
function perfIsWeakDevice() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const narrow = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return reduced || narrow || cores <= 4 || memory <= 4;
}

/**
 * Применяет класс к <html>. Делаем это как можно раньше, чтобы
 * браузер не успел запустить тяжёлые анимации.
 */
function perfApply() {
  const manualOff = (() => {
    try { return localStorage.getItem(PERF_SAVE_KEY) === 'off'; } catch (error) { return false; }
  })();

  const lite = manualOff || perfIsWeakDevice();

  document.documentElement.classList.toggle(PERF_LITE_CLASS, lite);
  document.documentElement.dataset.perf = lite ? 'lite' : 'full';

  return lite;
}

/**
 * Останавливает всё движущееся, когда вкладка не видна.
 * На телефоне в фоне страница почти не рисуется, но CSS-анимации
 * всё равно «крутят» compositor и греют батарею.
 */
function perfWatchVisibility() {
  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('perf-hidden', document.hidden);
  });
}

/* ---------- Старт ---------- */

// Класс нужен до первой отрисовки: скрипт подключён в <head>,
// но на всякий случай пробуем и сразу, и после разбора документа.
if (document.documentElement) perfApply();

document.addEventListener('DOMContentLoaded', () => {
  perfApply();
  perfWatchVisibility();
});

// Окно поменяло размер (повернули телефон) — пересчитываем режим
let perfResizeTimer = 0;
window.addEventListener('resize', () => {
  if (perfResizeTimer) return;

  perfResizeTimer = window.setTimeout(() => {
    perfResizeTimer = 0;
    perfApply();
  }, 400);
}, { passive: true });

/* Экспорт */
window.perfApply = perfApply;
window.perfIsWeakDevice = perfIsWeakDevice;
