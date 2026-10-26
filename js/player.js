/* ============================================================
   player.js — своя музыка и мини-плеер в углу
   • плейлист из загруженных файлов (data URL, только localStorage);
   • плеер в правом нижнем углу: пауза, ±10 секунд, переключение
     треков, громкость, перемотка по полосе и сворачивание в кнопку;
   • при переходе на другую страницу сайта трек продолжается:
     позиция и состояние сохраняются, новая страница ставит ту же
     секунду и включает воспроизведение.
   ============================================================ */

'use strict';

const MP_LIST_KEY = 'nihongo_playlist';   // [{ id, name, data }]
const MP_STATE_KEY = 'nihongo_player';    // { trackId, time, playing, volume, muted, hidden }

const MP_MAX_TRACK_BYTES = 1.8 * 1024 * 1024;  // один файл: base64 съедает треть
const MP_MAX_TRACKS = 8;                        // больше не влезет в localStorage

let mpTracks = [];
let mpCurrent = '';
let mpAudio = null;
let mpSaveTimer = 0;
let mpResumeTime = 0;
let mpWantPlay = false;

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
  mpTracks = Array.isArray(saved) ? saved.filter(item => item && item.id && item.data) : [];
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
    hidden: false
  }, mpReadJson(MP_STATE_KEY, {}));
}

