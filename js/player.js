/* ============================================================
   player.js — своя музыка и мини-плеер в углу
   • плейлист из загруженных файлов (data URL, только localStorage);
   • Spotify по ссылке: трек, альбом, плейлист или подкаст играет
     во встроенном плеере — без скачивания и без сервера;
   • красивый плеер: виниловый диск, живой эквалайзер, обложка,
     которую рисуем сами по названию трека;
   • повтор, перемешивание, медиа-клавиши и пробел;
   • при переходе на другую страницу сайта трек продолжается:
     позиция и состояние сохраняются, новая страница ставит ту же
     секунду и включает воспроизведение.
   ============================================================ */

'use strict';

const MP_LIST_KEY = 'nihongo_playlist';   // [{ id, name, kind, data | spotify }]
const MP_STATE_KEY = 'nihongo_player';    // { trackId, time, playing, volume, muted, hidden, repeat, shuffle }

const MP_MAX_TRACK_BYTES = 1.8 * 1024 * 1024;  // один файл: base64 съедает треть
const MP_MAX_TRACKS = 12;                       // больше не влезет в localStorage
const MP_SPOTIFY_EMBED = 'https://open.spotify.com/embed/';

let mpTracks = [];
let mpCurrent = '';
let mpAudio = null;
let mpSaveTimer = 0;
let mpResumeTime = 0;
let mpWantPlay = false;
let mpShuffleBag = [];

/* ---------- localStorage ---------- */

function mpRead(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

/** Читает JSON, не падая на битых данных. */
function mpReadJson(key, fallback) {
  try {
    const parsed = JSON.parse(mpRead(key, 'null'));
    return parsed === null ? fallback : parsed;
  } catch (error) {
    return fallback;
  }
}

function mpWrite(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (typeof showToast === 'function') {
      showToast('Не хватило места',
        'Браузер хранит файлы только в этом профиле и не безгранично. Убери пару треков и попробуй снова',
        'error', { duration: 6000 });
    }
    return false;
  }
}

/* ---------- Плейлист ---------- */

function mpLoadTracks() {
  const saved = mpReadJson(MP_LIST_KEY, []);
  mpTracks = Array.isArray(saved)
    ? saved.filter(item => item && item.id && (item.data || item.spotify))
    : [];
  return mpTracks;
}

function mpSaveTracks() {
  return mpWrite(MP_LIST_KEY, JSON.stringify(mpTracks));
}

function mpTrack(id) {
  return mpTracks.find(item => item.id === id) || null;
}

function mpCurrentTrack() {
  return mpTrack(mpCurrent) || mpTracks[0] || null;
}

/** Состояние плеера. */
function mpState() {
  return Object.assign({
    trackId: '',
    time: 0,
    playing: false,
    volume: 40,
    muted: false,
    hidden: false,
    repeat: 'off',
    shuffle: false
  }, mpReadJson(MP_STATE_KEY, {}));
}

function mpSaveState(patch) {
  const next = Object.assign(mpState(), patch || {});
  mpWrite(MP_STATE_KEY, JSON.stringify(next));
  return next;
}

/** Это трек Spotify? Тогда звук живёт в iframe, а не в audio. */
function mpIsSpotify(track) {
  return Boolean(track && track.spotify && track.spotify.type && track.spotify.id);
}

/* ---------- Аудио ---------- */

function mpAudioElement() {
  if (mpAudio) return mpAudio;

  mpAudio = document.createElement('audio');
  mpAudio.id = 'customMusicPlayer';
  mpAudio.preload = 'metadata';
  mpAudio.style.display = 'none';
  mpAudio.loop = false;
  document.body.appendChild(mpAudio);

  mpAudio.addEventListener('timeupdate', () => {
    mpPaintProgress();
    mpSaveSoon();
  });

  mpAudio.addEventListener('loadedmetadata', () => {
    if (mpResumeTime > 0 && mpAudio.duration && mpResumeTime < mpAudio.duration - 0.5) {
      try { mpAudio.currentTime = mpResumeTime; } catch (error) { /* пусто */ }
      mpResumeTime = 0;
    }
    mpPaintProgress();
  });

  mpAudio.addEventListener('play', () => {
    mpPaintControls();
    mpSaveState({ playing: true });
    mpUpdateMediaSession();
  });

  mpAudio.addEventListener('pause', () => {
    mpPaintControls();
    mpSaveState({ playing: false });
  });

  // Трек кончился — повторяем или идём дальше
  mpAudio.addEventListener('ended', () => {
    const state = mpState();
    if (state.repeat === 'one') {
      try { mpAudio.currentTime = 0; } catch (error) { /* пусто */ }
      mpAudio.play().catch(() => { /* пусто */ });
      return;
    }
    mpStep(1, true);
  });

  return mpAudio;
}

/** Сохраняет позицию не чаще раза в 4 секунды. */
function mpSaveSoon() {
  if (mpSaveTimer) return;

  mpSaveTimer = window.setTimeout(() => {
    mpSaveTimer = 0;
    if (!mpAudio) return;
    mpSaveState({
      trackId: mpCurrent,
      time: mpAudio.currentTime || 0,
      playing: !mpAudio.paused
    });
  }, 4000);
}

/* ---------- Spotify ---------- */

/**
 * Достаёт тип и id из ссылки Spotify.
 * Понимает open.spotify.com (с языковым префиксом и без), ссылку
 * из «Поделиться» и формат spotify:track:ID.
 */
function mpParseSpotify(url) {
  const text = String(url || '').trim();
  if (!text) return null;

  const match = text.match(
    /(?:open\.spotify\.com\/(?:intl-[\w-]+\/)?|spotify:)(track|album|playlist|episode|show)[/:]([A-Za-z0-9]{16,})/
  );

  if (!match) return null;

  return { type: match[1], id: match[2] };
}

