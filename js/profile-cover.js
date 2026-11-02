/* ============================================================
   profile-cover.js — фон за аватаркой в профиле

   Своя картинка или видео на обложке карточки игрока.

   Как хранится:
   • вошёл в аккаунт и сервер доступен — файл уезжает на сервер
     (server/uploads/covers). Тогда обложку видят все: и на другом
     устройстве, и в чужой визитке по ссылке;
   • гостю или без сервера — файл остаётся в браузере (картинка в
     localStorage, ролик в IndexedDB), чтобы оформление работало
     и без сети.

   Ограничения: фото до 5 МБ, видео до 10 МБ.
   ============================================================ */

'use strict';

const PROFILE_COVER_KEY = 'anilingo_profile_cover';       // data URL картинки
const PROFILE_COVER_KIND = 'anilingo_profile_cover_kind'; // image | video

const COVER_DB_NAME = 'anilingo_cover';
const COVER_DB_STORE = 'cover';
const COVER_VIDEO_KEY = 'video';

const COVER_IMAGE_LIMIT = 5 * 1024 * 1024;
const COVER_VIDEO_LIMIT = 10 * 1024 * 1024;

// Картинку ужимаем: обложка на экране небольшая
const COVER_MAX_SIDE = 1280;
const COVER_QUALITY = 0.82;

/* ---------- Хранилище браузера ---------- */

/** Открывает базу для видео-фона профиля. */
function coverDbOpen() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Браузер не умеет хранить видео'));
      return;
    }

    const request = indexedDB.open(COVER_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(COVER_DB_STORE)) db.createObjectStore(COVER_DB_STORE);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Не открылась память браузера'));
  });
}