function mpSaveState(patch) {
  const next = Object.assign(mpState(), patch || {});
  mpWrite(MP_STATE_KEY, JSON.stringify(next));
  return next;
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

  mpAudio.addEventListener('play', () => { mpPaintControls(); mpSaveState({ playing: true }); });
  mpAudio.addEventListener('pause', () => { mpPaintControls(); mpSaveState({ playing: false }); });

  // Трек кончился — переходим к следующему
  mpAudio.addEventListener('ended', () => mpStep(1, true));

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

/** Играет трек trackId с указанной секунды. */
function mpPlayTrack(trackId, at) {
  const track = mpTrack(trackId) || mpTracks[0];
  if (!track) {
    if (typeof showToast === 'function') {
      showToast('Плейлист пуст', 'Добавь трек в настройках — Звук — Своя музыка', 'info', { duration: 4000, icon: 'music' });
    }
    mpOpenDock(true);
    return;
  }

  const audio = mpAudioElement();

  mpCurrent = track.id;
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

/** Переключение трека: +1 вперёд, −1 назад. */
function mpStep(direction, autoNext) {
  if (!mpTracks.length) return;

  if (autoNext && mpTracks.length === 1) {
    const audio = mpAudioElement();
    try { audio.currentTime = 0; } catch (error) { /* пусто */ }
    audio.play().catch(() => { /* пусто */ });
    return;
  }

  const index = Math.max(0, mpTracks.findIndex(item => item.id === mpCurrent));
  const next = (index + direction + mpTracks.length) % mpTracks.length;

  mpPlayTrack(mpTracks[next].id, 0);
}

function mpTogglePlay() {
  const audio = mpAudioElement();

  if (!mpCurrentTrack()) {
    if (typeof showToast === 'function') showToast('Плейлист пуст', 'Сначала добавь трек', 'info');
    return;
  }

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

/* ---------- Обложка и подписи ---------- */

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

  note.textContent = mpTracks.length
    ? 'Трек ' + (mpTracks.findIndex(item => item.id === mpCurrent) + 1) + ' из ' + mpTracks.length
    : 'Добавь файл — плеер появится здесь';
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
  const button = document.getElementById('mpPlay');
  const dock = document.getElementById('musicDock');

  if (button) {
    const playing = Boolean(audio && !audio.paused);
    button.dataset.playing = playing ? 'true' : 'false';
    button.setAttribute('aria-label', playing ? 'Пауза' : 'Играть');
  }

  if (dock) dock.classList.toggle('is-playing', Boolean(audio && !audio.paused));

  const name = document.getElementById('mpName');
  if (name) {
    const track = mpCurrentTrack();
    name.textContent = track ? track.name : 'Плейлист пуст';
    name.title = track ? track.name : '';
  }
}

function mpPaintList() {
  const list = document.getElementById('mpList');
  const count = document.getElementById('mpListCount');

  if (count) count.textContent = String(mpTracks.length);

  if (!list) return;

  if (!mpTracks.length) {
    list.innerHTML = '<div class="mp-empty">Пока пусто. Нажми «Добавить трек» — файл останется только в этом браузере.</div>';
    return;
  }

  list.innerHTML = mpTracks.map((item, index) => `
    <div class="mp-row${item.id === mpCurrent ? ' is-current' : ''}">
      <button class="mp-row-play" type="button" onclick="playMusicTrack('${item.id}')"
              title="Играть: ${item.name.replace(/"/g, '&quot;')}">
        <span class="mp-row-num">${index + 1}</span>
      </button>
      <span class="mp-row-name" title="${item.name.replace(/"/g, '&quot;')}">${item.name}</span>
      <button class="mp-row-del" type="button" onclick="removeMusicTrack('${item.id}')" title="Убрать трек" aria-label="Убрать трек">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
      </button>
    </div>
  `).join('');
}

function mpPaintAll() {
  mpPaintControls();
  mpPaintProgress();
  mpPaintList();
  mpSetNote('');

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

function mpBuildDock() {
  if (document.getElementById('musicDock')) return document.getElementById('musicDock');

  const dock = document.createElement('div');
  dock.className = 'music-dock';
  dock.id = 'musicDock';
  dock.innerHTML = `
    <button class="music-dock-toggle" id="musicDockToggle" type="button"
            onclick="toggleMusicDock()" aria-label="Музыка" title="Музыка">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 18V6l10-2v12"></path>
        <circle cx="6.5" cy="18" r="2.8"></circle>
        <circle cx="16.5" cy="16" r="2.8"></circle>
      </svg>
      <span class="music-dock-label">Музыка</span>
      <span class="music-dock-dot" aria-hidden="true"></span>
    </button>

    <section class="music-dock-panel" id="musicDockPanel" aria-label="Музыкальный плеер">
      <header class="music-dock-head">
        <span class="music-dock-eyebrow">♪ Своя музыка</span>
        <button class="music-dock-hide" type="button" onclick="toggleMusicDock(false)"
                title="Свернуть" aria-label="Свернуть плеер">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
        </button>
      </header>

      <div class="music-dock-track">
        <div class="mp-cover" aria-hidden="true">♪</div>
        <div class="mp-meta">
          <div class="mp-name" id="mpName">Плейлист пуст</div>
          <div class="mp-note" id="mpNote">Добавь файл — плеер появится здесь</div>
        </div>
      </div>

      <div class="mp-seek" id="mpSeek" role="slider" tabindex="0"
           aria-label="Перемотка" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <span class="mp-seek-fill" id="mpFill"></span>
      </div>

      <div class="mp-time">
        <span id="mpTime">0:00</span>
        <span id="mpDur">0:00</span>
      </div>

      <div class="mp-controls">
        <button class="mp-btn" type="button" onclick="musicPrev()" title="Предыдущий трек" aria-label="Предыдущий трек">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14L9 12z M6 5v14"></path></svg>
        </button>
        <button class="mp-btn mp-btn-small" type="button" onclick="musicSeek(-10)" title="Назад 10 секунд" aria-label="Назад 10 секунд">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 8 5 12l6 4z"></path><path d="M5 12a7 7 0 1 1 7 7"></path></svg>
        </button>
        <button class="mp-btn mp-btn-play" id="mpPlay" type="button" onclick="musicToggle()"
                data-playing="false" title="Играть" aria-label="Играть">
          <svg class="mp-icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z"></path></svg>
          <svg class="mp-icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"></path></svg>
        </button>
        <button class="mp-btn mp-btn-small" type="button" onclick="musicSeek(10)" title="Вперёд 10 секунд" aria-label="Вперёд 10 секунд">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 8l6 4-6 4z"></path><path d="M19 12a7 7 0 1 0-7 7"></path></svg>
        </button>
        <button class="mp-btn" type="button" onclick="musicNext()" title="Следующий трек" aria-label="Следующий трек">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14l9-7z M18 5v14"></path></svg>
        </button>
      </div>

      <div class="mp-volume">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z"></path><path d="M16 9a4 4 0 0 1 0 6"></path></svg>
        <input type="range" id="mpVolume" min="0" max="100" step="1" value="40"
               oninput="setMusicVolume(this.value)" aria-label="Громкость музыки">
      </div>

      <button class="mp-list-toggle" type="button" onclick="toggleMusicList()" aria-expanded="false" id="mpListToggle">
        Плейлист · <span id="mpListCount">0</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>
      </button>

      <div class="mp-list" id="mpList" hidden></div>

      <label class="mp-add">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
        Добавить трек
        <input type="file" accept="audio/*" onchange="pickCustomMusic(this)" hidden>
      </label>
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
    const toggle = document.getElementById('mpListToggle');
    if (toggle && toggle.getAttribute('aria-expanded') === 'false') {
      // плейлист открывается отдельной кнопкой
    }
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

  const wasCurrent = mpTracks[index].id === mpCurrent;

  mpTracks.splice(index, 1);
  mpSaveTracks();

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
        'Лимит — 1,8 МБ на трек: браузер хранит музыку в localStorage, а base64 съедает ещё треть',
        'error', { duration: 6200 });
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
    toggleMusicList();

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
    mpTracks = [{ id: 'tr' + Date.now(), name: 'Мой трек', data: old }];
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
  mpPaintAll();

  if (!mpTracks.length) {
    // Пустой плейлист: кнопка есть, окно объясняет, что делать
    toggleMusicDock(false);
    return;
  }

  toggleMusicDock(!state.hidden);

  // Продолжаем трек с той же секунды, что и на прошлой странице
  if (state.playing) {
    mpPlayTrack(mpCurrent, Number(state.time) || 0);
  } else {
    // Трек не играл: только готовим его и возвращаем прошлую секунду
    const audio = mpAudioElement();
    audio.dataset.trackId = mpCurrent;
    audio.src = mpTrack(mpCurrent).data;
    mpResumeTime = Number(state.time) || 0;
    audio.load();
    mpPaintProgress();
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
    if (event.key !== MP_LIST_KEY) return;
    mpLoadTracks();
    mpPaintAll();
  });
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