/** Человеческое название для типа ссылки. */
function mpSpotifyKindName(type) {
  return {
    track: 'Трек',
    album: 'Альбом',
    playlist: 'Плейлист',
    episode: 'Выпуск',
    show: 'Подкаст'
  }[type] || 'Spotify';
}

/** Высота встроенного плеера под тип ссылки. */
function mpSpotifyHeight(type) {
  if (type === 'playlist' || type === 'album' || type === 'show') return 352;
  return 152;
}

/**
 * Добавляет ссылку Spotify в плейлист и включает её.
 * Музыка играет во встроенном плеере Spotify — ничего не скачивается.
 */
function addSpotifyTrack(url) {
  const parsed = mpParseSpotify(url);

  if (!parsed) {
    if (typeof showToast === 'function') {
      showToast('Не похоже на ссылку Spotify',
        'Скопируй ссылку через «Поделиться → Копировать ссылку на трек» и вставь сюда',
        'error', { duration: 5200 });
    }
    return false;
  }

  // Та же ссылка уже есть — просто включаем
  const existing = mpTracks.find(item => item.spotify &&
    item.spotify.type === parsed.type && item.spotify.id === parsed.id);

  if (existing) {
    mpBuildDock();
    toggleMusicDock(true);
    mpPlayTrack(existing.id, 0);
    if (typeof showToast === 'function') showToast('Уже в плейлисте', existing.name, 'info', { duration: 2400 });
    return true;
  }

  if (mpTracks.length >= MP_MAX_TRACKS) {
    if (typeof showToast === 'function') {
      showToast('Плейлист заполнен', 'Больше ' + MP_MAX_TRACKS + ' треков не влезет', 'warning', { duration: 4600 });
    }
    return false;
  }

  const track = {
    id: 'sp' + Date.now(),
    name: 'Spotify · ' + mpSpotifyKindName(parsed.type),
    kind: 'spotify',
    spotify: parsed
  };

  mpTracks.push(track);
  mpSaveTracks();

  mpBuildDock();
  mpPlayTrack(track.id, 0);
  toggleMusicDock(true);

  if (typeof showToast === 'function') {
    showToast('Spotify подключён', 'Играет во встроенном плеере — ссылка уже в списке', 'success',
      { icon: 'music', duration: 3400 });
  }

  // Подтягиваем настоящее название через публичный oEmbed Spotify.
  // Если сеть или CORS не пустят — останется «Spotify · Трек».
  mpSpotifyTitle(parsed).then(title => {
    if (!title) return;

    const found = mpTrack(track.id);
    if (!found) return;

    found.name = title.slice(0, 70);
    mpSaveTracks();
    mpPaintAll();
  });

  return true;
}

/** Пробует узнать название трека у Spotify. Ошибки молча гасим. */
function mpSpotifyTitle(parsed) {
  if (typeof fetch !== 'function') return Promise.resolve('');

  const url = 'https://open.spotify.com/' + parsed.type + '/' + parsed.id;
  const endpoint = 'https://open.spotify.com/oembed?url=' + encodeURIComponent(url);

  return fetch(endpoint, { mode: 'cors' })
    .then(response => (response.ok ? response.json() : null))
    .then(data => (data && data.title ? String(data.title) : ''))
    .catch(() => '');
}

/** Отправляет ссылку из поля ввода. */
function submitSpotifyLink(form) {
  const input = form ? form.querySelector('input') : document.getElementById('mpSpotifyInput');
  if (!input) return false;

  const ok = addSpotifyTrack(input.value);

  if (ok) {
    input.value = '';
    const box = document.getElementById('mpSpotifyBox');
    if (box) box.hidden = true;
  }

  return ok;
}

/** Открывает и закрывает поле для ссылки. */
function toggleSpotifyBox() {
  const box = document.getElementById('mpSpotifyBox');
  if (!box) return;

  box.hidden = !box.hidden;

  if (!box.hidden) {
    const input = box.querySelector('input');
    if (input) {
      input.focus();
      if (typeof playUiSound === 'function') playUiSound('click');
    }
  }
}

/* ---------- Воспроизведение ---------- */

function mpVolumeValue() {
  const state = mpState();
  let volume = Number(state.volume);

  if (!Number.isFinite(volume)) {
    volume = typeof musicVolume === 'function' ? musicVolume() * 100 : 40;
  }

  return Math.min(100, Math.max(0, volume));
}

function mpApplyVolume() {
  const audio = mpAudioElement();
  const state = mpState();
  const level = mpVolumeValue() / 100;

  audio.volume = level;
  audio.muted = Boolean(state.muted);

  const input = document.getElementById('mpVolume');
  if (input) input.value = String(Math.round(level * 100));
}

/**
 * Встраивает плеер Spotify вместо своего аудио.
 * Прогресс и время у чужого iframe недоступны — их прячем.
 */
function mpShowSpotify(track) {
  const audio = mpAudioElement();

  // Свой звук глушим, чтобы не играли две дорожки
  if (!audio.paused) audio.pause();

  const frame = document.getElementById('mpSpotifyFrame');
  const art = document.getElementById('mpArt');
  const seek = document.getElementById('mpSeek');
  const times = document.getElementById('mpTimes');
  const volume = document.getElementById('mpVolumeRow');

  if (frame) {
    const spotify = track.spotify;
    const src = MP_SPOTIFY_EMBED + spotify.type + '/' + spotify.id +
      '?utm_source=generator&theme=0';

    if (frame.dataset.src !== src) {
      frame.dataset.src = src;
      frame.src = src;
      frame.style.height = mpSpotifyHeight(spotify.type) + 'px';
    }

    frame.hidden = false;
  }

  if (art) art.classList.add('is-spotify');
  if (seek) seek.hidden = true;
  if (times) times.hidden = true;
  if (volume) volume.hidden = true;

  mpPaintControls();
}

