/* ============================================================
   favorites.js — избранное
   Звёздочка у тайтлов, правил и слов. Список живёт в
   anilingo_favorites, показывается в профиле и на отдельной
   странице favorites.html.
   ============================================================ */

'use strict';

const FAVORITES_KEY = 'anilingo_favorites';

const FAVORITE_TYPES = {
  anime: { icon: '🎌', title: 'Аниме' },
  word: { icon: '📖', title: 'Слова' },
  grammar: { icon: '🈴', title: 'Грамматика' },
  test: { icon: '✅', title: 'Тесты' }
};

/* ---------- Хранилище ---------- */

/** Весь список избранного. */
function getFavorites() {
  const saved = readJSON(FAVORITES_KEY, []);
  return Array.isArray(saved) ? saved : [];
}

/** Избранное по типу. */
function getFavoritesByType(type) {
  return getFavorites().filter(item => item.type === type);
}

/** В избранном ли элемент. */
function isFavorite(type, id) {
  return getFavorites().some(item => item.type === type && String(item.id) === String(id));
}

/**
 * Добавляет или убирает элемент.
 * @param {string} type — anime | word | grammar | test
 * @param {string} id
 * @param {string} title
 * @param {string} url
 */
function toggleFavorite(type, id, title, url) {
  const list = getFavorites();
  const index = list.findIndex(item => item.type === type && String(item.id) === String(id));

  if (index >= 0) {
    list.splice(index, 1);
    writeJSON(FAVORITES_KEY, list);
    if (typeof showToast === 'function') showToast('Убрано из избранного', title || '', 'info');
  } else {
    list.unshift({
      type: type,
      id: String(id),
      title: String(title || ''),
      url: String(url || ''),
      at: new Date().toISOString()
    });
    writeJSON(FAVORITES_KEY, list);
    if (typeof showToast === 'function') showToast('В избранном', title || 'Добавлено', 'success');
    if (typeof addXP === 'function') addXP(1, 'Избранное');
  }

  refreshFavoriteButtons();
  renderFavorites();
  return isFavorite(type, id);
}

/** Удаляет конкретную запись. */
function removeFavorite(type, id) {
  const list = getFavorites().filter(item => !(item.type === type && String(item.id) === String(id)));
  writeJSON(FAVORITES_KEY, list);
  refreshFavoriteButtons();
  renderFavorites();
}

/** Очищает избранное. */
function clearFavorites() {
  writeJSON(FAVORITES_KEY, []);
  refreshFavoriteButtons();
  renderFavorites();
  if (typeof showToast === 'function') showToast('Избранное очищено', '', 'info');
}

/* ---------- Кнопки ---------- */

/**
 * Разметка кнопки-звёздочки.
 * @param {string} type
 * @param {string} id
 * @param {string} title
 * @param {string} url
 */
function favoriteButtonMarkup(type, id, title, url) {
  const active = isFavorite(type, id);

  return `<button class="fav-btn${active ? ' is-active' : ''}" type="button"
    data-fav-type="${type}" data-fav-id="${String(id).replace(/"/g, '&quot;')}"
    title="${active ? 'Убрать из избранного' : 'В избранное'}"
    aria-label="${active ? 'Убрать из избранного' : 'В избранное'}"
    onclick="event.stopPropagation(); toggleFavorite('${type}', this.dataset.favId, '${String(title).replace(/'/g, "\\'")}', '${String(url).replace(/'/g, "\\'")}')">
    <span>${active ? '★' : '☆'}</span>
  </button>`;
}

/** Обновляет состояние всех звёздочек на странице. */
function refreshFavoriteButtons() {
  document.querySelectorAll('.fav-btn[data-fav-id]').forEach(button => {
    const active = isFavorite(button.dataset.favType, button.dataset.favId);
    button.classList.toggle('is-active', active);
    button.title = active ? 'Убрать из избранного' : 'В избранное';
    const star = button.querySelector('span');
    if (star) star.textContent = active ? '★' : '☆';
  });
}

/**
 * Ставит звёздочку в карточку.
 * @param {HTMLElement} card
 * @param {string} type
 * @param {string} id
 * @param {string} title
 * @param {string} url
 */
function attachFavoriteButton(card, type, id, title, url) {
  if (!card || card.querySelector('.fav-btn')) return;
  card.insertAdjacentHTML('beforeend', favoriteButtonMarkup(type, id, title, url));
}

/* ---------- Отрисовка списка ---------- */

/** Рисует избранное в профиле и на странице избранного. */
function renderFavorites(containerId = 'favoritesBlock') {
  const box = document.getElementById(containerId);
  if (!box) return;

  const list = getFavorites();

  if (!list.length) {
    box.innerHTML = `
      <div class="weak-empty">
        <span>☆</span>
        <p>Пусто. Жми звёздочку у тайтла, правила или слова — всё соберётся здесь.</p>
        <a class="btn btn-outline btn-small" href="anime">Выбрать аниме</a>
      </div>
    `;
    return;
  }

  // Группируем по типу, чтобы список не превратился в кашу
  const groups = Object.keys(FAVORITE_TYPES)
    .map(type => ({ type: type, items: list.filter(item => item.type === type) }))
    .filter(group => group.items.length);

  box.innerHTML = groups.map(group => `
    <div class="fav-group">
      <h4>${FAVORITE_TYPES[group.type].icon} ${FAVORITE_TYPES[group.type].title}
        <span class="muted small">${group.items.length}</span></h4>
      <div class="fav-items">
        ${group.items.map(item => `
          <div class="fav-item">
            <a class="fav-link" href="${item.url || '#'}">${item.title}</a>
            <button class="fav-remove" onclick="removeFavorite('${item.type}', '${item.id}')" title="Убрать">✕</button>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderFavorites();
  refreshFavoriteButtons();
});

/* Экспорт в глобальную область */
window.getFavorites = getFavorites;
window.getFavoritesByType = getFavoritesByType;
window.isFavorite = isFavorite;
window.toggleFavorite = toggleFavorite;
window.removeFavorite = removeFavorite;
window.clearFavorites = clearFavorites;
window.favoriteButtonMarkup = favoriteButtonMarkup;
window.attachFavoriteButton = attachFavoriteButton;
window.refreshFavoriteButtons = refreshFavoriteButtons;
window.renderFavorites = renderFavorites;
