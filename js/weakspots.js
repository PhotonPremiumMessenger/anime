/* ============================================================
   weakspots.js — слабые места
   Каждая ошибка записывается в anilingo_weak: предмет, тема,
   вопрос и правильный ответ. Дальше модуль считает, какие темы
   проваливаются чаще всего, и предлагает, что подтянуть.
   ============================================================ */

'use strict';

const WEAK_KEY = 'anilingo_weak';
const WEAK_LIMIT = 300;

/* ---------- Запись ошибок ---------- */

/** Все ошибки, новые сверху. */
function getMistakes() {
  const saved = readJSON(WEAK_KEY, []);
  return Array.isArray(saved) ? saved : [];
}

/**
 * Записывает ошибку.
 * @param {string} subject — раздел: «Тесты», «Словарь», «Грамматика»…
 * @param {string} topic — конкретная тема (урок, правило, уровень)
 * @param {string} prompt — вопрос
 * @param {string} right — верный ответ
 * @param {string} picked — что выбрал игрок
 */
function recordMistake(subject, topic, prompt, right, picked) {
  const list = getMistakes();

  const mistake = {
    subject: String(subject || 'Разное'),
    topic: String(topic || 'Без темы'),
    prompt: String(prompt || ''),
    right: String(right || ''),
    picked: String(picked || ''),
    at: new Date().toISOString()
  };

  // Одинаковые ошибки подряд не плодим: обновляем время
  const duplicate = list.find(item =>
    item.subject === mistake.subject &&
    item.prompt === mistake.prompt &&
    item.picked === mistake.picked
  );

  if (duplicate) duplicate.at = mistake.at;
  else list.unshift(mistake);

  writeJSON(WEAK_KEY, list.slice(0, WEAK_LIMIT));

  // Дневник ошибок в профиле перерисовывается сразу
  document.dispatchEvent(new CustomEvent('anilingo:mistake', { detail: { mistake: mistake } }));

  return mistake;
}

/** Очищает историю ошибок. */
function clearMistakes() {
  writeJSON(WEAK_KEY, []);
  renderWeakSpots();

  // Дневник ошибок в профиле тоже должен опустеть
  document.dispatchEvent(new CustomEvent('anilingo:mistake', { detail: { cleared: true } }));
  if (typeof showToast === 'function') showToast('История ошибок очищена', 'Начинаем с чистого листа', 'info');
}

/* ---------- Аналитика ---------- */

/**
 * Считает слабые темы.
 * Возвращает массив { subject, topic, count, lastAt, percent }.
 */
function getWeakTopics(limit = 6) {
  const list = getMistakes();
  const map = {};

  list.forEach(item => {
    const key = item.subject + '::' + item.topic;
    if (!map[key]) {
      map[key] = { subject: item.subject, topic: item.topic, count: 0, lastAt: item.at };
    }
    map[key].count += 1;
    if (item.at > map[key].lastAt) map[key].lastAt = item.at;
  });

  const all = Object.values(map).sort((a, b) => b.count - a.count);

  // Процент от всех ошибок — чтобы показать «долю боли»
  const total = list.length || 1;

  return all.slice(0, limit).map(item => Object.assign(item, {
    percent: Math.round((item.count / total) * 100)
  }));
}

/** Рекомендация: куда идти по слабой теме. */
function weakRecommendation(item) {
  const subject = item.subject.toLowerCase();

  if (subject.includes('грамматик')) return { url: 'grammar', text: 'Открыть грамматику' };
  if (subject.includes('слов') || subject.includes('флеш')) return { url: 'flashcards', text: 'Повторить карточки' };
  if (subject.includes('аудир')) return { url: 'listening', text: 'Потренировать слух' };
  if (subject.includes('тест')) return { url: 'tests', text: 'Пройти тесты' };
  if (subject.includes('экзамен')) return { url: 'exam', text: 'Пробный экзамен' };
  if (subject.includes('викторин')) return { url: './', text: 'Викторина дня' };
  return { url: 'lessons', text: 'К урокам' };
}

/* ---------- Отрисовка ---------- */

/** Рисует блок слабых мест в профиле. */
function renderWeakSpots() {
  const box = document.getElementById('weakSpots');
  if (!box) return;

  const topics = getWeakTopics();
  const mistakes = getMistakes();

  if (!topics.length) {
    box.innerHTML = `
      <div class="weak-empty">
        <span>🎯</span>
        <p>Ошибок пока нет. Пройди тест или викторину — и здесь появится разбор слабых тем.</p>
        <a class="btn btn-outline btn-small" href="tests">К тестам</a>
      </div>
    `;
    return;
  }

  box.innerHTML = `
    <div class="weak-summary">
      <div><b>${mistakes.length}</b><span>ошибок записано</span></div>
      <div><b>${topics[0].topic}</b><span>слабее всего</span></div>
    </div>

    <div class="weak-list">
      ${topics.map(item => {
        const rec = weakRecommendation(item);
        return `
          <div class="weak-row">
            <div class="weak-row-top">
              <b>${item.topic}</b>
              <span class="weak-subject">${item.subject}</span>
              <span class="weak-count">${item.count}</span>
            </div>
            <div class="progress-bar"><span style="width:${Math.max(8, item.percent)}%"></span></div>
            <a class="weak-link" href="${rec.url}">${rec.text} →</a>
          </div>
        `;
      }).join('')}
    </div>

    <div class="weak-foot">
      <span class="muted small">Учитываются тесты, викторина, экзамен, аудирование и карточки.</span>
      <button class="btn btn-ghost btn-small" onclick="clearMistakes()">Очистить историю</button>
    </div>
  `;
}

/** Последние ошибки списком (для страницы слабых мест). */
function renderMistakeList(containerId = 'mistakeList') {
  const box = document.getElementById(containerId);
  if (!box) return;

  const mistakes = getMistakes().slice(0, 40);

  if (!mistakes.length) {
    box.innerHTML = '<div class="empty-state">Пока пусто. Ошибки появятся после первого теста.</div>';
    return;
  }

  box.innerHTML = mistakes.map(item => `
    <div class="mistake-card">
      <div class="mistake-head">
        <span class="weak-subject">${item.subject}</span>
        <span class="muted small">${item.topic}</span>
        <time>${new Date(item.at).toLocaleDateString('ru-RU')}</time>
      </div>
      <p class="mistake-prompt">${item.prompt}</p>
      <div class="mistake-answers">
        <span class="is-wrong">${item.picked || '—'}</span>
        <span class="is-right">${item.right}</span>
      </div>
    </div>
  `).join('');
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderWeakSpots();
  if (document.getElementById('mistakeList')) renderMistakeList();
});

/* Экспорт в глобальную область */
window.getMistakes = getMistakes;
window.recordMistake = recordMistake;
window.clearMistakes = clearMistakes;
window.getWeakTopics = getWeakTopics;
window.renderWeakSpots = renderWeakSpots;
window.renderMistakeList = renderMistakeList;