function mpHideSpotify() {
  const frame = document.getElementById('mpSpotifyFrame');
  const art = document.getElementById('mpArt');
  const seek = document.getElementById('mpSeek');
  const times = document.getElementById('mpTimes');
  const volume = document.getElementById('mpVolumeRow');

  if (frame) frame.hidden = true;
  if (art) art.classList.remove('is-spotify');
  if (seek) seek.hidden = false;
  if (times) times.hidden = false;
  if (volume) volume.hidden = false;
}

/** Играет трек trackId с указанной секунды. */
function mpPlayTrack(trackId, at) {
  const track = mpTrack(trackId) || mpTracks[0];
  if (!track) {
    if (typeof showToast === 'function') {
      showToast('Плейлист пуст', 'Добавь файл или вставь ссылку Spotify', 'info', { duration: 4000, icon: 'music' });
    }
    toggleMusicDock(true);
    return;
  }

  mpCurrent = track.id;
  mpSaveState({ trackId: mpCurrent });

  // Spotify: весь звук отдаём встроенному плееру
  if (mpIsSpotify(track)) {
    mpResumeTime = 0;
    mpWantPlay = false;
    mpShowSpotify(track);
    mpPaintAll();
    mpPaintSpotifyNote(track);
    return;
  }

  mpHideSpotify();

  const audio = mpAudioElement();

  mpResumeTime = Number(at) > 1 ? Number(at) : 0;
  mpWantPlay = true;

  if (audio.dataset.trackId !== track.id) {
    audio.dataset.trackId = track.id;
    audio.src = track.data;
  }

  // Встроенный синтез глушим, чтобы не играли две дорожки
  if (typeof stopAmbient === 'function') stopAmbient();

  mpApplyVolume();

  const start = () => {
    if (mpResumeTime > 0 && audio.duration) {
      try { audio.currentTime = Math.min(mpResumeTime, Math.max(0, audio.duration - 1)); } catch (error) { /* пусто */ }
    }

    const promise = audio.play();

    if (promise && promise.catch) {
      promise.catch(() => {
        // Браузер не даёт автозвук до первого клика — ждём его
        mpWantPlay = false;
        mpPaintControls();
        mpSetNote('Нажми ▶ — браузер ждёт клика');
      });
    }
  };

  if (audio.readyState >= 2) start();
  else {
    audio.addEventListener('loadedmetadata', start, { once: true });
    audio.load();
  }

  mpPaintAll();
}

/** Подпись под названием для Spotify. */
function mpPaintSpotifyNote(track) {
  const note = document.getElementById('mpNote');
  if (!note || !track) return;

  note.textContent = 'Spotify · ' + mpSpotifyKindName(track.spotify.type) + ' · нажми ▶ в окне';
}

/* ---------- Перемешивание и повтор ---------- */

/** Очередь перемешивания: не повторяет треки, пока не пройдёт все. */
function mpNextShuffled() {
  if (!mpShuffleBag.length) {
    mpShuffleBag = mpTracks.map(item => item.id);
    for (let i = mpShuffleBag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = mpShuffleBag[i];
      mpShuffleBag[i] = mpShuffleBag[j];
      mpShuffleBag[j] = tmp;
    }
  }

  const next = mpShuffleBag.pop();
  return next === mpCurrent && mpShuffleBag.length ? mpShuffleBag.pop() : next;
}

/** Включает и выключает перемешивание. */
function toggleShuffle() {
  const state = mpState();
  const on = !state.shuffle;

  mpSaveState({ shuffle: on });
  mpShuffleBag = [];

  if (typeof showToast === 'function') {
    showToast(on ? 'Перемешивание включено' : 'Перемешивание выключено',
      on ? 'Треки пойдут в случайном порядке' : 'Снова по порядку', 'info', { duration: 1900 });
  }

  mpPaintAll();
}

/** Повтор: выкл → один трек → весь плейлист. */
function cycleRepeat() {
  const order = ['off', 'one', 'all'];
  const state = mpState();
  const next = order[(order.indexOf(state.repeat) + 1) % order.length];

  mpSaveState({ repeat: next });
  mpSyncAudioLoop();

  const titles = { off: 'Повтор выключен', one: 'Повтор одного трека', all: 'Повтор всего плейлиста' };
  if (typeof showToast === 'function') showToast(titles[next], '', 'info', { duration: 1600 });

  mpPaintAll();
}

/** Встроенный loop у audio — только для «повтора одного». */
function mpSyncAudioLoop() {
  const audio = mpAudioElement();
  audio.loop = mpState().repeat === 'one';
}

/** Переключение трека: +1 вперёд, −1 назад. */
function mpStep(direction, autoNext) {
  if (!mpTracks.length) return;

  if (autoNext && mpTracks.length === 1) {
    const track = mpTracks[0];

    if (mpIsSpotify(track)) return;

    const audio = mpAudioElement();
    try { audio.currentTime = 0; } catch (error) { /* пусто */ }
    audio.play().catch(() => { /* пусто */ });
    return;
  }

  const state = mpState();

  if (direction > 0 && state.shuffle) {
    const next = mpNextShuffled();
    if (next) mpPlayTrack(next, 0);
    return;
  }

  const index = Math.max(0, mpTracks.findIndex(item => item.id === mpCurrent));
  let next = index + direction;

  if (next >= mpTracks.length) next = state.repeat === 'all' || autoNext ? 0 : mpTracks.length - 1;
  if (next < 0) next = mpTracks.length - 1;

  mpPlayTrack(mpTracks[next].id, 0);
}