/** Кладёт ролик в IndexedDB. */
async function coverSaveVideo(file) {
  const db = await coverDbOpen();

  await new Promise((resolve, reject) => {
    const tx = db.transaction(COVER_DB_STORE, 'readwrite');
    tx.objectStore(COVER_DB_STORE).put(file, COVER_VIDEO_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Видео не сохранилось'));
  });

  db.close();
}

/** Достаёт ролик из IndexedDB. */
async function coverLoadVideo() {
  try {
    const db = await coverDbOpen();

    const file = await new Promise((resolve, reject) => {
      const tx = db.transaction(COVER_DB_STORE, 'readonly');
      const request = tx.objectStore(COVER_DB_STORE).get(COVER_VIDEO_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return file;
  } catch (error) {
    return null;
  }
}

/** Удаляет ролик. */
async function coverRemoveVideo() {
  try {
    const db = await coverDbOpen();

    await new Promise(resolve => {
      const tx = db.transaction(COVER_DB_STORE, 'readwrite');
      tx.objectStore(COVER_DB_STORE).delete(COVER_VIDEO_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });

    db.close();
  } catch (error) {
    // базы нет — и удалять нечего
  }
}

/* ---------- Отрисовка ---------- */

let coverVideoUrl = '';

/** Убирает видео с обложки. */
function removeCoverVideo() {
  const cover = document.getElementById('profileCover');
  if (!cover) return;

  const video = cover.querySelector('video');
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.remove();
  }

  if (coverVideoUrl) {
    URL.revokeObjectURL(coverVideoUrl);
    coverVideoUrl = '';
  }
}

/** Показывает ролик на обложке. */
async function paintCoverVideo() {
  const cover = document.getElementById('profileCover');
  if (!cover) return;

  const file = await coverLoadVideo();
  if (!file) {
    localStorage.setItem(PROFILE_COVER_KIND, 'image');
    paintCoverImage();
    return;
  }

  removeCoverVideo();
  cover.style.backgroundImage = '';
  cover.classList.add('has-video');
  cover.classList.add('has-custom-cover');

  coverVideoUrl = URL.createObjectURL(file);

  const video = document.createElement('video');
  video.className = 'profile-cover-video';
  video.src = coverVideoUrl;
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.preload = 'auto';

  cover.appendChild(video);

  // Автозапуск не везде разрешён — молча ждём, если браузер против
  try {
    const play = video.play();
    if (play && typeof play.catch === 'function') play.catch(() => {});
  } catch (error) {
    // браузер без поддержки play() — обложка просто останется картинкой
  }
}

/** Показывает картинку на обложке. */
function paintCoverImage() {
  const cover = document.getElementById('profileCover');
  if (!cover) return;

  // Сервер важнее браузера: его обложку видят все
  const remote = serverCover();
  let image = '';

  if (remote && remote.cover) {
    image = remote.cover;
  } else {
    try {
      image = localStorage.getItem(PROFILE_COVER_KEY) || '';
    } catch (error) {
      image = '';
    }
  }

  removeCoverVideo();
  cover.classList.remove('has-video');

  if (!image) {
    cover.style.backgroundImage = '';
    cover.classList.remove('has-custom-cover');
    return;
  }

  cover.style.backgroundImage = 'url("' + image + '")';
  cover.classList.add('has-custom-cover');
}

/** Ролик прямо с сервера: адрес постоянный, хранить файл не нужно. */
function paintCoverVideoFromServer(url) {
  const cover = document.getElementById('profileCover');
  if (!cover) return;

  removeCoverVideo();
  cover.style.backgroundImage = '';
  cover.classList.add('has-video', 'has-custom-cover');

  const video = document.createElement('video');
  video.className = 'profile-cover-video';
  video.src = url;
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.preload = 'auto';

  cover.appendChild(video);

  const play = video.play();
  if (play && typeof play.catch === 'function') play.catch(() => {});
}

/** Применяет сохранённый фон профиля. */
function applyProfileCover() {
  if (!document.getElementById('profileCover')) return;

  // 1) Фон с сервера — он общий для всех устройств
  const remote = serverCover();
  if (remote) {
    if (remote.kind === 'video') paintCoverVideoFromServer(remote.cover);
    else paintCoverImage();
    return;
  }

  // 2) Личный фон этого браузера
  let kind = 'image';
  try {
    kind = localStorage.getItem(PROFILE_COVER_KIND) || 'image';
  } catch (error) {
    kind = 'image';
  }

  if (kind === 'video') paintCoverVideo();
  else paintCoverImage();
}

/* ---------- Загрузка файла ---------- */

/**
 * Сжимает картинку под обложку.
 * Тот же приём, что у фона сайта: canvas и JPEG.
 */
function coverShrinkImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Это не похоже на картинку'));

      img.onload = () => {
        try {
          const scale = Math.min(1, COVER_MAX_SIDE / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', COVER_QUALITY));
        } catch (error) {
          reject(error);
        }
      };

      img.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

/** Меню выбора: картинка, видео или убрать. */
function openProfileCoverPicker() {
  const wrap = document.createElement('div');
  wrap.className = 'cover-picker';

  wrap.innerHTML = '' +
    '<div class="cover-picker-card" role="dialog" aria-modal="true" aria-label="Фон профиля">' +
      '<h3>Фон за аватаркой</h3>' +
      '<p class="cover-picker-note">Картинка до 5 МБ или видео до 10 МБ. ' +
      'Файл сохраняется на сервере, поэтому фон видно всем — и на других устройствах.</p>' +
      '<div class="cover-picker-actions">' +
        '<label class="btn btn-primary btn-small">Картинка' +
          '<input type="file" accept="image/*" hidden data-cover-file="image">' +
        '</label>' +
        '<label class="btn btn-outline btn-small">Видео' +
          '<input type="file" accept="video/mp4,video/webm,video/*" hidden data-cover-file="video">' +
        '</label>' +
        '<button class="btn btn-ghost btn-small" type="button" data-cover-remove>Убрать</button>' +
      '</div>' +
      '<button class="btn btn-ghost btn-small cover-picker-close" type="button" data-cover-close>Закрыть</button>' +
    '</div>';

  document.body.appendChild(wrap);
  document.documentElement.classList.add('cover-picker-open');

  const close = () => {
    wrap.remove();
    document.documentElement.classList.remove('cover-picker-open');
    document.removeEventListener('keydown', onKey);
  };

  const onKey = event => {
    if (event.key === 'Escape') close();
  };

  wrap.addEventListener('click', event => {
    if (event.target === wrap) close();
  });

  document.addEventListener('keydown', onKey);

  wrap.querySelector('[data-cover-close]').addEventListener('click', close);

  wrap.querySelectorAll('[data-cover-file]').forEach(input => {
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      close();
      await pickProfileCover(file);
    });
  });

  wrap.querySelector('[data-cover-remove]').addEventListener('click', () => {
    close();
    clearProfileCover();
  });

  // Фокус в окно — чтобы работала клавиатура
  const first = wrap.querySelector('.cover-picker-actions .btn');
  if (first) first.focus();
}

/** Сохраняет выбранный файл и сразу показывает его. */
async function pickProfileCover(file) {
  const isVideo = /^video\//.test(file.type);
  const isImage = /^image\//.test(file.type);

  if (!isVideo && !isImage) {
    if (typeof showToast === 'function') {
      showToast('Нужна картинка или видео', 'Подойдут JPG, PNG, WebP, MP4 и WebM', 'error');
    }
    return;
  }

  const limit = isVideo ? COVER_VIDEO_LIMIT : COVER_IMAGE_LIMIT;
  if (file.size > limit) {
    if (typeof showToast === 'function') {
      showToast(
        'Файл слишком большой',
        (isVideo ? 'Видео' : 'Картинка') + ' до ' + Math.round(limit / (1024 * 1024)) + ' МБ. Ваш файл — ' +
          (file.size / (1024 * 1024)).toFixed(1) + ' МБ',
        'error',
        { duration: 5200 }
      );
    }
    return;
  }

  // Сначала пробуем сервер: тогда обложку увидят другие игроки
  const uploaded = await uploadCoverToServer(file);
  if (uploaded) return;

  try {
    if (isVideo) {
      await coverSaveVideo(file);
      localStorage.setItem(PROFILE_COVER_KIND, 'video');
      try { localStorage.removeItem(PROFILE_COVER_KEY); } catch (error) { /* пусто */ }

      await paintCoverVideo();

      if (typeof showToast === 'function') showToast('Фон профиля обновлён', 'Видео крутится за аватаркой', 'success', { icon: 'image' });
      return;
    }

    const dataUrl = await coverShrinkImage(file);

    try { localStorage.removeItem(PROFILE_COVER_KEY); } catch (error) { /* пусто */ }
    localStorage.setItem(PROFILE_COVER_KEY, dataUrl);
    localStorage.setItem(PROFILE_COVER_KIND, 'image');

    await coverRemoveVideo();
    paintCoverImage();

    if (typeof showToast === 'function') showToast('Фон профиля обновлён', 'Теперь за аватаркой твоя картинка', 'success', { icon: 'image' });
  } catch (error) {
    if (typeof showToast === 'function') showToast('Не получилось', error.message || 'Попробуйте другой файл', 'error');
  }
}

/**
 * Отправляет файл на сервер.
 * Возвращает true, если всё получилось: тогда локальная копия
 * не нужна — обложка берётся с сервера и видна всем.
 */
async function uploadCoverToServer(file) {
  if (typeof apiUploadCover !== 'function') return false;
  if (typeof accountIsActive === 'function' && !accountIsActive()) return false;

  if (typeof showToast === 'function') {
    showToast('Загружаем фон', 'Файл уходит на сервер — его увидят все', 'info', { duration: 2200 });
  }

  let result;

  try {
    result = await apiUploadCover(file);
  } catch (error) {
    result = { ok: false, message: 'Сервер не ответил' };
  }

  if (!result.ok) {
    // Сервер не принял файл — работаем локально, но говорим почему
    if (typeof showToast === 'function') {
      showToast('Сервер не принял файл', (result.message || '') + ' · сохранили в этом браузере', 'warning', { duration: 5200 });
    }
    return false;
  }

  // Локальную копию убираем: теперь источник правды — сервер
  try {
    localStorage.removeItem(PROFILE_COVER_KEY);
    localStorage.removeItem(PROFILE_COVER_KIND);
  } catch (error) {
    // приватный режим — не критично
  }

  removeCoverVideo();
  coverRemoveVideo().catch(() => {});

  applyProfileCover();

  if (typeof showToast === 'function') {
    showToast('Фон профиля обновлён', 'Теперь его видно всем — и на других устройствах', 'success', { icon: 'image' });
  }

  return true;
}

/** Фон профиля с сервера для владельца: { cover, kind } или null. */
function serverCover() {
  if (typeof getCurrentUser !== 'function') return null;

  const user = getCurrentUser();
  if (!user || !user.cover) return null;

  return {
    cover: typeof apiMediaUrl === 'function' ? apiMediaUrl(user.cover) : user.cover,
    kind: user.coverKind === 'video' ? 'video' : 'image'
  };
}

/** Убирает свой фон — возвращается градиент. */
function clearProfileCover() {
  try {
    localStorage.removeItem(PROFILE_COVER_KEY);
    localStorage.removeItem(PROFILE_COVER_KIND);
  } catch (error) {
    // приватный режим — просто не запоминаем
  }

  // На сервере тоже убираем: иначе обложка вернётся после входа
  if (typeof apiDeleteCover === 'function'
      && typeof accountIsActive === 'function' && accountIsActive()) {
    apiDeleteCover().catch(() => {});
  }

  removeCoverVideo();
  coverRemoveVideo().catch(() => {});

  const cover = document.getElementById('profileCover');
  if (cover) {
    cover.style.backgroundImage = '';
    cover.classList.remove('has-custom-cover', 'has-video');
  }

  if (typeof showToast === 'function') showToast('Фон убран', 'Вернули стандартную обложку профиля', 'info');
}

/**
 * Свежая обложка с сервера.
 *
 * Кэш аккаунта обновляется при входе, но если фон поставили
 * на другом устройстве, здесь о нём ещё не знают. Один запрос
 * при открытии профиля — и обложка на месте.
 */
async function refreshCoverFromServer() {
  if (!document.getElementById('profileCover')) return;
  if (typeof accountIsActive !== 'function' || !accountIsActive()) return;
  if (typeof apiRequest !== 'function' || typeof apiModeNow !== 'function') return;

  const mode = await apiModeNow();
  if (mode !== 'remote') return;

  const response = await apiRequest('/api/auth/me');
  if (!response.ok || !response.data || !response.data.user) return;

  const fresh = response.data.user;
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user) return;

  const sameCover = (user.cover || '') === (fresh.cover || '');
  const sameKind = (user.coverKind || '') === (fresh.coverKind || '');
  if (sameCover && sameKind) return;

  if (typeof updateUserRecord === 'function') {
    updateUserRecord(user.username, {
      cover: fresh.cover || '',
      coverKind: fresh.coverKind || ''
    });
  }

  // Пришёл новый адрес — перерисовываем обложку
  applyProfileCover();
}

document.addEventListener('DOMContentLoaded', () => {
  applyProfileCover();
  refreshCoverFromServer().catch(() => {});
});

/* Экспорт */
window.openProfileCoverPicker = openProfileCoverPicker;
window.pickProfileCover = pickProfileCover;
window.clearProfileCover = clearProfileCover;
window.applyProfileCover = applyProfileCover;
