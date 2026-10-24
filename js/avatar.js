/* ============================================================
   avatar.js — выбор и хранение аватара игрока
   Аватар лежит в localStorage под ключом 'avatar'.
   ============================================================ */

'use strict';

// Восемь стандартных аватарок из assets/images/avatars
const AVATARS = [
  'assets/images/avatars/avatar1.png',
  'assets/images/avatars/avatar2.png',
  'assets/images/avatars/avatar3.png',
  'assets/images/avatars/avatar4.png',
  'assets/images/avatars/avatar5.png',
  'assets/images/avatars/avatar6.png',
  'assets/images/avatars/avatar7.png',
  'assets/images/avatars/avatar8.png'
];

// Ключ в localStorage
const AVATAR_KEY = 'avatar';

/**
 * Список доступных аватаров: 8 стандартных + купленные в магазине.
 * Магазин может быть не подключён на странице — тогда только стандартные.
 */
function getAvailableAvatars() {
  const list = AVATARS.slice();

  if (typeof getShopState === 'function' && typeof SHOP_ITEMS !== 'undefined') {
    const owned = getShopState().owned;
    SHOP_ITEMS.forEach(item => {
      if (item.category === 'avatar' && owned.includes(item.id) && !list.includes(item.value)) {
        list.push(item.value);
      }
    });
  }

  return list;
}

/**
 * Возвращает путь к текущему аватару.
 * Если ничего не выбрано — первый из набора.
 */
function getCurrentAvatar() {
  // Сначала смотрим аватар в аккаунте, потом в отдельном ключе (для гостя)
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const saved = (user && user.avatar) || localStorage.getItem(AVATAR_KEY);

  return getAvailableAvatars().includes(saved) ? saved : AVATARS[0];
}

/**
 * Сохраняет выбранный аватар и обновляет его на странице.
 * @param {string} path — путь из массива AVATARS
 */
function setAvatar(path) {
  if (!getAvailableAvatars().includes(path)) {
    showToast('Не получилось', 'Этот аватар ещё не открыт — загляни в магазин', 'warning');
    return;
  }

  localStorage.setItem(AVATAR_KEY, path);

  // Сохраняем аватар в аккаунт, чтобы он пережил выход и повторный вход
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (user && typeof updateUserRecord === 'function') {
    updateUserRecord(user.username, { avatar: path });
  }

  updateAllAvatars();

  showToast('Аватар обновлён', 'Новый образ уже в профиле', 'success');
}

/**
 * Ставит случайный аватар, не совпадающий с текущим.
 */
function setRandomAvatar() {
  const current = getCurrentAvatar();
  const pool = getAvailableAvatars();
  let next = current;

  // Крутим до тех пор, пока не выпадет другой
  while (next === current && pool.length > 1) {
    next = pool[Math.floor(Math.random() * pool.length)];
  }

  setAvatar(next);
}

/**
 * Обновляет все аватары на странице:
 * в шапке, в профиле, в настройках и в модалке выбора.
 */
function updateAllAvatars() {
  const current = getCurrentAvatar();

  document.querySelectorAll('[data-avatar-img]').forEach(img => {
    img.src = current;
  });

  // Отмечаем выбранный вариант в сетке модалки
  document.querySelectorAll('.avatar-option').forEach(option => {
    option.classList.toggle('selected', option.dataset.avatar === current);
  });
}

/* ---------- Модалка выбора аватара ---------- */

/** Открывает модалку и строит сетку 4x2. */
function openAvatarModal() {
  const modal = document.getElementById('avatarModal');
  if (!modal) return;

  // Сбрасываем флаг, чтобы подхватить аватары, купленные в магазине
  const grid = document.getElementById('avatarGrid');
  if (grid) grid.dataset.ready = 'false';

  renderAvatarGrid();
  modal.classList.add('open');
  updateAllAvatars();
}

/** Закрывает модалку. */
function closeAvatarModal() {
  const modal = document.getElementById('avatarModal');
  if (modal) modal.classList.remove('open');
}

/**
 * Строит сетку из 8 аватаров.
 * Вызывается при открытии модалки, чтобы не дублировать разметку в HTML.
 */
function renderAvatarGrid() {
  const grid = document.getElementById('avatarGrid');
  if (!grid || grid.dataset.ready === 'true') return;

  grid.innerHTML = '';

  getAvailableAvatars().forEach((path, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'avatar-option';
    button.dataset.avatar = path;
    button.title = 'Аватар ' + (index + 1);

    const img = document.createElement('img');
    img.src = path;
    img.alt = 'Аватар ' + (index + 1);

    // Премиальные аватары из магазина помечаем звёздочкой
    if (!AVATARS.includes(path)) {
      const mark = document.createElement('span');
      mark.className = 'avatar-premium-mark';
      mark.textContent = '★';
      button.appendChild(mark);
    }

    button.appendChild(img);
    button.addEventListener('click', () => selectAvatar(path, button));
    grid.appendChild(button);
  });

  grid.dataset.ready = 'true';
}

/**
 * Выбирает аватар из сетки и закрывает модалку.
 * @param {string} path
 * @param {HTMLElement} element — нажатая кнопка
 */
function selectAvatar(path, element) {
  document.querySelectorAll('.avatar-option').forEach(option => option.classList.remove('selected'));
  if (element) element.classList.add('selected');

  setAvatar(path);

  // Небольшая пауза, чтобы пользователь увидел галочку
  setTimeout(closeAvatarModal, 320);
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  updateAllAvatars();

  // Клик по затемнению закрывает модалку
  const modal = document.getElementById('avatarModal');
  if (modal) {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeAvatarModal();
    });
  }

  // Esc закрывает модалку
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeAvatarModal();
  });
});

/* Экспорт в глобальную область */
window.AVATARS = AVATARS;
window.getAvailableAvatars = getAvailableAvatars;
window.getCurrentAvatar = getCurrentAvatar;
window.setAvatar = setAvatar;
window.setRandomAvatar = setRandomAvatar;
window.updateAllAvatars = updateAllAvatars;
window.openAvatarModal = openAvatarModal;
window.closeAvatarModal = closeAvatarModal;
window.selectAvatar = selectAvatar;