function mpTogglePlay() {
  const track = mpCurrentTrack();

  if (!track) {
    if (typeof showToast === 'function') showToast('Плейлист пуст', 'Сначала добавь трек', 'info');
    return;
  }

  // Spotify управляется своим встроенным плеером
  if (mpIsSpotify(track)) {
    const frame = document.getElementById('mpSpotifyFrame');
    if (frame && frame.hidden) mpShowSpotify(track);
    mpSetNote('▶ в окне Spotify — браузер не даёт управлять чужим плеером');
    return;
  }

  const audio = mpAudioElement();

  if (!audio.src || audio.dataset.trackId !== mpCurrent) {
    mpPlayTrack(mpCurrent || mpTracks[0].id, 0);
    return;
  }

  if (audio.paused) {
    const promise = audio.play();
    if (promise && promise.catch) promise.catch(() => mpSetNote('Браузер не дал включить — нажми ещё раз'));
  } else {
    audio.pause();
  }
}

function mpSeekBy(seconds) {
  const audio = mpAudioElement();
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

  const target = Math.min(audio.duration, Math.max(0, (audio.currentTime || 0) + seconds));
  try { audio.currentTime = target; } catch (error) { /* пусто */ }
  mpPaintProgress();
}

function mpSeekToRatio(ratio) {
  const audio = mpAudioElement();
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

  const share = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  try { audio.currentTime = audio.duration * share; } catch (error) { /* пусто */ }
  mpPaintProgress();
}

function mpSetVolume(percent) {
  const volume = Math.min(100, Math.max(0, Number(percent) || 0));

  mpSaveState({ volume });
  mpApplyVolume();

  // Держим ползунок в настройках синхронным
  const settingsRange = document.querySelector('[data-setting="sound.musicVolume"]');
  if (settingsRange && settingsRange.value !== String(volume)) {
    settingsRange.value = String(volume);
    const label = settingsRange.parentElement.querySelector('.range-value');
    if (label) label.textContent = Math.round(volume) + '%';
    if (typeof setSettingValue === 'function') setSettingValue('sound.musicVolume', String(volume));
  }
}

/* ---------- Медиа-клавиши ---------- */

/** Отдаём системе название трека — медиа-клавиши и экран блокировки. */
function mpUpdateMediaSession() {
  if (!('mediaSession' in navigator)) return;

  const track = mpCurrentTrack();
  if (!track || mpIsSpotify(track)) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: 'AniLingo',
      album: 'Своя музыка'
    });

    navigator.mediaSession.setActionHandler('play', () => mpTogglePlay());
    navigator.mediaSession.setActionHandler('pause', () => mpTogglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => mpStep(-1));
    navigator.mediaSession.setActionHandler('nexttrack', () => mpStep(1));
  } catch (error) {
    // Старый браузер без MediaMetadata — просто пропускаем
  }
}

/* ---------- Обложка ---------- */

/**
 * Считает стабильный оттенок и пару кандзи по названию трека.
 * Обложка получается своя у каждого файла, без картинок и сети.
 */
function mpArtFor(track) {
  const name = (track && track.name) || 'AniLingo';
  let hash = 0;

  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 100000;
  }

  const kanji = ['音', '律', '歌', '響', '風', '月', '星', '空', '光', '夢'];
  const first = kanji[hash % kanji.length];
  const second = kanji[(hash * 7 + 3) % kanji.length];
  const hue = (hash * 13) % 360;

  return {
    hue,
    marks: first === second ? first : first + second,
    initials: name.trim().slice(0, 1).toUpperCase() || '♪'
  };
}

/** Красит обложку и винил под текущий трек. */
function mpPaintArt() {
  const art = document.getElementById('mpArt');
  const track = mpCurrentTrack();
  if (!art) return;

  if (!track) {
    art.style.removeProperty('--art-hue');
    art.style.removeProperty('--art-hue-2');
    const text = art.querySelector('.mp-art-marks');
    if (text) text.textContent = '♪';
    mpPaintEqualizer(false);
    return;
  }

  const info = mpArtFor(track);
  art.style.setProperty('--art-hue', String(info.hue));
  art.style.setProperty('--art-hue-2', String((info.hue + 42) % 360));

  const text = art.querySelector('.mp-art-marks');
  if (text) text.textContent = mpIsSpotify(track) ? '♫' : info.marks;

  mpPaintEqualizer(Boolean(mpAudio && !mpAudio.paused) && !mpIsSpotify(track));
}

/** Полоски эквалайзера: играет — танцуют, стоит — замирают. */
function mpPaintEqualizer(playing) {
  const dock = document.getElementById('musicDock');
  if (!dock) return;

  dock.classList.toggle('is-playing', Boolean(playing));
}

/* ---------- Отрисовка ---------- */

function mpFormatTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, '0');
  return minutes + ':' + rest;
}

function mpSetNote(text) {
  const note = document.getElementById('mpNote');
  if (!note) return;

  if (text) {
    note.textContent = text;
    return;
  }

  const track = mpCurrentTrack();

  if (track && mpIsSpotify(track)) {
    mpPaintSpotifyNote(track);
    return;
  }

  note.textContent = mpTracks.length
    ? 'Трек ' + (mpTracks.findIndex(item => item.id === mpCurrent) + 1) + ' из ' + mpTracks.length
    : 'Добавь файл или ссылку Spotify';
}

