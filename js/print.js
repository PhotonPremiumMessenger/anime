/* ============================================================
   print.js — конспект урока
   Собирает из урока короткий конспект: слова, шаги, фразы —
   и открывает печать. Печатные стили лежат в CSS, поэтому
   в PDF уходит только текст, без меню, сакуры и фона.
   ============================================================ */

'use strict';

/** Данные урока по id. */
function printLessonData() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id')) || 1;
  return (window.nihongo_lessons || []).find(lesson => Number(lesson.id) === id) || null;
}

/** Собирает разметку конспекта. */
function buildLessonSheet(lesson) {
  if (!lesson) return '';

  const words = (lesson.words || []).map(word => `
    <tr><td class="sheet-jp">${word.jp}</td><td>${word.romaji || ''}</td><td>${word.ru}</td></tr>
  `).join('');

  const examples = (lesson.examples || []).map(item => `
    <li><span class="sheet-jp">${item.jp}</span> — ${item.ru}${item.romaji ? ' <i>(' + item.romaji + ')</i>' : ''}</li>
  `).join('');

  const theory = lesson.grammar || '';

  return `
    <div class="sheet">
      <header class="sheet-head">
        <div>
          <h1>${lesson.title}</h1>
          <p class="sheet-sub">AniLingo · урок ${lesson.id} · ${lesson.level || ''}</p>
        </div>
        <div class="sheet-mark">日本語</div>
      </header>

      <p class="sheet-desc">${lesson.description || ''}</p>

      ${words ? `<h2>Слова урока</h2>
        <table class="sheet-table">
          <thead><tr><th>Японский</th><th>Ромадзи</th><th>Перевод</th></tr></thead>
          <tbody>${words}</tbody>
        </table>` : ''}

      ${theory ? `<h2>Теория</h2><p class="sheet-theory">${theory}</p>` : ''}

      ${examples ? `<h2>Примеры</h2><ul class="sheet-phrases">${examples}</ul>` : ''}

      <footer class="sheet-foot">
        <span>photonpremiummessenger.github.io/anime</span>
        <span>${new Date().toLocaleDateString('ru-RU')}</span>
      </footer>
    </div>
  `;
}

/** Готовит конспект и вызывает печать. */
function printLesson() {
  const lesson = printLessonData();

  if (!lesson) {
    if (typeof showToast === 'function') showToast('Урок не найден', 'Открой урок из каталога', 'warning');
    return;
  }

  let sheet = document.getElementById('printSheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'printSheet';
    sheet.className = 'print-sheet';
    document.body.appendChild(sheet);
  }

  sheet.innerHTML = buildLessonSheet(lesson);

  // Ждём кадр, чтобы браузер успел применить стили
  setTimeout(() => window.print(), 120);

  if (typeof showToast === 'function') {
    showToast('Конспект готов', 'В окне печати выбери «Сохранить как PDF»', 'info');
  }
}

/** Скачивает конспект как HTML-файл (запасной путь). */
function downloadLessonSheet() {
  const lesson = printLessonData();
  if (!lesson) return;

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
    <title>${lesson.title} — конспект AniLingo</title>
    <link rel="stylesheet" href="css/print.css"></head>
    <body>${buildLessonSheet(lesson)}</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'nihongo-lesson-' + lesson.id + '.html';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* Экспорт в глобальную область */
window.printLesson = printLesson;
window.buildLessonSheet = buildLessonSheet;
window.downloadLessonSheet = downloadLessonSheet;
