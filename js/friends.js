/* ============================================================
   friends.js — друзья и рейтинг среди друзей
   Список друзей хранится в nihongo_friends и привязан к нику.
   Добавить можно аккаунт из этого браузера или демо-игрока
   из рейтинга: сервера нет, поэтому заявки «принимаются» локально.
   ============================================================ */

'use strict';

const FRIENDS_KEY = 'nihongo_friends';

/* ---------- Чтение и запись ---------- */

/** Все списки друзей по никам. */
function getAllFriendsMap() {
  const saved = readJSON(FRIENDS_KEY, {});
  return saved && typeof saved === 'object' ? saved : {};
}

/** Ник, чей список смотрим (по умолчанию — текущий игрок). */
function friendsOwner() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  return user ? user.username : 'guest';
}

/** Список друзей игрока. */
function getFriends(owner) {
  const map = getAllFriendsMap();
  const list = map[owner || friendsOwner()];
  return Array.isArray(list) ? list : [];
}

/** Сохраняет список друзей. */
function saveFriends(list, owner) {
  const map = getAllFriendsMap();
  map[owner || friendsOwner()] = list;
  writeJSON(FRIENDS_KEY, map);
}

/** Уже в друзьях или заявка отправлена. */
function getFriendStatus(name) {
  const friend = getFriends().find(item => item.name.toLowerCase() === String(name).toLowerCase());
  return friend ? friend.status : '';
}

/* ---------- Поиск игрока ---------- */

/**
 * Ищет игрока по нику: сначала среди аккаунтов браузера,
 * потом среди демо-соперников рейтинга.
 */
function findPlayer(name) {
  const needle = String(name || '').trim();
  if (!needle) return null;

  const account = typeof findUserByNickname === 'function' ? findUserByNickname(needle) : null;

  if (account) {
    return {
      name: account.username,
      avatar: account.avatar || 'assets/images/avatars/avatar1.png',
      xp: Math.max(0, Number(account.xp) || 0),
      demo: false
    };
  }

  const bots = window.RATING_BOTS || window.RATING_BOTS_DEMO || [];
  const bot = bots.find(item => item.username.toLowerCase() === needle.toLowerCase());

  if (bot) {
    return {
      name: bot.username,
      avatar: 'assets/images/avatars/avatar' + bot.avatar + '.png',
      xp: bot.xp,
      demo: true
    };
  }

  return null;
}

/* ---------- Добавление и удаление ---------- */

/** Отправляет заявку в друзья. */
function addFriend(name) {
  const player = findPlayer(name);

  if (!player) {
    if (typeof showToast === 'function') {
      showToast('Игрок не найден', 'Проверь ник — он должен совпадать точно', 'warning');
    }
    return false;
  }

  if (player.name.toLowerCase() === friendsOwner().toLowerCase()) {
    if (typeof showToast === 'function') showToast('Это ты', 'Себя в друзья добавлять не нужно 🙂', 'info');
    return false;
  }

  if (getFriendStatus(player.name)) {
    if (typeof showToast === 'function') showToast('Уже есть', player.name + ' уже в друзьях или ждёт ответа', 'info');
    return false;
  }

  const list = getFriends();
  list.push({
    name: player.name,
    avatar: player.avatar,
    xp: player.xp,
    demo: player.demo,
    status: 'pending',
    since: new Date().toISOString()
  });

  saveFriends(list);

  if (typeof showToast === 'function') {
    showToast('Заявка отправлена', player.name + ' получит уведомление', 'success');
  }

  // Демо-игрок отвечает сам: сервера нет, поэтому согласие приходит локально
  setTimeout(() => {
    const fresh = getFriends();
    const entry = fresh.find(item => item.name === player.name);
    if (!entry || entry.status !== 'pending') return;

    entry.status = 'accepted';
    entry.since = new Date().toISOString();
    saveFriends(fresh);

    if (typeof notifyAction === 'function') notifyAction('friend', 1, { reason: 'Новый друг' });

    if (typeof showToast === 'function') {
      showToast('Заявка принята', player.name + ' теперь у тебя в друзьях · +10 XP', 'success');
    }

    renderFriendsBlock();
    renderFriendsLeaderboard();
  }, player.demo ? 1400 : 2600);

  renderFriendsBlock();
  return true;
}