function mpPaintProgress() {
  const audio = mpAudio;
  const fill = document.getElementById('mpFill');
  const time = document.getElementById('mpTime');
  const duration = document.getElementById('mpDur');
  const bar = document.getElementById('mpSeek');

  if (!(audio && fill && time && duration)) return;

  const total = audio.duration || 0;
  const ratio = total ? Math.min(1, audio.currentTime / total) : 0;

  fill.style.width = (ratio * 100).toFixed(2) + '%';
  time.textContent = mpFormatTime(audio.currentTime);
  duration.textContent = total ? mpFormatTime(total) : '0:00';

  if (bar) bar.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
}

function mpPaintControls() {
  const audio = mpAudio;
  const track = mpCurrentTrack();
  const spotify = mpIsSpotify(track);
  const playing = spotify ? false : Boolean(audio && !audio.paused);

  const button = document.getElementById('mpPlay');
  if (button) {
    button.dataset.playing = playing ? 'true' : 'false';
    button.setAttribute('aria-label', playing ? 'Пауза' : 'Играть');
    button.title = spotify ? 'Управление — в окне Spotify' : (playing ? 'Пауза' : 'Играть');
  }

  const dock = document.getElementById('musicDock');
  if (dock) {
    dock.classList.toggle('is-playing', playing);
    dock.classList.toggle('is-spotify', spotify);
  }

  const name = document.getElementById('mpName');
  if (name) {
    name.textContent = track ? track.name : 'Плейлист пуст';
    name.title = track ? track.name : '';
  }

  // Кнопки «повтор» и «перемешать» показывают своё состояние
  const state = mpState();
  const shuffle = document.getElementById('mpShuffle');
  if (shuffle) shuffle.classList.toggle('is-on', Boolean(state.shuffle));

  const repeat = document.getElementById('mpRepeat');
  if (repeat) {
    repeat.dataset.mode = state.repeat || 'off';
    repeat.classList.toggle('is-on', (state.repeat || 'off') !== 'off');
    repeat.setAttribute('aria-label', {
      off: 'Повтор выключен',
      one: 'Повтор одного трека',
      all: 'Повтор всего плейлиста'
    }[state.repeat || 'off']);
  }

  // Значок на свёрнутой кнопке: сколько треков в плейлисте
  const badge = document.getElementById('mpBadge');
  if (badge) {
    badge.textContent = String(mpTracks.length);
    badge.hidden = !mpTracks.length;
  }
}

