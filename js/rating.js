/* ============================================================
   rating.js — рейтинг игроков ТОП-100
   Основа — аккаунты из nihongo_users (этот браузер).
   Рядом идут демо-соперники, чтобы таблица не была пустой:
   общая таблица на сервере пока не ведётся.
   ============================================================ */

'use strict';

/* ---------- Демо-соперники ---------- */

// Ники и опыт подобраны так, чтобы покрыть разные уровни.
// Сам список лежит в bots.js — он общий для друзей и публичных профилей.
const RATING_BOTS = window.RATING_BOTS_DEMO || [];

/* ---------- Данные рейтинга ---------- */

/**
 * Собирает список игроков: реальные аккаунты браузера + демо-соперники.
 * Возвращает массив, отсортированный по опыту.
 */
function getRatingPlayers() {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const currentAvatar = typeof getCurrentAvatar === 'function' ? getCurrentAvatar() : 'assets/images/avatars/avatar1.png';

  // Реальные аккаунты из localStorage
  const real = getUsers().map(user => ({
    username: user.username,
    xp: Math.max(0, Number(user.xp) || 0),
    avatar: user.avatar || 'assets/images/avatars/avatar1.png',
    isMe: Boolean(me && me.username === user.username),
    isBot: false
  }));

  // Демо-соперники (не сохраняются в аккаунты)
  const bots = RATING_BOTS.map(bot => ({
    username: bot.username,
    xp: bot.xp,
    avatar: 'assets/images/avatars/avatar' + bot.avatar + '.png',
    isMe: false,
    isBot: true
  }));

  const list = real.concat(bots);

  // Если игрок не авторизован, показываем его гостевой опыт отдельной строкой
  if (!me) {
    const guestXP = Math.max(0, Number(readJSON(XP_KEYS.guestXP, 0)) || 0);
    if (guestXP > 0) {
      list.push({
        username: 'Ты (гость)',
        xp: guestXP,
        avatar: currentAvatar,
        isMe: true,
        isBot: false
      });
    }
  }

  list.sort((a, b) => b.xp - a.xp || a.username.localeCompare(b.username));

  // Добавляем место и уровень
  list.forEach((player, index) => {
    player.place = index + 1;
    player.level = getLevelInfo(player.xp).level;
  });

  return list;
}

/* ---------- Отрисовка ---------- */

let ratingLimit = 100;
let ratingQuery = '';

/** Меняет лимит показа строк. */
function setRatingLimit(limit, button) {
  ratingLimit = limit;
  document.querySelectorAll('.rating-filters .chip').forEach(chip => chip.classList.remove('chip-active'));
  if (button) button.classList.add('chip-active');
  renderRating();
}

/** Ищет игрока по нику. */
function onRatingSearch(value) {
  ratingQuery = String(value || '').trim().toLowerCase();
  renderRating();
}

/** Медаль для первых трёх мест. */
function ratingMedal(place) {
  if (place === 1) return '🥇';
  if (place === 2) return '🥈';
  if (place === 3) return '🥉';
  return '';
}

/**
 * Рисует таблицу рейтинга и личную карточку места.
 */
function renderRating() {
  const body = document.getElementById('ratingBody');
  if (!body) return;

  const all = getRatingPlayers();
  const me = all.find(player => player.isMe);

  // Личная карточка
  const myPlace = document.getElementById('myPlace');
  const myXP = document.getElementById('myRatingXP');
  const myLevel = document.getElementById('myRatingLevel');
  const myTotal = document.getElementById('myRatingTotal');

  if (myPlace) myPlace.textContent = me ? '#' + me.place : '—';
  if (myXP) myXP.textContent = me ? me.xp + ' XP' : '0 XP';
  if (myLevel) myLevel.textContent = me ? me.level : '1';
  if (myTotal) myTotal.textContent = all.length;

  // Фильтр по нику + лимит
  const filtered = ratingQuery
    ? all.filter(player => player.username.toLowerCase().includes(ratingQuery))
    : all;

  const shown = filtered.slice(0, ratingLimit);

  body.innerHTML = '';

  if (!shown.length) {
    body.innerHTML = '<tr><td colspan="5" class="rating-empty">Никого не нашли. Попробуй другой ник.</td></tr>';
  }

  shown.forEach(player => {
    const row = document.createElement('tr');
    row.className = (player.isMe ? 'is-me ' : '') + (player.isBot ? 'is-bot' : '');

    // Место
    const placeCell = document.createElement('td');
    placeCell.className = 'rating-place';
    const medal = ratingMedal(player.place);
    if (medal) {
      placeCell.innerHTML = '<span class="rating-medal">' + medal + '</span>';
    } else {
      placeCell.textContent = player.place;
    }

    // Игрок
    const playerCell = document.createElement('td');
    playerCell.className = 'rating-player';

    const img = document.createElement('img');
    img.src = player.avatar;
    img.alt = player.username;
    img.className = 'rating-avatar';

    const nameWrap = document.createElement('span');
    nameWrap.className = 'rating-name';
    nameWrap.textContent = player.username;

    if (player.isMe) {
      const tag = document.createElement('i');
      tag.className = 'rating-tag is-me-tag';
      tag.textContent = 'ты';
      nameWrap.appendChild(tag);
    }

    playerCell.appendChild(img);
    playerCell.appendChild(nameWrap);

    // Уровень
    const levelCell = document.createElement('td');
    levelCell.className = 'rating-level';
    levelCell.innerHTML = '<b>' + player.level + '</b><span>ур.</span>';

    // Опыт
    const xpCell = document.createElement('td');
    xpCell.className = 'rating-xp';
    xpCell.textContent = player.xp.toLocaleString('ru-RU') + ' XP';

    // Прогресс до следующего уровня
    const barCell = document.createElement('td');
    barCell.className = 'rating-bar-cell';
    const info = getLevelInfo(player.xp);
    barCell.innerHTML = '<div class="mini-bar"><span style="width:' + info.percent + '%"></span></div>';

    row.appendChild(placeCell);
    row.appendChild(playerCell);
    row.appendChild(levelCell);
    row.appendChild(xpCell);
    row.appendChild(barCell);
    body.appendChild(row);
  });

  // Подпись под таблицей
  const note = document.getElementById('ratingNote');
  if (note) {
    note.textContent = ratingQuery
      ? 'Найдено: ' + filtered.length
      : 'Показано ' + shown.length + ' из ' + all.length + ' игроков';
  }
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('ratingBody')) return;

  renderRating();

  // Кнопка «Показать всех»
  // Ссылка rating.html#friends открывает вкладку друзей
  if (window.location.hash === '#friends' && typeof showRatingTab === 'function') {
    const chip = document.querySelectorAll('.rating-tabs .chip')[1];
    showRatingTab('friends', chip);
  }

  const more = document.getElementById('ratingMore');
  if (more) {
    more.addEventListener('click', () => {
      ratingLimit = 100;
      renderRating();
    });
  }
});

/* Экспорт в глобальную область */
window.RATING_BOTS = RATING_BOTS;
window.getRatingPlayers = getRatingPlayers;
window.renderRating = renderRating;
window.setRatingLimit = setRatingLimit;
window.onRatingSearch = onRatingSearch;
