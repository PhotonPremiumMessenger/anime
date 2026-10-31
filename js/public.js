/* ============================================================
   public.js — публичный профиль profile.html?user=ник
   Показывает чужой профиль без входа: уровень, опыт, достижения,
   био и место в рейтинге. Приватные настройки скрыты.
   ============================================================ */

'use strict';

/** Есть ли в адресе параметр user. */
function getPublicNickname() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('user');
  return name ? name.trim() : '';
}

/** Публичный режим включён. */
function isPublicView() {
  return Boolean(getPublicNickname());
}

/**
 * Собирает данные профиля по нику.
 * Аккаунты берём из anilingo_users, демо-игроков — из рейтинга.
 */
function getPublicProfile(name) {
  const nickname = String(name || '').trim();
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  const account = typeof findUserByNickname === 'function' ? findUserByNickname(nickname) : null;

  if (account) {
    const xp = Math.max(0, Number(account.xp) || 0);
    const info = typeof getLevelInfo === 'function'
      ? getLevelInfo(xp)
      : { level: 1, percent: 0, nextAt: 100, need: 100 };

    // Достижения хранятся на браузер, поэтому у чужих аккаунтов их нет
    const isMe = Boolean(me && me.username === account.username);

    return {
      name: account.username,
      avatar: typeof isAvatarPicture === 'function' && isAvatarPicture(account.avatar) ? account.avatar : '',
      xp: xp,
      level: info.level,
      levelInfo: info,
      bio: String(account.bio || ''),
      city: String(account.city || ''),
      favorite: String(account.favorite || ''),
      createdAt: account.createdAt || new Date().toISOString(),
      isMe: isMe,
      isDemo: false,
      achievements: isMe && typeof getUnlockedAchievements === 'function'
        ? getUnlockedAchievements().length
        : 0,
      lessons: isMe ? countPublicLessons() : 0,
      words: isMe ? countPublicWords() : 0,
      streak: isMe && typeof getStreak === 'function' ? getStreak().count : 0,
      friends: 0
    };
  }

  // Демо-игрок из рейтинга
  const bots = window.RATING_BOTS || window.RATING_BOTS_DEMO || [];
  const bot = bots.find(item => item.username.toLowerCase() === nickname.toLowerCase());
  if (!bot) return null;

  const info = typeof getLevelInfo === 'function'
    ? getLevelInfo(bot.xp)
    : { level: 1, percent: 0, nextAt: 100, need: 100 };

  return {
    name: bot.username,
    avatar: '',
    xp: bot.xp,
    level: info.level,
    levelInfo: info,
    bio: 'Демо-профиль из рейтинга AniLingo.',
    city: '',
    favorite: '',
    createdAt: '',
    isMe: false,
    isDemo: true,
    achievements: 0,
    lessons: 0,
    words: 0,
    streak: 0,
    friends: 0,
    place: typeof getRatingPlayers === 'function'
      ? (getRatingPlayers().find(player => player.username === bot.username) || {}).place
      : null
  };
}

/** Сколько уроков пройдено (для своего профиля). */
function countPublicLessons() {
  if (typeof getProgress !== 'function') return 0;
  const progress = getProgress();

  return Object.keys(progress.lessons || {}).filter(
    id => progress.lessons[id] && progress.lessons[id].completed
  ).length;
}

/** Сколько слов в копилке. */
function countPublicWords() {
  if (typeof getProgress !== 'function') return 0;
  const progress = getProgress();
  return Array.isArray(progress.words) ? progress.words.length : 0;
}

/* ---------- Данные с сервера ---------- */

// Сюда попадает ответ /api/public/user/:ник. Нужен, чтобы чужие
// профили и их аватары были видны на любом устройстве, а не только
// в том браузере, где аккаунт создавали.
let publicRemote = { name: '', data: null };

/** Профиль из ответа сервера — тем же набором полей, что у локального. */
function publicProfileFromServer(name, data) {
  const xp = Math.max(0, Number(data.xp) || 0);
  const info = typeof getLevelInfo === 'function'
    ? getLevelInfo(xp)
    : { level: 1, percent: 0, need: 100 };

  return {
    name: data.username || name,
    avatar: data.avatar || '',
    xp: xp,
    level: Number(data.level) || info.level,
    levelInfo: info,
    bio: '',
    city: '',
    favorite: '',
    createdAt: data.createdAt || '',
    isMe: false,
    isDemo: false,
    remote: true,
    achievements: 0,
    lessons: 0,
    words: 0,
    streak: 0,
    friends: 0,
    place: null
  };
}