function mpPaintList() {
  const list = document.getElementById('mpList');
  const count = document.getElementById('mpListCount');

  if (count) count.textContent = String(mpTracks.length);

  if (!list) return;

  if (!mpTracks.length) {
    list.innerHTML = '<div class="mp-empty">Пока пусто. Добавь файл или вставь ссылку Spotify — всё останется только в этом браузере.</div>';
    return;
  }

  list.innerHTML = mpTracks.map((item, index) => {
    const spotify = mpIsSpotify(item);
    const safeName = String(item.name).replace(/"/g, '&quot;');

    return `
    <div class="mp-row${item.id === mpCurrent ? ' is-current' : ''}${spotify ? ' is-spotify' : ''}">
      <button class="mp-row-play" type="button" onclick="playMusicTrack('${item.id}')"
              title="Играть: ${safeName}" aria-label="Играть: ${safeName}">
        ${spotify
          ? '<svg viewBox="0 0 24 24" aria-hidden="true" class="mp-row-spotify"><circle cx="12" cy="12" r="9"></circle><path d="M7.5 9.4c3-.8 6.2-.6 8.8.7M8 12.4c2.4-.6 5-.4 7.1.6M8.6 15.2c1.8-.4 3.7-.2 5.3.5"></path></svg>'
          : `<span class="mp-row-num">${index + 1}</span>`}
      </button>
      <span class="mp-row-name" title="${safeName}">${safeName}</span>
      <button class="mp-row-del" type="button" onclick="removeMusicTrack('${item.id}')" title="Убрать трек" aria-label="Убрать трек">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
      </button>
    </div>
  `;
  }).join('');
}

function mpPaintAll() {
  mpPaintControls();
  mpPaintProgress();
  mpPaintArt();
  mpPaintList();
  mpSetNote('');
  mpUpdateMediaSession();

  // Подпись в настройках
  const label = document.getElementById('customMusicState');
  if (label) {
    const track = mpCurrentTrack();
    label.textContent = track
      ? 'В плейлисте: ' + mpTracks.length + ' · сейчас: ' + track.name
      : 'Плейлист пуст — добавь первый трек';
  }
}

/* ---------- Окно плеера ---------- */

/** Полоски эквалайзера. Высоты разные, чтобы «жило» без JS-анимации. */
function mpEqualizerMarkup(count) {
  let bars = '';

  for (let i = 0; i < count; i += 1) {
    const delay = (i * 0.11).toFixed(2);
    const height = 22 + ((i * 37) % 62);

    bars += '<i style="--i:' + i + ';--h:' + height + '%;--d:' + delay + 's"></i>';
  }

  return bars;
}

function mpBuildDock() {
  if (document.getElementById('musicDock')) return document.getElementById('musicDock');

  const dock = document.createElement('div');
  dock.className = 'music-dock';
  dock.id = 'musicDock';
  dock.innerHTML = `
    <button class="music-dock-toggle" id="musicDockToggle" type="button"
            onclick="toggleMusicDock()" aria-label="Музыка" title="Музыка">
      <span class="mdt-disc" aria-hidden="true">
        <span class="mdt-grooves"></span>
        <span class="mdt-label">♪</span>
      </span>
      <span class="mdt-eq" aria-hidden="true">${mpEqualizerMarkup(4)}</span>
      <span class="mdt-badge" id="mpBadge" hidden>0</span>
    </button>

    <section class="music-dock-panel" id="musicDockPanel" aria-label="Музыкальный плеер">
      <span class="mdp-glow" aria-hidden="true"></span>

      <header class="music-dock-head">
        <span class="music-dock-eyebrow">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="mdp-wave">
            <path d="M4 14v-4M8 18V6M12 20V4M16 17V7M20 14v-4"></path>
          </svg>
          AniLingo Radio
        </span>
        <button class="music-dock-hide" type="button" onclick="toggleMusicDock(false)"
                title="Свернуть" aria-label="Свернуть плеер">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
        </button>
      </header>

      <div class="mp-stage">
        <div class="mp-art" id="mpArt" aria-hidden="true">
          <span class="mp-art-ring"></span>
          <span class="mp-art-ring mp-art-ring-2"></span>
          <span class="mp-art-marks">♪</span>
          <span class="mp-art-shine"></span>
        </div>

        <div class="mp-eq" id="mpEq" aria-hidden="true">${mpEqualizerMarkup(14)}</div>
      </div>

      <div class="mp-meta">
        <div class="mp-name" id="mpName">Плейлист пуст</div>
        <div class="mp-note" id="mpNote">Добавь файл или ссылку Spotify</div>
      </div>

      <div class="mp-spotify-holder">
        <iframe id="mpSpotifyFrame" class="mp-spotify-frame" hidden
                title="Плеер Spotify" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                referrerpolicy="strict-origin-when-cross-origin"></iframe>
      </div>

      <div class="mp-seek" id="mpSeek" role="slider" tabindex="0"
           aria-label="Перемотка" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <span class="mp-seek-fill" id="mpFill"></span>
        <span class="mp-seek-knob" aria-hidden="true"></span>
      </div>

      <div class="mp-time" id="mpTimes">
        <span id="mpTime">0:00</span>
        <span id="mpDur">0:00</span>
      </div>

      <div class="mp-controls">
        <button class="mp-btn mp-btn-ghost" id="mpShuffle" type="button" onclick="toggleShuffle()"
                title="Перемешать" aria-label="Перемешать">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h4l10 10h4M3 17h4L17 7h4"></path><path d="M18 4l3 3-3 3M18 14l3 3-3 3"></path></svg>
        </button>

        <button class="mp-btn" type="button" onclick="musicPrev()" title="Предыдущий трек" aria-label="Предыдущий трек">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14L9 12z"></path><path d="M6 5v14"></path></svg>
        </button>

        <button class="mp-btn mp-btn-small" type="button" onclick="musicSeek(-10)" title="Назад 10 секунд" aria-label="Назад 10 секунд">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 9 6 12l5 3z"></path><path d="M6 12a6 6 0 1 1 6 6"></path></svg>
        </button>

        <button class="mp-btn mp-btn-play" id="mpPlay" type="button" onclick="musicToggle()"
                data-playing="false" title="Играть" aria-label="Играть">
          <svg class="mp-icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z"></path></svg>
          <svg class="mp-icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"></path></svg>
        </button>

        <button class="mp-btn mp-btn-small" type="button" onclick="musicSeek(10)" title="Вперёд 10 секунд" aria-label="Вперёд 10 секунд">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 9l5 3-5 3z"></path><path d="M18 12a6 6 0 1 0-6 6"></path></svg>
        </button>

        <button class="mp-btn" type="button" onclick="musicNext()" title="Следующий трек" aria-label="Следующий трек">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14l9-7z"></path><path d="M18 5v14"></path></svg>
        </button>

        <button class="mp-btn mp-btn-ghost" id="mpRepeat" type="button" onclick="cycleRepeat()"
                data-mode="off" title="Повтор" aria-label="Повтор выключен">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3l3 3-3 3"></path><path d="M4 12V9a3 3 0 0 1 3-3h13"></path><path d="M7 21l-3-3 3-3"></path><path d="M20 12v3a3 3 0 0 1-3 3H4"></path></svg>
          <span class="mp-repeat-one" aria-hidden="true">1</span>
        </button>
      </div>

      <div class="mp-volume" id="mpVolumeRow">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z"></path><path d="M16 9a4 4 0 0 1 0 6"></path></svg>
        <input type="range" id="mpVolume" min="0" max="100" step="1" value="40"
               oninput="setMusicVolume(this.value)" aria-label="Громкость музыки">
      </div>

      <button class="mp-list-toggle" type="button" onclick="toggleMusicList()" aria-expanded="false" id="mpListToggle">
        <span>Плейлист · <span id="mpListCount">0</span></span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>
      </button>

      <div class="mp-list" id="mpList" hidden></div>

      <div class="mp-sources">
        <label class="mp-add">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
          Свой файл
          <input type="file" accept="audio/*" onchange="pickCustomMusic(this)" hidden>
        </label>

        <button class="mp-add mp-add-spotify" type="button" onclick="toggleSpotifyBox()">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="mp-spotify-icon">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M7.5 9.4c3-.8 6.2-.6 8.8.7M8 12.4c2.4-.6 5-.4 7.1.6M8.6 15.2c1.8-.4 3.7-.2 5.3.5"></path>
          </svg>
          Spotify
        </button>
      </div>

      <form class="mp-spotify-box" id="mpSpotifyBox" hidden
            onsubmit="event.preventDefault(); submitSpotifyLink(this)">
        <label class="mp-spotify-label" for="mpSpotifyInput">Ссылка на трек, альбом или плейлист</label>
        <div class="mp-spotify-row">
          <input class="mp-spotify-input" id="mpSpotifyInput" type="text" inputmode="url" autocomplete="off"
                 placeholder="open.spotify.com/track/…">
          <button class="mp-spotify-go" type="submit" title="Подключить" aria-label="Подключить">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"></path></svg>
          </button>
        </div>
        <p class="mp-spotify-hint">Играет в окне Spotify. Ничего не скачивается и не хранится — только ссылка.</p>
      </form>
    </section>
  `;

  document.body.appendChild(dock);

  // Перемотка мышью и пальцем
  const seek = dock.querySelector('#mpSeek');
  const seekFromEvent = event => {
    const rect = seek.getBoundingClientRect();
    if (!rect.width) return;
    const x = (event.touches ? event.touches[0].clientX : event.clientX) - rect.left;
    mpSeekToRatio(Math.min(1, Math.max(0, x / rect.width)));
  };

  let dragging = false;

  seek.addEventListener('pointerdown', event => {
    dragging = true;
    if (seek.setPointerCapture) {
      try { seek.setPointerCapture(event.pointerId); } catch (error) { /* пусто */ }
    }
    seekFromEvent(event);
  });
  seek.addEventListener('pointermove', event => { if (dragging) seekFromEvent(event); });
  seek.addEventListener('pointerup', () => { dragging = false; });
  seek.addEventListener('pointercancel', () => { dragging = false; });

  seek.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { mpSeekBy(10); event.preventDefault(); }
    if (event.key === 'ArrowLeft') { mpSeekBy(-10); event.preventDefault(); }
  });

  return dock;
}