/** Удаляет из друзей. */
function removeFriend(name) {
  const list = getFriends().filter(item => item.name !== name);
  saveFriends(list);

  if (typeof showToast === 'function') showToast('Удалено', name + ' больше не в друзьях', 'info');

  renderFriendsBlock();
  renderFriendsLeaderboard();
}

/** Принимает заявку вручную (если она зависла). */
function acceptFriend(name) {
  const list = getFriends();
  const entry = list.find(item => item.name === name);
  if (!entry || entry.status === 'accepted') return;

  entry.status = 'accepted';
  entry.since = new Date().toISOString();
  saveFriends(list);

  if (typeof notifyAction === 'function') notifyAction('friend', 1, { reason: 'Новый друг' });
  if (typeof showToast === 'function') showToast('Принято', name + ' в друзьях', 'success');

  renderFriendsBlock();
  renderFriendsLeaderboard();
}

/* ---------- Блок друзей в профиле ---------- */

/** Рисует список друзей в профиле. */
function renderFriendsBlock() {
  const box = document.getElementById('friendsBlock');
  if (!box) return;

  const list = getFriends();
  const accepted = list.filter(item => item.status === 'accepted');
  const pending = list.filter(item => item.status === 'pending');

  const counter = document.getElementById('friendsCount');
  if (counter) counter.textContent = accepted.length + (pending.length ? ' · ' + pending.length + ' в ожидании' : '');

  if (!list.length) {
    box.innerHTML = `
      <div class="friends-empty">
        <div class="friends-empty-icon">👥</div>
        <div>
          <b>Пока никого</b>
          <span>Добавь друга по нику — вместе учиться веселее</span>
        </div>
      </div>
    `;
    return;
  }

  box.innerHTML = '';

  list.forEach(friend => {
    const row = document.createElement('div');
    row.className = 'friend-row' + (friend.status === 'pending' ? ' is-pending' : '');

    row.innerHTML = `
      <div class="friend-avatar">
        <img src="${friend.avatar}" alt="${friend.name}">
        <i class="friend-dot"></i>
      </div>
      <div class="friend-info">
        <b></b>
        <span></span>
      </div>
      <div class="friend-actions"></div>
    `;

    row.querySelector('.friend-info b').textContent = friend.name;
    row.querySelector('.friend-info span').textContent = friend.status === 'pending'
      ? 'заявка отправлена'
      : 'друзья с ' + formatFriendDate(friend.since);

    const actions = row.querySelector('.friend-actions');

    if (friend.status === 'pending') {
      const accept = document.createElement('button');
      accept.className = 'btn btn-primary btn-small';
      accept.textContent = 'Принять';
      accept.addEventListener('click', () => acceptFriend(friend.name));
      actions.appendChild(accept);
    }

    const remove = document.createElement('button');
    remove.className = 'btn btn-ghost btn-small friend-remove';
    remove.title = 'Удалить из друзей';
    remove.textContent = '×';
    remove.addEventListener('click', () => removeFriend(friend.name));
    actions.appendChild(remove);

    box.appendChild(row);
  });
}

/** Короткая дата для строки друга. */
function formatFriendDate(iso) {
  if (!iso) return 'недавно';
  const date = new Date(iso);
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return date.getDate() + ' ' + months[date.getMonth()];
}

/* ---------- Рейтинг друзей ---------- */

