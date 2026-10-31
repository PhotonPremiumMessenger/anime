/* ============================================================
   avatar.js — аватар игрока: своё фото или первая буква ника

   Как устроено:
   • Загруженное фото хранится в аккаунте (на сервере) — его видно
     в своём профиле на любом устройстве и в чужом профиле по ссылке.
   • Готовых картинок-аватаров больше нет: если фото нет, аватар —
     это первая буква ника на своём градиенте. Цвет считается
     по нику, поэтому у каждого он свой и всегда одинаковый.
   • Форма всегда круглая. Рамки — отдельные предметы магазина:
     надел рамку в магазине, и она обводит аватар везде, где он виден.

   Фото сжимается до 256×256 прямо в браузере (canvas), поэтому
   в аккаунт уходит 20–60 КБ вместо мегабайта с телефона.
   ============================================================ */

'use strict';

// Локальная копия фото (у гостя — единственная, у аккаунта — кэш)
const AVATAR_KEY = 'avatar';

// Размер квадрата фото и предел того, что уходит на сервер
const AVATAR_SIZE = 256;
const AVATAR_MAX_DATA = 140 * 1024;

/* ---------- Ник и цвет ---------- */

/** Первая буква ника — то, что видно вместо картинки. */
function avatarLetter(name) {
  const clean = String(name || '').trim();
  if (!clean) return '?';

  // Берём первый символ так, чтобы не разорвать эмодзи или сложную букву
  const first = Array.from(clean)[0] || '?';
  return first.toUpperCase();
}

/**
 * Два оттенка для градиента аватара. Считаются по нику:
 * «Котоно» всегда получает один и тот же цвет на всех устройствах.
 */
function avatarTones(name) {
  const text = String(name || 'AniLingo');
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 360;
  }

  const first = hash;
  const second = (hash + 42) % 360;

  return [first, second];
}

/* ---------- Текущий ник и фото ---------- */

/** Ник текущего игрока (или «Гость»). */
function avatarCurrentName() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  return (user && user.username) || 'Гость';
}

/** Похоже ли значение на готовую картинку. */
function isAvatarPicture(value) {
  const text = String(value || '');
  return text.indexOf('data:image/') === 0 || /^https?:\/\//i.test(text);
}

/**
 * Фото текущего игрока. Порядок: аккаунт → настройки сервера → браузер.
 * Пустая строка значит «фото нет, показываем букву».
 */
function getCurrentAvatar() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  if (user && isAvatarPicture(user.avatar)) return user.avatar;

  // Настройки приезжают с сервера на любом устройстве
  try {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}') || {};
    if (isAvatarPicture(settings['profile.avatar'])) return settings['profile.avatar'];
  } catch (error) {
    // битые настройки — не повод ломать аватар
  }

  try {
    const saved = localStorage.getItem(AVATAR_KEY);
    if (isAvatarPicture(saved)) return saved;
  } catch (error) {
    // приватный режим
  }

  return '';
}

/** Надетая рамка (класс CSS) или ''. */
function getEquippedFrame() {
  let id = '';

  if (typeof getShopState === 'function') {
    const state = getShopState();
    id = state && state.equipped ? state.equipped.frame : '';
  } else {
    // На страницах без shop.js читаем состояние сами, чтобы
    // рамка была видна и в шапке настроек или страницы входа
    try {
      const saved = JSON.parse(localStorage.getItem('anilingo_shop') || 'null');
      id = saved && saved.equipped ? saved.equipped.frame : '';
    } catch (error) {
      id = '';
    }
  }

  if (!id) return '';

  // id рамки и класс совпадают: frame-gold → frame-gold
  return id.indexOf('frame-') === 0 ? id : '';
}

/* ---------- Разметка ---------- */

