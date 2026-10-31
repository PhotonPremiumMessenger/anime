/* ============================================================
   video.js — видео-уроки без YouTube
   Поддерживаются три источника:
     1) локальный файл assets/video/<id>.mp4 (или .webm);
     2) встраивание Rutube / VK (поле embed в данных);
     3) слайд-режим — работает всегда, без интернета и без видео.
   ============================================================ */

'use strict';

const VIDEO_LESSONS = [
  {
    id: 'hiragana',
    title: 'Хирагана за 5 минут',
    level: 'N5',
    duration: '5 мин',
    cover: 'assets/images/lessons/hiragana.jpg',
    embed: '',
    slides: [
      { jp: 'あ い う え お', ru: 'Пять гласных — основа всей таблицы' },
      { jp: 'か き く け こ', ru: 'Ряд «к»: те же гласные с согласной' },
      { jp: 'さ し す せ そ', ru: 'し читается «щи», а не «си»' },
      { jp: 'た ち つ て と', ru: 'ち — «чи», つ — «цу»' },
      { jp: 'な に ぬ ね の', ru: 'Запоминай рядами, а не по одному знаку' },
      { jp: 'は ひ ふ へ ほ', ru: 'ふ — между «фу» и «ху»' },
      { jp: 'ま み む め も', ru: 'Последний «ровный» ряд' },
      { jp: 'や ゆ よ', ru: 'Только три знака' },
      { jp: 'ら り る れ ろ', ru: 'Японская «р» — мягкая, между «р» и «л»' },
      { jp: 'わ を ん', ru: 'を — только частица, ん — единственная согласная' }
    ]
  },
  {
    id: 'katakana',
    title: 'Катакана: заимствования',
    level: 'N5',
    duration: '4 мин',
    cover: 'assets/images/lessons/katakana.jpg',
    embed: '',
    slides: [
      { jp: 'ア イ ウ エ オ', ru: 'Катакана для иностранных слов' },
      { jp: 'コーヒー', ru: 'ко:хи: — кофе. Чёрточка ー удлиняет гласную' },
      { jp: 'アニメ', ru: 'аниме — так и пишется' },
      { jp: 'ゲーム', ru: 'гэ:му — игра' },
      { jp: 'パソコン', ru: 'пасокон — компьютер' },
      { jp: 'コンビニ', ru: 'комбини — магазин у дома' },
      { jp: 'スマホ', ru: 'сумахó — смартфон' },
      { jp: 'カラオケ', ru: 'караоке' }
    ]
  },
  {
    id: 'greetings',
    title: 'Приветствия и вежливость',
    level: 'N5',
    duration: '6 мин',
    cover: 'assets/images/lessons/greetings.jpg',
    embed: '',
    slides: [
      { jp: 'おはようございます', ru: 'Доброе утро (вежливо)' },
      { jp: 'こんにちは', ru: 'Здравствуйте — днём' },
      { jp: 'こんばんは', ru: 'Добрый вечер' },
      { jp: 'ありがとうございます', ru: 'Спасибо (вежливо)' },
      { jp: 'すみません', ru: 'Извините / простите' },
      { jp: 'はじめまして', ru: 'Приятно познакомиться' },
      { jp: 'よろしくお願いします', ru: 'Прошу любить и жаловать' },
      { jp: 'おやすみなさい', ru: 'Спокойной ночи' }
    ]
  },
  {
    id: 'anime-phrases',
    title: 'Фразы из аниме',
    level: 'N4',
    duration: '7 мин',
    cover: 'assets/images/lessons/anime-phrases.jpg',
    embed: '',
    slides: [
      { jp: 'お前はもう死んでいる', ru: 'Ты уже мёртв' },
      { jp: 'だってばよ', ru: 'Ну же! — фирменная фраза Наруто' },
      { jp: '逃げちゃダメだ', ru: 'Нельзя убегать' },
      { jp: '心臓を捧げよ', ru: 'Отдайте свои сердца' },
      { jp: 'やばい', ru: 'И «плохо», и «круто» — зависит от интонации' },
      { jp: 'まじで？', ru: 'Серьёзно?' },
      { jp: '頑張って', ru: 'Держись!' },
      { jp: 'ありがとう', ru: 'Спасибо' }
    ]
  },
  {
    id: 'particles',
    title: 'Частицы は, が, を',
    level: 'N5',
    duration: '6 мин',
    cover: 'assets/images/lessons/particles.jpg',
    embed: '',
    slides: [
      { jp: '私は学生です', ru: 'は — тема предложения' },
      { jp: '猫がいます', ru: 'が — тот, кто есть / действует' },
      { jp: 'アニメを見ます', ru: 'を — объект действия' },
      { jp: '私はアニメが好きです', ru: 'は + が в одном предложении — норма' },
      { jp: 'これ は 何 ですか', ru: 'Вопрос: か в конце' },
      { jp: '日本語 を 勉強します', ru: 'Учу японский: объект + を' }
    ]
  }
];