/** Открывает или сворачивает окно плеера. */
function toggleMusicDock(force) {
  const dock = mpBuildDock();
  const open = typeof force === 'boolean' ? force : !dock.classList.contains('is-open');

  dock.classList.toggle('is-open', open);
  mpSaveState({ hidden: !open });

  if (open) {
    mpPaintAll();
    mpApplyVolume();
    if (typeof playUiSound === 'function') playUiSound('open');
  }
}

function toggleMusicList() {
  const list = document.getElementById('mpList');
  const toggle = document.getElementById('mpListToggle');
  if (!list) return;

  const open = list.hasAttribute('hidden');
  list.toggleAttribute('hidden', !open);
  if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');

  if (open) mpPaintList();
}

/* ---------- Публичные действия ---------- */

function playMusicTrack(trackId) {
  mpPlayTrack(trackId, 0);
}

function removeMusicTrack(trackId) {
  const index = mpTracks.findIndex(item => item.id === trackId);
  if (index < 0) return;

  const removed = mpTracks[index];
  const wasCurrent = removed.id === mpCurrent;

  mpTracks.splice(index, 1);
  mpSaveTracks();

  // Освобождаем окно Spotify, если убрали именно его
  if (wasCurrent && mpIsSpotify(removed)) {
    const frame = document.getElementById('mpSpotifyFrame');
    if (frame) {
      frame.removeAttribute('src');
      frame.dataset.src = '';
      frame.hidden = true;
    }
  }

  if (wasCurrent) {
    const audio = mpAudioElement();
    audio.pause();
    audio.removeAttribute('src');
    audio.dataset.trackId = '';
    mpCurrent = mpTracks.length ? mpTracks[Math.min(index, mpTracks.length - 1)].id : '';
    mpSaveState({ trackId: mpCurrent, time: 0, playing: false });

    if (mpCurrent) mpPlayTrack(mpCurrent, 0);
  }

  mpPaintAll();
  if (typeof showToast === 'function') showToast('Трек убран', 'Плейлист обновлён', 'info', { duration: 2200 });
}

/** Добавляет выбранный файл в плейлист и включает его. */
function pickCustomMusic(input) {
  const file = input && input.files && input.files[0];
  if (!file) return;

  if (!/^audio\//.test(file.type) && !/\.(mp3|ogg|wav|m4a|flac|aac)$/i.test(file.name)) {
    if (typeof showToast === 'function') showToast('Нужен аудиофайл', 'Подойдёт MP3, OGG или WAV', 'error');
    input.value = '';
    return;
  }

  if (file.size > MP_MAX_TRACK_BYTES) {
    if (typeof showToast === 'function') {
      showToast('Файл слишком большой',
        'Лимит — 1,8 МБ на трек: браузер хранит музыку в localStorage, а base64 съедает ещё треть. ' +
        'Длинный трек лучше добавить ссылкой Spotify',
        'error', { duration: 7200 });
    }
    input.value = '';
    return;
  }

  if (mpTracks.length >= MP_MAX_TRACKS) {
    if (typeof showToast === 'function') {
      showToast('Плейлист заполнен', 'Больше ' + MP_MAX_TRACKS + ' треков localStorage не выдержит', 'warning', { duration: 5000 });
    }
    input.value = '';
    return;
  }

  const reader = new FileReader();

  reader.onerror = () => {
    if (typeof showToast === 'function') showToast('Не удалось прочитать файл', 'Попробуй другой трек', 'error');
  };

  reader.onload = () => {
    const track = {
      id: 'tr' + Date.now(),
      name: file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Трек',
      kind: 'file',
      data: String(reader.result)
    };

    mpTracks.push(track);

    // Если места не хватило — откатываем
    if (!mpSaveTracks()) {
      mpTracks.pop();
      input.value = '';
      return;
    }

    mpBuildDock();
    mpPlayTrack(track.id, 0);
    toggleMusicDock(true);

    if (typeof showToast === 'function') {
      showToast('Трек добавлен', 'Плеер в правом нижнем углу — он играет на всех страницах', 'success', { icon: 'music', duration: 3600 });
    }

    if (typeof renderCustomizationState === 'function') renderCustomizationState();
    input.value = '';
  };

  reader.readAsDataURL(file);
}