/** Внутренность аватара: кольцо-рамка, фото или буква. */
function avatarInnerMarkup(name, photo) {
  // Кольцо — отдельный слой: так его градиент можно вращать,
  // не задевая фото и букву внутри
  const ring = '<i class="avatar-ring" aria-hidden="true"></i>';

  if (isAvatarPicture(photo)) {
    return ring + '<img class="avatar-photo" src="' + photo + '" alt="' +
      String(name || 'Аватар').replace(/"/g, '&quot;') + '" loading="lazy" decoding="async">';
  }

  const empty = !String(name || '').trim();
  return ring + '<span class="avatar-letter' + (empty ? ' is-empty' : '') + '">' +
    avatarLetter(name) + '</span>';
}

/**
 * Готовый аватар одной строкой — для блоков, которые рисует JS
 * (рейтинг, друзья, публичный профиль, магазин).
 *
 * @param {string} name — ник
 * @param {object} options — { photo, frame, scale } (scale — множитель размера)
 */
function avatarMarkup(name, options) {
  const opts = options || {};
  const tones = avatarTones(name);

  const frame = opts.frame === undefined ? getEquippedFrame() : opts.frame;
  const classes = 'avatar-round' + (frame ? ' ' + frame : '') + (opts.className ? ' ' + opts.className : '');

  const style = '--av-1:' + tones[0] + ';--av-2:' + tones[1] +
    (opts.size ? ';--av-size:' + Number(opts.size) + 'px' : '');

  // data-* нужны paintAvatarSlots: она перерисует этот слот,
  // если владелец сменил фото или рамку
  return '<span class="' + classes + '" data-avatar-slot' +
    ' data-avatar-name="' + String(name || '').replace(/"/g, '&quot;') + '"' +
    ' data-avatar-photo="' + (isAvatarPicture(opts.photo) ? 'yes' : '') + '"' +
    (isAvatarPicture(opts.photo) ? ' data-avatar-photo-data="' + opts.photo + '"' : '') +
    ' data-avatar-frame="' + String(frame || '') + '"' +
    ' style="' + style + '">' +
    avatarInnerMarkup(name, opts.photo) +
    '</span>';
}

/**
 * Заполняет все аватары на странице: шапку, профиль, карточку био.
 * Повторный вызов просто перерисовывает — так меняется рамка.
 */
function paintAvatarSlots() {
  const me = avatarCurrentName();
  const myPhoto = getCurrentAvatar();
  const myFrame = getEquippedFrame();

  document.querySelectorAll('[data-avatar-slot]').forEach(slot => {
    // Уже готовый аватар (нарисован avatarMarkup) трогаем только рамкой
    const name = slot.dataset.avatarName || me;
    const own = !slot.dataset.avatarName || slot.dataset.avatarName === me;
    const photo = own ? myPhoto : (slot.dataset.avatarPhotoData || '');
    const frame = slot.dataset.avatarFrame !== undefined ? slot.dataset.avatarFrame : (own ? myFrame : '');

    const tones = avatarTones(name);
    slot.style.setProperty('--av-1', String(tones[0]));
    slot.style.setProperty('--av-2', String(tones[1]));

    // Рамки — это классы вида frame-gold; остальные классы не трогаем
    Array.from(slot.classList).forEach(cls => {
      if (cls.indexOf('frame-') === 0) slot.classList.remove(cls);
    });
    if (frame) slot.classList.add(frame);

    const signature = (photo ? 'p:' + photo.length + ':' + photo.slice(-24) : 'l:' + name) +
      '|f:' + frame;

    if (slot.dataset.avatarPainted === signature) return;

    slot.innerHTML = avatarInnerMarkup(name, photo);
    slot.dataset.avatarPainted = signature;
    if (photo) slot.dataset.avatarPhotoData = photo;
  });
}

/* ---------- Загрузка своего фото ---------- */

/** Уменьшает картинку до 256×256 и превращает в компактный JPEG. */
function avatarCompress(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error('Это не картинка'));
      image.onload = () => {
        const side = Math.min(image.width, image.height);
        const sx = (image.width - side) / 2;
        const sy = (image.height - side) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Браузер не смог обработать картинку'));
          return;
        }

        // Квадрат по центру: лицо обычно там
        ctx.drawImage(image, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

        let quality = 0.88;
        let data = canvas.toDataURL('image/jpeg', quality);

        // Ужимаем качество, пока не влезем в бюджет аккаунта
        while (data.length > AVATAR_MAX_DATA && quality > 0.45) {
          quality -= 0.12;
          data = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(data);
      };

      image.src = String(reader.result || '');
    };

    reader.readAsDataURL(file);
  });
}

/** Сохраняет фото: сразу в браузере, затем в аккаунте на сервере. */
async function saveAvatarPhoto(data) {
  try {
    if (data) localStorage.setItem(AVATAR_KEY, data);
    else localStorage.removeItem(AVATAR_KEY);
  } catch (error) {
    // приватный режим: останется только до перезагрузки
  }

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  // Копия в настройках: по ней аватар поднимется на новом устройстве,
  // даже если запись пользователя ещё не успела приехать с сервера
  try {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}') || {};
    settings['profile.avatar'] = data || '';
    localStorage.setItem('settings', JSON.stringify(settings));
  } catch (error) {
    // битые настройки не должны мешать сохранению фото
  }

  if (user && typeof updateUserRecord === 'function') {
    updateUserRecord(user.username, { avatar: data || '' });
  }

  // Достижения «Новый образ» и задание дня считают смены аватара
  if (data && typeof notifyAction === 'function') {
    notifyAction('avatar', 1, { reason: 'Новый аватар' });
  }

  if (user && typeof apiUploadAvatar === 'function') {
    try {
      await apiUploadAvatar(data || '');
    } catch (error) {
      // нет сети — фото всё равно останется в кэше и уйдёт синхронизацией
    }
  }

  paintAvatarSlots();
  if (typeof updateHeaderAuth === 'function') updateHeaderAuth();
  if (typeof refreshAniLingoUI === 'function') refreshAniLingoUI();
}