/* ---------- Состояние ---------- */

const videoState = {
  lesson: null,
  index: 0,
  playing: false,
  timer: null,
  slideTime: 0,
  slideDuration: 4,   // секунд на слайд
  speech: true,
  mode: 'slides',
  elapsed: 0
};

/* ---------- Список видео ---------- */

/** Рисует каталог видео-уроков. */
function renderVideoList() {
  const grid = document.getElementById('videoGrid');
  if (!grid) return;

  grid.innerHTML = '';

  VIDEO_LESSONS.forEach(lesson => {
    const card = document.createElement('article');
    card.className = 'video-card';
    card.innerHTML = `
      <div class="video-cover" style="background-image:url('${lesson.cover}')">
        <span class="video-play">▶</span>
        <span class="video-duration">${lesson.duration}</span>
      </div>
      <div class="video-body">
        <div class="video-top">
          <h3></h3>
          <span class="video-level">${lesson.level}</span>
        </div>
        <p>${lesson.slides.length} слайдов · озвучка · без YouTube</p>
      </div>
    `;

    card.querySelector('h3').textContent = lesson.title;
    card.addEventListener('click', () => openVideo(lesson.id));
    grid.appendChild(card);
  });
}

/* ---------- Плеер ---------- */

/** Открывает видео-урок. */
function openVideo(id) {
  const lesson = VIDEO_LESSONS.find(item => item.id === id);
  if (!lesson) return;

  videoState.lesson = lesson;
  videoState.index = 0;
  videoState.playing = false;
  videoState.slideTime = 0;
  videoState.elapsed = 0;
  videoState.mode = lesson.embed ? 'embed' : 'local-or-slides';

  const list = document.getElementById('videoListSection');
  const player = document.getElementById('videoPlayerSection');

  if (list) list.classList.add('hidden');
  if (player) {
    player.classList.remove('hidden');
    player.innerHTML = buildPlayerMarkup(lesson);
  }

  // Пробуем локальное видео: если файла нет — плеер остаётся в слайд-режиме
  if (!lesson.embed) tryLocalVideo(lesson);

  renderVideoSlide();
  updateVideoControls();

  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', 'video?v=' + lesson.id);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Разметка плеера. */
function buildPlayerMarkup(lesson) {
  return `
    <button class="btn btn-ghost btn-small" onclick="closeVideo()">← Все видео</button>

    <div class="video-player">
      <div class="video-stage" id="videoStage">
        ${lesson.embed
          ? `<iframe class="video-embed" src="${lesson.embed}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen title="${lesson.title}"></iframe>`
          : `<video class="video-native hidden" id="videoNative" controls playsinline preload="none" poster="${lesson.cover}">
               <source src="assets/video/${lesson.id}.mp4" type="video/mp4">
               <source src="assets/video/${lesson.id}.webm" type="video/webm">
             </video>

             <div class="video-slide" id="videoSlide">
               <div class="video-slide-jp" data-ja></div>
               <div class="video-slide-ru"></div>
               <div class="video-slide-note">Слайд-режим: видеофайл не подключён</div>
             </div>

             <button class="video-big-play" id="videoBigPlay" onclick="toggleVideoPlay()" aria-label="Смотреть">▶</button>`
        }
      </div>

      <div class="video-controls">
        <button class="video-btn" id="videoPlayBtn" onclick="toggleVideoPlay()" aria-label="Играть">▶</button>
        <button class="video-btn" onclick="prevVideoSlide()" aria-label="Предыдущий слайд">⏮</button>
        <button class="video-btn" onclick="nextVideoSlide()" aria-label="Следующий слайд">⏭</button>

        <div class="video-progress" id="videoProgress" onclick="seekVideo(event)">
          <span id="videoProgressFill" style="width:0%"></span>
        </div>

        <span class="video-time" id="videoTime">0:00</span>

        <button class="video-btn" id="videoSpeechBtn" onclick="toggleVideoSpeech()" aria-label="Озвучка" title="Озвучка слайдов">🔊</button>
      </div>
    </div>

    <div class="video-meta">
      <h1>${lesson.title}</h1>
      <p>${lesson.level} · ${lesson.duration} · ${lesson.slides.length} слайдов</p>
      <p class="small muted">
        Видео не с YouTube: поддерживаются локальный файл <code>assets/video/${lesson.id}.mp4</code>
        и встраивание Rutube/VK. Пока файла нет, урок идёт в слайд-режиме с озвучкой.
      </p>
    </div>

    <div class="video-transcript" id="videoTranscript"></div>
  `;
}

/**
 * Пытается загрузить локальный видеофайл.
 * Если браузер не смог — остаётся слайд-режим.
 */
function tryLocalVideo(lesson) {
  const video = document.getElementById('videoNative');
  const slide = document.getElementById('videoSlide');
  const bigPlay = document.getElementById('videoBigPlay');

  if (!video) return;

  video.addEventListener('loadedmetadata', () => {
    // Файл нашёлся: показываем настоящее видео
    videoState.mode = 'video';
    video.classList.remove('hidden');
    if (slide) slide.classList.add('hidden');
    if (bigPlay) bigPlay.classList.add('hidden');

    video.addEventListener('timeupdate', () => {
      const percent = video.duration ? (video.currentTime / video.duration) * 100 : 0;
      const fill = document.getElementById('videoProgressFill');
      const time = document.getElementById('videoTime');

      if (fill) fill.style.width = percent + '%';
      if (time) time.textContent = formatVideoTime(video.currentTime);
    });

    video.addEventListener('play', () => {
      videoState.playing = true;
      updateVideoControls();
    });

    video.addEventListener('pause', () => {
      videoState.playing = false;
      updateVideoControls();
    });

    video.addEventListener('ended', () => {
      videoState.playing = false;
      updateVideoControls();
    });
  });

  video.addEventListener('error', () => {
    videoState.mode = 'slides';
  });

  // Запускаем проверку источника
  video.load();
}

/** Рисует текущий слайд. */
function renderVideoSlide() {
  const lesson = videoState.lesson;
  if (!lesson) return;

  const slideEl = document.getElementById('videoSlide');
  const transcript = document.getElementById('videoTranscript');

  if (slideEl) {
    const slide = lesson.slides[videoState.index];
    slideEl.querySelector('.video-slide-jp').textContent = slide.jp;
    slideEl.querySelector('.video-slide-ru').textContent = slide.ru;
  }

  if (transcript) {
    transcript.innerHTML = `
      <h4>Текст урока</h4>
      <div class="video-transcript-list">
        ${lesson.slides.map((slide, index) => `
          <div class="video-transcript-row ${index === videoState.index ? 'is-current' : ''}"
               onclick="jumpVideoSlide(${index})">
            <span class="video-transcript-num">${index + 1}</span>
            <div>
              <b>${slide.jp}</b>
              <span>${slide.ru}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  const speechBtn = document.getElementById('videoSpeechBtn');
  if (speechBtn) speechBtn.textContent = videoState.speech ? '🔊' : '🔇';

  updateVideoControls();
}

/** Обновляет прогресс и кнопку play. */
function updateVideoControls() {
  const playBtn = document.getElementById('videoPlayBtn');
  const progressFill = document.getElementById('videoProgressFill');
  const timeEl = document.getElementById('videoTime');
  const lesson = videoState.lesson;

  if (!lesson) return;

  if (playBtn) playBtn.textContent = videoState.playing ? '⏸' : '▶';

  const total = lesson.slides.length;
  const percent = total ? ((videoState.index + (videoState.playing ? videoState.slideTime / videoState.slideDuration : 0)) / total) * 100 : 0;

  if (progressFill) progressFill.style.width = Math.min(100, percent) + '%';
  if (timeEl) timeEl.textContent = (videoState.index + 1) + '/' + total;
}

/** Плей / пауза. */
function toggleVideoPlay() {
  if (!videoState.lesson) return;

  if (videoState.mode === 'video') {
    const video = document.getElementById('videoNative');
    if (!video) return;

    if (video.paused) video.play();
    else video.pause();
    return;
  }

  if (videoState.mode === 'embed') return;

  videoState.playing = !videoState.playing;

  if (videoState.playing) {
    speakCurrentSlide();
    startVideoTimer();
  } else {
    stopVideoTimer();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  updateVideoControls();
}

/** Запускает таймер слайдов. */
function startVideoTimer() {
  stopVideoTimer();

  videoState.timer = setInterval(() => {
    videoState.slideTime += 0.25;

    if (videoState.slideTime >= videoState.slideDuration) {
      videoState.slideTime = 0;
      nextVideoSlide(true);
      return;
    }

    updateVideoControls();
  }, 250);
}

/** Останавливает таймер. */
function stopVideoTimer() {
  if (videoState.timer) clearInterval(videoState.timer);
  videoState.timer = null;
}

/** Следующий слайд. */
function nextVideoSlide(fromTimer) {
  if (!videoState.lesson) return;

  const total = videoState.lesson.slides.length;

  if (videoState.index + 1 >= total) {
    stopVideoTimer();
    videoState.playing = false;
    videoState.index = total - 1;
    updateVideoControls();
    if (typeof showToast === 'function') showToast('Урок закончен', 'Слайды просмотрены до конца', 'success');
    return;
  }

  videoState.index += 1;
  videoState.slideTime = 0;

  if (!fromTimer) {
    speakCurrentSlide();
  } else {
    speakCurrentSlide();
  }

  renderVideoSlide();
}

/** Предыдущий слайд. */
function prevVideoSlide() {
  if (!videoState.lesson) return;
  if (videoState.index === 0) return;

  videoState.index -= 1;
  videoState.slideTime = 0;
  renderVideoSlide();
  speakCurrentSlide();
}

/** Переход к слайду по клику в тексте. */
function jumpVideoSlide(index) {
  if (!videoState.lesson) return;

  videoState.index = Math.max(0, Math.min(videoState.lesson.slides.length - 1, Number(index) || 0));
  videoState.slideTime = 0;
  renderVideoSlide();
  speakCurrentSlide();
}

/** Озвучка текущего слайда. */
function speakCurrentSlide() {
  if (!videoState.speech || !videoState.lesson) return;

  const slide = videoState.lesson.slides[videoState.index];
  if (slide && typeof speakJapanese === 'function') speakJapanese(slide.jp);
}

/** Включает и выключает озвучку. */
function toggleVideoSpeech() {
  videoState.speech = !videoState.speech;

  if (!videoState.speech && window.speechSynthesis) window.speechSynthesis.cancel();

  const speechBtn = document.getElementById('videoSpeechBtn');
  if (speechBtn) speechBtn.textContent = videoState.speech ? '🔊' : '🔇';
}

/** Перемотка кликом по полосе. */
function seekVideo(event) {
  if (!videoState.lesson || videoState.mode !== 'slides') return;

  const bar = document.getElementById('videoProgress');
  if (!bar) return;

  const rect = bar.getBoundingClientRect();
  const percent = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const total = videoState.lesson.slides.length;

  videoState.index = Math.min(total - 1, Math.floor(percent * total));
  videoState.slideTime = 0;
  renderVideoSlide();
}

/** Форматирует секунды в «м:сс». */
function formatVideoTime(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safe / 60);
  const rest = String(safe % 60).padStart(2, '0');
  return minutes + ':' + rest;
}

/** Закрывает плеер и возвращает каталог. */
function closeVideo() {
  stopVideoTimer();
  if (window.speechSynthesis) window.speechSynthesis.cancel();

  videoState.lesson = null;
  videoState.playing = false;

  const list = document.getElementById('videoListSection');
  const player = document.getElementById('videoPlayerSection');

  if (player) {
    player.classList.add('hidden');
    player.innerHTML = '';
  }
  if (list) list.classList.remove('hidden');

  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', 'video');
  }
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('videoGrid')) return;

  renderVideoList();

  const params = new URLSearchParams(window.location.search);
  const id = params.get('v');

  if (id) openVideo(id);
});

/* Экспорт в глобальную область */
window.VIDEO_LESSONS = VIDEO_LESSONS;
window.renderVideoList = renderVideoList;
window.openVideo = openVideo;
window.closeVideo = closeVideo;
window.toggleVideoPlay = toggleVideoPlay;
window.nextVideoSlide = nextVideoSlide;
window.prevVideoSlide = prevVideoSlide;
window.jumpVideoSlide = jumpVideoSlide;
window.toggleVideoSpeech = toggleVideoSpeech;
window.seekVideo = seekVideo;