/* ---------- Отрисовка ---------- */

/** Рисует публичный профиль вместо личного. */
function renderPublicProfile() {
  const nickname = getPublicNickname();
  let profile = getPublicProfile(nickname);

  // В этом браузере аккаунта нет, но он есть на сервере — показываем его
  if (!profile && publicRemote.data && publicRemote.name === nickname.toLowerCase()) {
    profile = publicProfileFromServer(nickname, publicRemote.data);
  }

  document.body.classList.add('public-profile');

  const root = document.querySelector('.profile-section .container');
  if (!root) return;

  // Хозяин профиля отключил показ по ссылке — уважаем выбор
  const closed = typeof prefValue === 'function' && prefValue('launcher.publicProfile', true) === false;
  if (closed && profile && profile.isMe) {
    root.innerHTML = `
      <div class="public-missing">
        <div class="public-missing-icon">${typeof icon === 'function' ? icon('lock') : ''}</div>
        <h1>Профиль закрыт</h1>
        <p>Показ профиля по ссылке выключен в настройках → «Лаунчер».
           Включи «Публичный профиль», и ссылка снова начнёт работать.</p>
        <div class="btn-row" style="justify-content:center">
          <a class="btn btn-primary" href="settings#launcher">Открыть настройки</a>
          <a class="btn btn-outline" href="profile">Мой профиль</a>
        </div>
      </div>
    `;
    document.title = 'Профиль закрыт — AniLingo';
    return;
  }

  if (!profile) {
    root.innerHTML = `
      <div class="public-missing">
        <div class="public-missing-icon">🔍</div>
        <h1>Профиль не найден</h1>
        <p>Игрока с ником «${escapeBio(nickname)}» не нашлось. Проверьте ник —
           он должен совпадать точно, включая регистр букв.</p>
        <div class="btn-row" style="justify-content:center">
          <a class="btn btn-primary" href="rating">К рейтингу</a>
          <a class="btn btn-outline" href="profile">Мой профиль</a>
        </div>
      </div>
    `;
    document.title = 'Профиль не найден — AniLingo';
    return;
  }

  document.title = profile.name + ' — профиль AniLingo';

  const joined = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const percent = Math.min(100, Math.round(profile.levelInfo.percent || 0));
  const nextNeed = profile.levelInfo.need || 0;

  root.innerHTML = `
    <div class="public-layout">
      <aside class="player-card public-card">
        <div class="public-cover"></div>

        <div class="public-avatar">
          ${typeof avatarMarkup === 'function'
            ? avatarMarkup(profile.name, {
              size: 180,
              photo: publicRemote.name === profile.name.toLowerCase() && publicRemote.data
                ? (publicRemote.data.avatar || profile.avatar)
                : profile.avatar
            })
            : ''}
        </div>

        <h1 class="player-nick">
          <span>${escapeBio(profile.name)}</span>
          <span class="player-badge-icon hidden" data-profile-badge></span>
        </h1>

        <div class="player-status"><i></i> ${profile.isDemo ? 'демо-профиль' : 'в сети'}</div>

        <div class="player-rank">⛩ Уровень <b>${profile.level}</b>${profile.place ? ' · #' + profile.place + ' в рейтинге' : ''}</div>

        <div class="xp-block">
          <div class="xp-top">
            <span>Опыт</span>
            <b>${profile.xp.toLocaleString('ru-RU')} XP</b>
          </div>
          <div class="xp-bar"><span style="width:${percent}%"></span></div>
        </div>

        <hr class="divider">

        <div class="player-meta">
          ${joined ? `<div>В AniLingo с <b>${joined}</b></div>` : ''}
          <div>Серия <b>${profile.streak || 0} 🔥</b></div>
        </div>

        <div class="public-actions">
          ${profile.isMe
            ? '<a class="btn btn-primary btn-small" href="profile">Редактировать профиль</a>'
            : `<button class="btn btn-primary btn-small" onclick="addFriend('${escapeBio(profile.name)}'); renderFriendsBlock()">Добавить в друзья</button>`}
          <button class="btn btn-outline btn-small" onclick="copyProfileLink('${escapeBio(profile.name)}')">Скопировать ссылку</button>
        </div>
      </aside>

      <div class="profile-main">
        ${profile.bio || profile.city || profile.favorite ? `
          <section class="block reveal">
            <div class="block-head"><h3>О игроке</h3></div>
            <div class="public-bio">
              ${profile.bio ? `<p>${escapeBio(profile.bio)}</p>` : ''}
              <div class="public-bio-meta">
                ${profile.city ? `<span>📍 ${escapeBio(profile.city)}</span>` : ''}
                ${profile.favorite ? `<span>🎌 ${escapeBio(profile.favorite)}</span>` : ''}
              </div>
            </div>
          </section>
        ` : ''}

        <section class="block reveal">
          <div class="block-head">
            <h3>Достижения игрока</h3>
            <span class="block-note">${profile.isDemo ? 'демо' : 'публичная статистика'}</span>
          </div>

          <div class="public-stats">
            <div class="public-stat">
              <b>${profile.achievements}</b>
              <span>достижений</span>
            </div>
            <div class="public-stat">
              <b>${profile.lessons}</b>
              <span>уроков</span>
            </div>
            <div class="public-stat">
              <b>${profile.words}</b>
              <span>слов</span>
            </div>
            <div class="public-stat">
              <b>${profile.level}</b>
              <span>уровень</span>
            </div>
          </div>

          <p class="public-note">
            ${profile.isDemo
              ? 'Это демо-соперник из рейтинга: у него нет сохранённого прогресса, только опыт.'
              : 'Достижения и прогресс уроков хранятся в браузере владельца аккаунта, поэтому у другого игрока они не отображаются.'}
          </p>
        </section>

        <section class="block reveal">
          <div class="block-head">
            <h3>До следующего уровня</h3>
            <span class="block-note">${nextNeed ? 'нужно ' + nextNeed + ' XP' : 'максимум'}</span>
          </div>
          <div class="progress-bar progress-thick"><span style="width:${percent}%"></span></div>
          <div class="public-next">
            <span>Уровень ${profile.level}</span>
            <span>${nextNeed ? 'Уровень ' + (profile.level + 1) : 'Максимальный уровень'}</span>
          </div>
        </section>

        <div class="profile-actions">
          <a class="btn btn-primary" href="rating">Рейтинг игроков</a>
          <a class="btn btn-outline" href="profile">Мой профиль</a>
        </div>
      </div>
    </div>
  `;

  // Значок владельца показываем только у себя
  if (profile.isMe && typeof renderEquippedBadge === 'function') renderEquippedBadge();
}