/** Выбор файла из модалки «Аватар». */
async function uploadAvatarFile(input) {
  const file = input && input.files ? input.files[0] : null;
  if (!file) return;

  if (!/^image\//.test(file.type)) {
    if (typeof showToast === 'function') showToast('Это не картинка', 'Выберите файл PNG, JPEG или WebP', 'warning');
    return;
  }

  if (file.size > 12 * 1024 * 1024) {
    if (typeof showToast === 'function') showToast('Слишком большой файл', 'До 12 МБ — фото всё равно сожмётся', 'warning');
    return;
  }

  if (typeof showToast === 'function') showToast('Обрабатываем фото', 'Немного магии — и готово', 'info', { duration: 1800 });

  try {
    const data = await avatarCompress(file);
    await saveAvatarPhoto(data);
    input.value = '';

    if (typeof showToast === 'function') {
      showToast('Аватар обновлён', 'Фото сохранено в аккаунте', 'success');
    }
  } catch (error) {
    input.value = '';
    if (typeof showToast === 'function') showToast('Не получилось', error.message || 'Попробуйте другой файл', 'error');
  }
}

/** Убирает фото: аватар снова становится буквой ника. */
async function removeAvatarPhoto() {
  await saveAvatarPhoto('');

  if (typeof showToast === 'function') showToast('Фото убрано', 'Теперь аватар — первая буква ника', 'info');
}

/* ---------- Модалка «Аватар» ---------- */

function openAvatarModal() {
  const modal = document.getElementById('avatarModal');
  if (!modal) return;

  modal.classList.add('open');
  paintAvatarSlots();

  // Показываем, чей это аватар: ник и подсказку про рамку
  const nameEl = document.getElementById('avatarModalName');
  if (nameEl) nameEl.textContent = avatarCurrentName();

  const hint = document.getElementById('avatarModalHint');
  if (hint) {
    hint.textContent = getCurrentAvatar()
      ? 'Фото хранится в аккаунте: его видно в профиле с любого устройства.'
      : 'Пока фото нет, аватар — первая буква ника на своём градиенте.';
  }
}

function closeAvatarModal() {
  const modal = document.getElementById('avatarModal');
  if (modal) modal.classList.remove('open');
}

/* ---------- Инициализация ---------- */

/** Рамка «Первый шаг» — бесплатно за пройденный первый урок. */
function grantFirstLessonFrame() {
  if (typeof lockFirstFrame !== 'function') return;

  const progress = typeof getProgress === 'function' ? getProgress() : null;
  if (!progress || !progress.lessons) return;

  const passed = Object.keys(progress.lessons).some(id => {
    const record = progress.lessons[id];
    return record && (record.completed || record.done);
  });

  if (!passed) return;
  if (typeof ownsShopItem === 'function' && ownsShopItem('frame-first')) return;

  lockFirstFrame();
}

document.addEventListener('DOMContentLoaded', () => {
  paintAvatarSlots();
  grantFirstLessonFrame();

  const modal = document.getElementById('avatarModal');
  if (modal) {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeAvatarModal();
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeAvatarModal();
  });
});

/* Экспорт в глобальную область */
window.AVATAR_KEY = AVATAR_KEY;
window.avatarLetter = avatarLetter;
window.avatarTones = avatarTones;
window.avatarMarkup = avatarMarkup;
window.avatarCurrentName = avatarCurrentName;
window.getCurrentAvatar = getCurrentAvatar;
window.getEquippedFrame = getEquippedFrame;
window.paintAvatarSlots = paintAvatarSlots;
window.uploadAvatarFile = uploadAvatarFile;
window.removeAvatarPhoto = removeAvatarPhoto;
window.saveAvatarPhoto = saveAvatarPhoto;
window.openAvatarModal = openAvatarModal;
window.grantFirstLessonFrame = grantFirstLessonFrame;
window.closeAvatarModal = closeAvatarModal;