/** Собирает таблицу «я и мои друзья». */
function getFriendsLeaderboard() {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const myXP = typeof getXP === 'function' ? getXP() : 0;

  const rows = getFriends()
    .filter(friend => friend.status === 'accepted')
    .map(friend => {
      // У реального аккаунта опыт берём свежий
      const player = friend.demo ? null : (typeof findUserByNickname === 'function' ? findUserByNickname(friend.name) : null);
      return {
        name: friend.name,
        avatar: friend.avatar,
        xp: player ? Math.max(0, Number(player.xp) || 0) : friend.xp,
        isMe: false
      };
    });

  if (me) {
    rows.push({
      name: me.username,
      avatar: me.avatar || 'assets/images/avatars/avatar1.png',
      xp: myXP,
      isMe: true
    });
  }

  rows.sort((a, b) => b.xp - a.xp);
  rows.forEach((row, index) => {
    row.place = index + 1;
    row.level = typeof getLevelInfo === 'function' ? getLevelInfo(row.xp).level : 1;
  });

  return rows;
}

/** Рисует таблицу друзей. */
function renderFriendsLeaderboard() {
  const body = document.getElementById('friendsBoardBody');
  if (!body) return;

  const rows = getFriendsLeaderboard();

  body.innerHTML = '';

  if (rows.length <= 1) {
    body.innerHTML = `
      <tr><td colspan="4" class="rating-empty">
        Пока только ты. Добавь друзей на странице профиля — и здесь появится рейтинг.
      </td></tr>
    `;

    const note = document.getElementById('friendsBoardNote');
    if (note) note.textContent = 'Друзей: 0';
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.className = row.isMe ? 'is-me' : '';

    tr.innerHTML = `
      <td class="rating-place">${row.place === 1 ? '<span class="rating-medal">🥇</span>' : row.place}</td>
      <td class="rating-player">
        <img class="rating-avatar" src="${row.avatar}" alt="${row.name}">
        <span class="rating-name">${row.name}${row.isMe ? '<i class="rating-tag is-me-tag">ты</i>' : ''}</span>
      </td>
      <td class="rating-level"><b>${row.level}</b><span>ур.</span></td>
      <td class="rating-xp">${row.xp.toLocaleString('ru-RU')} XP</td>
    `;

    body.appendChild(tr);
  });

  const note = document.getElementById('friendsBoardNote');
  if (note) note.textContent = 'В круге: ' + rows.length;
}

/* ---------- Переключение вкладок рейтинга ---------- */

/** Показывает «ТОП-100» или «Друзья». */
function showRatingTab(tab, button) {
  const all = document.getElementById('ratingAllSection');
  const friends = document.getElementById('ratingFriendsSection');

  if (all) all.classList.toggle('hidden', tab !== 'all');
  if (friends) friends.classList.toggle('hidden', tab !== 'friends');

  document.querySelectorAll('.rating-tabs .chip').forEach(chip => chip.classList.remove('chip-active'));
  if (button) button.classList.add('chip-active');

  if (tab === 'friends') renderFriendsLeaderboard();
}

/* ---------- Форма добавления ---------- */

/** Обработчик кнопки «Добавить». */
function submitFriendForm() {
  const input = document.getElementById('friendNickInput');
  if (!input) return;

  const name = input.value.trim();
  if (!name) {
    if (typeof showToast === 'function') showToast('Пустой ник', 'Введи ник игрока', 'warning');
    return;
  }

  if (addFriend(name)) input.value = '';
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderFriendsBlock();
  renderFriendsLeaderboard();

  const input = document.getElementById('friendNickInput');
  if (input) {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') submitFriendForm();
    });
  }
});

/* Экспорт в глобальную область */
window.getFriends = getFriends;
window.addFriend = addFriend;
window.removeFriend = removeFriend;
window.acceptFriend = acceptFriend;
window.findPlayer = findPlayer;
window.renderFriendsBlock = renderFriendsBlock;
window.getFriendsLeaderboard = getFriendsLeaderboard;
window.renderFriendsLeaderboard = renderFriendsLeaderboard;
window.showRatingTab = showRatingTab;
window.submitFriendForm = submitFriendForm;