/** Совместимость со старыми кнопками в настройках. */
function playCustomMusic() {
  mpBuildDock();
  if (!mpTracks.length) {
    if (typeof showToast === 'function') showToast('Плейлист пуст', 'Сначала добавь трек', 'info');
    toggleMusicDock(true);
    return;
  }
  mpPlayTrack(mpCurrent || mpTracks[0].id, 0);
}

function stopCustomMusic() {
  const audio = mpAudioElement();
  audio.pause();
  mpSaveState({ playing: false, time: audio.currentTime || 0 });
  mpPaintControls();
}

function clearCustomMusic() {
  const track = mpCurrentTrack();
  if (!track) {
    if (typeof showToast === 'function') showToast('Плейлист и так пуст', 'Добавь трек кнопкой выше', 'info');
    return;
  }
  removeMusicTrack(track.id);
  if (typeof renderCustomizationState === 'function') renderCustomizationState();
}

function hasCustomMusic() {
  return mpTracks.length > 0;
}

/* ---------- Старт ---------- */

/**
 * Переносит трек из старой версии (он лежал одним файлом в
 * nihongo_custom_music) в новый плейлист.
 */
function mpMigrateOldTrack() {
  const old = mpRead('nihongo_custom_music', '');
  if (!old) return;

  if (!mpTracks.length) {
    mpTracks = [{ id: 'tr' + Date.now(), name: 'Мой трек', kind: 'file', data: old }];
    mpSaveTracks();
  }

  try { localStorage.removeItem('nihongo_custom_music'); } catch (error) { /* пусто */ }
}

function initMusicPlayer() {
  mpLoadTracks();
  mpMigrateOldTrack();

  const state = mpState();

  mpCurrent = mpTrack(state.trackId) ? state.trackId : (mpTracks[0] ? mpTracks[0].id : '');
  mpBuildDock();
  mpApplyVolume();
  mpSyncAudioLoop();
  mpPaintAll();

  if (!mpTracks.length) {
    // Пустой плейлист: кнопка есть, окно объясняет, что делать
    toggleMusicDock(false);
    return;
  }

  toggleMusicDock(!state.hidden);

  const track = mpTrack(mpCurrent);

  // Spotify поднимаем сразу: iframe сам покажет свою кнопку
  if (mpIsSpotify(track)) {
    mpShowSpotify(track);
    return;
  }

  // Продолжаем трек с той же секунды, что и на прошлой странице
  if (state.playing) {
    mpPlayTrack(mpCurrent, Number(state.time) || 0);
  } else {
    // Трек не играл: только готовим его и возвращаем прошлую секунду
    const audio = mpAudioElement();
    audio.dataset.trackId = mpCurrent;
    audio.src = track.data;
    mpResumeTime = Number(state.time) || 0;
    audio.load();
    mpPaintProgress();
  }
}

/** Пробел — пауза, стрелки — перемотка. Только вне полей ввода. */
function mpHandleHotkey(event) {
  if (event.defaultPrevented) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const tag = (event.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (event.target.isContentEditable) return;

  const dock = document.getElementById('musicDock');
  if (!dock || !mpTracks.length) return;

  if (event.code === 'Space' && !document.body.classList.contains('modal-open')) {
    // Не мешаем прокрутке, если человек играет где-то ещё
    if (document.activeElement && document.activeElement.closest('.mp-row, .mp-list')) return;
    event.preventDefault();
    mpTogglePlay();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initMusicPlayer();

  // Сохраняем позицию перед уходом со страницы
  window.addEventListener('pagehide', () => {
    if (!mpAudio) return;
    mpSaveState({
      trackId: mpCurrent,
      time: mpAudio.currentTime || 0,
      playing: !mpAudio.paused
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') mpSaveSoon();
  });

  // Громкость из настроек — на плеер
  document.addEventListener('change', event => {
    if (!event.target.closest('[data-setting="sound.musicVolume"]')) return;
    const value = Number(event.target.value);
    mpSaveState({ volume: value });
    mpApplyVolume();
  }, true);

  // Разные вкладки не должны спорить
  window.addEventListener('storage', event => {
    if (event.key === MP_LIST_KEY) {
      mpLoadTracks();
      mpPaintAll();
    }

    if (event.key === MP_STATE_KEY) {
      mpPaintControls();
    }
  });

  document.addEventListener('keydown', mpHandleHotkey);
});

/* Экспорт */
window.pickCustomMusic = pickCustomMusic;
window.playCustomMusic = playCustomMusic;
window.stopCustomMusic = stopCustomMusic;
window.clearCustomMusic = clearCustomMusic;
window.hasCustomMusic = hasCustomMusic;
window.playMusicTrack = playMusicTrack;
window.removeMusicTrack = removeMusicTrack;
window.musicToggle = mpTogglePlay;
window.musicNext = () => mpStep(1);
window.musicPrev = () => mpStep(-1);
window.musicSeek = mpSeekBy;
window.setMusicVolume = mpSetVolume;
window.toggleMusicDock = toggleMusicDock;
window.toggleMusicList = toggleMusicList;
window.initMusicPlayer = initMusicPlayer;
window.refreshPlayerLabels = mpPaintAll;
window.getMusicPlaylist = () => mpTracks;

// Новое в волне 12
window.toggleShuffle = toggleShuffle;
window.cycleRepeat = cycleRepeat;
window.addSpotifyTrack = addSpotifyTrack;
window.submitSpotifyLink = submitSpotifyLink;
window.toggleSpotifyBox = toggleSpotifyBox;
window.mpParseSpotify = mpParseSpotify;
window.mpArtFor = mpArtFor;