/** Копирует ссылку на профиль. */
async function copyProfileLink(name) {
  const url = window.location.origin + window.location.pathname + '?user=' + encodeURIComponent(name);

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      if (typeof showToast === 'function') showToast('Ссылка скопирована', url, 'success');
      return;
    }
  } catch (error) {
    // Ниже — запасной вариант
  }

  if (typeof showToast === 'function') showToast('Ссылка на профиль', url, 'info');
}

/* ---------- Инициализация ---------- */

/**
 * Подтягивает профиль с сервера и перерисовывает страницу.
 * Если сервер недоступен — остаётся локальная версия, ошибок не показываем.
 */
async function hydratePublicProfile() {
  const nickname = getPublicNickname();
  if (!nickname || typeof apiPublicProfile !== 'function') return;

  try {
    const data = await apiPublicProfile(nickname);
    if (!data) return;

    publicRemote = { name: String(data.username || nickname).toLowerCase(), data: data };
    renderPublicProfile();
  } catch (error) {
    // офлайн: локальный профиль уже на экране
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isPublicView()) return;

  // Прячем блоки, которые относятся только к владельцу
  document.querySelectorAll('.owner-only').forEach(el => el.classList.add('hidden'));

  renderPublicProfile();
  hydratePublicProfile();

  // Блоки создаются после initReveal — иначе они остаются прозрачными
  if (typeof observeReveals === 'function') observeReveals(document);
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
});

/* Экспорт в глобальную область */
window.getPublicNickname = getPublicNickname;
window.isPublicView = isPublicView;
window.getPublicProfile = getPublicProfile;
window.renderPublicProfile = renderPublicProfile;
window.hydratePublicProfile = hydratePublicProfile;
window.copyProfileLink = copyProfileLink;
