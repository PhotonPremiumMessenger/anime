/* ============================================================
   progress-map.js — карта прогресса курса (lessons.html)
   Сетка всех уроков: пройденные — оранжевые, текущий —
   пульсирует, будущие — серые. Статус берётся из
   anilingo_progress и anilingo_completed_lessons.
   ============================================================ */

'use strict';

/** Статус урока: completed | current | locked. */
function getLessonMapStatus(lessonId, completedIds, currentId) {
  if (completedIds.includes(String(lessonId))) return 'completed';
  if (String(lessonId) === String(currentId)) return 'current';
  return 'locked';
}

/** Рисует карту прогресса. */
function renderProgressMap() {
  const box = document.getElementById('progressMap');
  if (!box) return;

  const lessons = window.anilingo_lessons || [];
  if (!lessons.length) return;

  const completed = typeof getCompletedLessonIds === 'function' ? getCompletedLessonIds() : [];

  // Текущий урок: тот, что начат, иначе первый непройденный
  const active = typeof getActiveLesson === 'function' ? getActiveLesson() : null;
  const firstFresh = lessons.find(lesson => !completed.includes(String(lesson.id)));

  const currentId = active
    ? active.lessonId
    : (firstFresh ? firstFresh.id : lessons[lessons.length - 1].id);

  box.innerHTML = lessons.map((lesson, index) => {
    const status = getLessonMapStatus(lesson.id, completed, currentId);
    const statusText = status === 'completed' ? 'Пройден' : (status === 'current' ? 'Сейчас' : 'Впереди');

    return `
      <a class="lesson-card pm-card ${status}" href="lesson?id=${lesson.id}"
         title="${statusText}: ${lesson.title}">
        <span class="pm-index">${String(index + 1).padStart(2, '0')}</span>
        <span class="pm-body">
          <b>${lesson.title}</b>
          <small>${lesson.level} · ${lesson.duration} мин</small>
        </span>
        <span class="pm-mark">${status === 'completed' ? '✓' : (status === 'current' ? '▶' : '·')}</span>
      </a>
    `;
  }).join('');

  const note = document.getElementById('progressMapNote');
  if (note) {
    note.textContent = completed.length + ' из ' + lessons.length + ' пройдено';
  }
}

document.addEventListener('DOMContentLoaded', renderProgressMap);

/* Экспорт в глобальную область */
window.renderProgressMap = renderProgressMap;
window.getLessonMapStatus = getLessonMapStatus;
