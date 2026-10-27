/* ============================================================
   settings.js — страница настроек
   SETTINGS_CONTENT хранит разметку каждой вкладки,
   showSettingsTab() отрисовывает её в правой части.
   ============================================================ */

'use strict';

/* ---------- Ключи localStorage ---------- */
const SETTINGS_KEY = 'settings';
const NICK_CHANGED_KEY = 'nickChangedAt';
const NICK_COOLDOWN_DAYS = 30;

/* ---------- Вспомогательные функции хранения ---------- */

/** Возвращает все сохранённые настройки объектом. */
function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {};
  } catch (e) {
    return {};
  }
}

/** Сохраняет одну настройку по ключу вида 'sound.volume'. */
function setSettingValue(key, value) {
  const settings = getSettings();
  settings[key] = value;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** Читает настройку, если её нет — возвращает fallback. */
function getSettingValue(key, fallback) {
  const settings = getSettings();
  return Object.prototype.hasOwnProperty.call(settings, key) ? settings[key] : fallback;
}

/* ---------- Разметка вкладок ---------- */

/**
 * Контент для каждой вкладки.
 * Каждая запись: { title, description, html }.
 * В html используются [data-setting] — их значения собирает saveSetting().
 */
const SETTINGS_CONTENT = {
  /* ---------- Аккаунт ---------- */
  account: {
    title: 'Аккаунт',
    description: 'Пароль, почта, ник и привязка аккаунтов. Изменения применяются сразу.',
    html: `
      <div class="settings-group">
        <h4>Смена пароля</h4>
        <div class="form-grid">
          <div class="field full">
            <label for="oldPassword">Текущий пароль</label>
            <input class="input" type="password" id="oldPassword" placeholder="Введите старый пароль" autocomplete="current-password">
          </div>
          <div class="field">
            <label for="newPassword">Новый пароль</label>
            <input class="input" type="password" id="newPassword" placeholder="Минимум 8 символов" autocomplete="new-password">
          </div>
          <div class="field">
            <label for="repeatPassword">Повторите пароль</label>
            <input class="input" type="password" id="repeatPassword" placeholder="Ещё раз новый пароль" autocomplete="new-password">
          </div>
        </div>
        <button class="btn btn-primary btn-small" onclick="changePassword()">Сохранить пароль</button>

      <div class="settings-group">
        <h4>Перенос прогресса</h4>
        <p class="custom-hint">Один файл со всем: опыт, уроки, слова, достижения, покупки, друзья и оформление.
           Пригодится при смене браузера или компьютера.</p>

        <div class="backup-actions">
          <button class="btn btn-primary btn-small" onclick="exportProgress()">Скачать прогресс</button>
          <label class="btn btn-outline btn-small file-btn">
            Загрузить прогресс
            <input type="file" accept="application/json,.json" onchange="importProgressFile(this)" hidden>
          </label>
        </div>

        <p class="muted small" id="backupInfo"></p>

        <button class="btn btn-ghost btn-small backup-danger" onclick="resetProgress()">Сбросить всё</button>
      </div>
      </div>

      <div class="settings-group">
        <h4>Смена почты</h4>
        <div class="notice">
          <span class="notice-icon">✉</span>
          <span>Код из 10 символов подтверждает новую почту. В демо-режиме письмо не отправляется — код покажется в уведомлении.</span>
        </div>
        <div class="form-grid">
          <div class="field full">
            <label for="newEmail">Новая почта</label>
            <input class="input" type="email" id="newEmail" placeholder="new@mail.ru" autocomplete="email">
          </div>
        </div>
        <button class="btn btn-outline btn-small" id="emailRequestBtn" onclick="changeEmailRequest()">Отправить код</button>

        <div class="form-grid mt-16 hidden" id="emailConfirmBlock">
          <div class="field full">
            <label for="emailCode">Код из письма</label>
            <input class="input code-input" type="text" id="emailCode" maxlength="10" placeholder="XXXXXXXXXX" autocomplete="one-time-code">
            <div class="field-hint">10 символов, буквы автоматически станут заглавными</div>
          </div>
        </div>
        <button class="btn btn-primary btn-small mt-16 hidden" id="emailConfirmBtn" onclick="changeEmailConfirm()">Подтвердить почту</button>
      </div>

      <div class="settings-group">
        <h4>Смена ника</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Ник в профиле</div>
            <div class="setting-desc">Сейчас: <b id="currentNickname">—</b>. Менять ник можно раз в 30 дней.</div>
          </div>
          <div class="setting-control">
            <span class="status-pill" id="nickCooldownPill">доступно</span>
          </div>
        </div>
        <div class="form-grid">
          <div class="field full">
            <label for="newNickname">Новый ник</label>
            <input class="input" type="text" id="newNickname" maxlength="20" placeholder="3–20 символов">
            <div class="field-hint">Буквы, цифры, дефис и подчёркивание. Без пробелов.</div>
          </div>
        </div>
        <button class="btn btn-primary btn-small" id="nicknameBtn" onclick="changeNickname()">Сменить ник</button>
      </div>

      <div class="settings-group">
        <h4>Привязка аккаунтов</h4>
        <div class="link-row">
          <div class="link-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.3 5.6A16 16 0 0 0 15.2 4.3l-.3.6a12 12 0 0 1 3.4 1.4 11.6 11.6 0 0 0-9.9-.3l.3-.5c-.6.1-2.8.7-4.3 1.7C2.5 9.9 2 13.4 2.2 16.6a16 16 0 0 0 4.6 2.3l.6-1a13 13 0 0 1-2-1l.5-.4a11.5 11.5 0 0 0 10.2 0l.5.4a13 13 0 0 1-2 1l.6 1a16 16 0 0 0 4.6-2.3c.3-3.6-.5-7-1.5-10.4ZM9 14.4c-.9 0-1.6-.8-1.6-1.8S8.1 10.8 9 10.8s1.7.8 1.6 1.8c0 1-.7 1.8-1.6 1.8Zm6 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.7.8 1.6 1.8c0 1-.7 1.8-1.6 1.8Z"/></svg></div>
          <div class="link-info">
            <b>Discord</b>
            <span>Синхронизация ролей и статуса на сервере Nihongo</span>
          </div>
          <span class="status-pill" id="linkDiscordPill">не привязан</span>
          <button class="btn btn-outline btn-small" id="linkDiscordBtn" onclick="connectSocial('discord')">Привязать</button>
        </div>
        <div class="link-row">
          <div class="link-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M21 4 3 11l5.5 2L11 20l3-4.5 5 2.5L21 4Z"/><path d="m8.5 13 8-6"/></svg></div>
          <div class="link-info">
            <b>Telegram</b>
            <span>Уведомления о новых уроках и напоминания</span>
          </div>
          <span class="status-pill" id="linkTelegramPill">не привязан</span>
          <button class="btn btn-outline btn-small" id="linkTelegramBtn" onclick="connectSocial('telegram')">Привязать</button>
        </div>
      </div>

      <div class="settings-group">
        <h4>Безопасность и данные</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Двухфакторная аутентификация</div>
            <div class="setting-desc">Переключатель сохраняется. Реальная проверка кода требует сервера — появится вместе с ним</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="account.2fa" onchange="toggleSecurity(this, 'Двухфакторная аутентификация')">
              <span class="track"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Скачать мои данные</div>
            <div class="setting-desc">Файл со всей информацией аккаунта в формате JSON</div>
          </div>
          <div class="setting-control">
            <button class="btn btn-ghost btn-small" onclick="downloadMyData()">Скачать</button>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name" style="color:#F87171">Удалить аккаунт</div>
            <div class="setting-desc">Безвозвратно: прогресс, достижения и друзья будут потеряны</div>
          </div>
          <div class="setting-control">
            <button class="btn btn-danger-outline btn-small" onclick="deleteAccount()">Удалить</button>
          </div>
        </div>
      </div>
    `
  },

  /* ---------- Звук ---------- */
  sound: {
    title: 'Звук',
    description: 'Громкость и звуки интерфейса. Всё слышно сразу — жать «Сохранить» не нужно.',
    html: `
      <div class="settings-group">
        <h4>Проверка</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Проверить звук</div>
            <div class="setting-desc">Короткая гамма с текущей громкостью</div>
          </div>
          <div class="setting-control">
            <button class="btn btn-outline btn-small" onclick="testSound()">Прослушать</button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <h4>Общая громкость</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Громкость</div>
            <div class="setting-desc">Применяется ко всем звукам сайта</div>
          </div>
          <div class="setting-control">
            <div class="range-row" style="width:260px">
              <input class="range" type="range" min="0" max="100" value="70"
                     data-setting="sound.volume" oninput="updateRangeValue(this)">
              <span class="range-value">70%</span>
            </div>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Фоновая музыка</div>
            <div class="setting-desc">Спокойный лоу-фай во время уроков</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="sound.music">
              <span class="track"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Голос озвучки</div>
            <div class="setting-desc">Выбор голоса, скорость и тон для японских слов</div>
          </div>
        </div>
        <div class="voice-picker-wrap" id="voicePicker"></div>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Ромадзи под японским</div>
            <div class="setting-desc">Показывать латинскую транскрипцию под словами и фразами</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" checked onchange="setRomajiOn(this.checked)">
              <span class="track"></span>
            </label>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Громкость музыки</div>
            <div class="setting-desc">Отдельный уровень для фоновой музыки</div>
          </div>
          <div class="setting-control">
            <div class="range-row" style="width:260px">
              <input class="range" type="range" min="0" max="100" value="40"
                     data-setting="sound.musicVolume" oninput="updateRangeValue(this)">
              <span class="range-value">40%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <h4>Своя музыка</h4>
        <p class="settings-note">Плейлист до 8 треков по 1,8 МБ. Файлы живут только в этом браузере, а плеер в правом нижнем углу играет их на всех страницах.</p>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Плейлист</div>
            <div class="setting-desc" id="customMusicState">Плейлист пуст — добавь первый трек</div>
          </div>
          <div class="setting-control">
            <div class="btn-row">
              <label class="btn btn-outline btn-small file-btn">
                Добавить трек
                <input type="file" accept="audio/*" onchange="pickCustomMusic(this)" hidden>
              </label>
              <button class="btn btn-ghost btn-small" type="button" onclick="playCustomMusic()">Играть</button>
              <button class="btn btn-ghost btn-small" type="button" onclick="stopCustomMusic()">Пауза</button>
              <button class="btn btn-ghost btn-small" type="button" onclick="toggleMusicDock(true)">Плеер</button>
            </div>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Управление</div>
            <div class="setting-desc">Пауза, перемотка, следующий трек, громкость и сворачивание — всё в окошке плеера</div>
          </div>
          <div class="setting-control">
            <button class="btn btn-ghost btn-small" type="button" onclick="clearCustomMusic()">Убрать текущий</button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <h4>Эффекты</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Звуки кнопок</div>
            <div class="setting-desc">Короткий щелчок при нажатии</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="sound.buttons" checked>
              <span class="track"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Звук уведомлений</div>
            <div class="setting-desc">Toast-уведомления и достижения</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="sound.notifications" checked>
              <span class="track"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Звук перевода</div>
            <div class="setting-desc">Мягкий сигнал при появлении перевода фразы</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="sound.translate" checked>
              <span class="track"></span>
            </label>
          </div>
        </div>
      </div>
    `,
    saveLabel: 'Сохранить звук'
  },

  /* ---------- Интерфейс ---------- */
  interface: {
    title: 'Интерфейс',
    description: 'Внешний вид сайта: язык, тема, фон и размер шрифта.',
    html: `
      <div class="settings-group">
        <h4>Тема по времени суток</h4>
        <div id="autoThemeSwitch"></div>
      </div>

      <div class="settings-group">
        <h4>Основное</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Язык интерфейса</div>
            <div class="setting-desc">Переводит меню, подвал и основные кнопки. Уроки остаются на русском</div>
          </div>
          <div class="setting-control">
            <select class="select" data-setting="interface.language">
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Светлая тема</div>
            <div class="setting-desc">Дневное оформление вместо тёмного</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" id="lightThemeSwitch" onchange="toggleLightTheme(this)">
              <span class="track"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Тема оформления</div>
            <div class="setting-desc">Стандарт — оранжевая, Сакура — розовая, Светлая — дневная</div>
          </div>
          <div class="setting-control">
            <select class="select" data-setting="interface.theme" onchange="applyInterfaceSetting('theme', this.value)">
              <option value="default">Стандарт</option>
              <option value="sakura">Сакура</option>
              <option value="light">Светлая</option>
            </select>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Фон</div>
            <div class="setting-desc">Изображение за контентом сайта</div>
          </div>
          <div class="setting-control">
            <select class="select" data-setting="interface.background" onchange="applyInterfaceSetting('background', this.value)">
              <option value="city">Ночной город</option>
              <option value="torii">Тории</option>
              <option value="plain">Без изображения</option>
            </select>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <h4>Учёба</h4>
        <p class="settings-note">Сколько времени в день готов заниматься. От темпа зависит объём карточек в уроке.</p>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Темп учёбы</div>
            <div class="setting-desc">От 5 до 30 минут в день. Карточек на урок: темп / 5</div>
          </div>
          <div class="setting-control">
            <div class="range-row" style="width:260px">
              <input class="range" type="range" min="5" max="30" step="5" value="15" id="studyPaceRange"
                     data-setting="study.pace"
                     oninput="updatePaceValue(this.value)"
                     onchange="setStudyPace(this.value)"
                     aria-label="Темп учёбы в минутах">
              <span class="range-value" id="studyPaceValue">15 мин</span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <h4>Курсор</h4>
        <p class="settings-note">Обычный, акцентный или один из семи аниме. Свой курсор — позже.</p>

        <div class="cursor-grid" id="cursorGrid"></div>

        <div class="custom-actions">
          <button class="btn btn-outline btn-small" type="button" onclick="uploadCustomCursor()">Загрузить свой курсор</button>
          <span class="custom-hint">пока заглушка</span>
        </div>
      </div>

      <div class="settings-group">
        <h4>Цвет сайта</h4>
        <p class="settings-note">Палитра, свой оттенок или радуга — акцент меняется на всём сайте сразу.</p>

        <div class="accent-panel">
          <div class="accent-grid" id="accentGrid"></div>

          <div class="accent-extra">
            <label class="accent-pick" title="Свой цвет">
              <input class="accent-color-input" type="color" id="accentColorInput" value="#ffb347"
                     oninput="setAccentCustom(this.value)" aria-label="Свой цвет акцента">
              <span>Свой</span>
            </label>

            <label class="accent-pill" title="Радужный режим">
              <span>Радуга</span>
              <span class="switch switch-mini">
                <input type="checkbox" id="rainbowSwitch" onchange="toggleRainbowAccent(this)">
                <span class="track"></span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <h4>Свой фон</h4>
        <p class="settings-note">Картинка хранится в этом браузере (localStorage) и никуда не отправляется.</p>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Картинка фона</div>
            <div class="setting-desc" id="customBgState">Сейчас стандартный фон сайта</div>
          </div>
          <div class="setting-control">
            <div class="btn-row">
              <label class="btn btn-outline btn-small file-btn">
                Загрузить
                <input type="file" accept="image/*" onchange="pickCustomBackground(this)" hidden>
              </label>
              <button class="btn btn-ghost btn-small" type="button" onclick="clearCustomBackground()">Убрать</button>
            </div>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Затемнение фона</div>
            <div class="setting-desc">Чтобы текст читался на любой картинке</div>
          </div>
          <div class="setting-control">
            <div class="range-row" style="width:200px">
              <input class="range" type="range" min="0" max="90" step="5" value="35" id="bgDimRange"
                     oninput="setBackgroundDim(this.value)">
              <span class="range-value" id="bgDimValue">35%</span>
            </div>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Размытие фона</div>
            <div class="setting-desc">0 — картинка чёткая, 20 px — мягкое свечение</div>
          </div>
          <div class="setting-control">
            <div class="range-row" style="width:200px">
              <input class="range" type="range" min="0" max="20" step="1" value="0" id="bgBlurRange"
                     oninput="setBackgroundBlur(this.value)">
              <span class="range-value" id="bgBlurValue">0px</span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <h4>Помощь</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Пройти тур заново</div>
            <div class="setting-desc">Пять шагов с подсветкой: меню, дизайн, каталог и подвал</div>
          </div>
          <div class="setting-control">
            <button class="btn btn-outline btn-small" onclick="restartTour()">Запустить</button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <h4>Читаемость</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Размер шрифта</div>
            <div class="setting-desc">Базовый размер текста на страницах</div>
          </div>
          <div class="setting-control">
            <div class="range-row" style="width:260px">
              <input class="range" type="range" min="13" max="19" step="1" value="15"
                     data-setting="interface.fontSize"
                     oninput="updateRangeValue(this, 'px')" onchange="applyInterfaceSetting('fontSize', this.value)">
              <span class="range-value">15px</span>
            </div>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Анимации</div>
            <div class="setting-desc">Плавные переходы, свечения и появление блоков</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="interface.animations" checked
                     onchange="applyInterfaceSetting('animations', this.checked)">
              <span class="track"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Компактный режим</div>
            <div class="setting-desc">Меньше отступов — больше контента на экране</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="interface.compact"
                     onchange="applyInterfaceSetting('compact', this.checked)">
              <span class="track"></span>
            </label>
          </div>
        </div>
      </div>
    `,
    saveLabel: 'Сохранить интерфейс'
  },

  /* ---------- Уведомления ---------- */
  level: {
    title: 'Уровень японского',
    description: 'Выбери цель по JLPT — уроки, тесты, словарь и аниме подстроятся под неё.',
    html: `
      <div class="settings-group">
        <h4>Мой уровень</h4>
        <div class="jlpt-switcher" data-jlpt-switcher style="margin-bottom:6px"></div>
        <p class="custom-hint">Сейчас выбран: <b data-jlpt-label>Все уровни</b>. Настройка сохраняется в аккаунте и в этом браузере.</p>
      </div>

      <div class="settings-group">
        <h4>Прогресс по уровням</h4>
        <div class="jlpt-progress" id="jlptProgress"></div>
      </div>

      <div class="settings-group">
        <h4>Что фильтруется</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Уроки и тесты</div>
            <div class="setting-desc">Показываются только задания выбранного уровня</div>
          </div>
          <div class="setting-control"><span class="small muted">автоматически</span></div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Словарь и аниме</div>
            <div class="setting-desc">Список сокращается до слов и тайтлов уровня</div>
          </div>
          <div class="setting-control"><span class="small muted">автоматически</span></div>
        </div>
      </div>
    `
  },

  notifications: {
    title: 'Уведомления',
    description: 'Что и когда присылать. Фильтр работает сразу и на уведомления в колокольчике, и на всплывашки.',
    html: `
      <div class="settings-group">
        <h4>События</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Новые уроки</div>
            <div class="setting-desc">Когда открывается новый разбор фраз</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="notify.lessons" checked>
              <span class="track"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Новые аниме</div>
            <div class="setting-desc">Каталог обновился — стоит заглянуть</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="notify.anime" checked>
              <span class="track"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Друзья</div>
            <div class="setting-desc">Заявки в друзья и сообщения</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="notify.friends" checked>
              <span class="track"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Достижения</div>
            <div class="setting-desc">Новые ачивки и уровни</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="notify.achievements" checked>
              <span class="track"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <h4>Напоминания</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Дейли-напоминание</div>
            <div class="setting-desc">Мягкий пинг, если сегодня не было практики</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="notify.daily" checked>
              <span class="track"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Время напоминания</div>
            <div class="setting-desc">Когда присылать дейли-пинг</div>
          </div>
          <div class="setting-control">
            <select class="select" data-setting="notify.dailyTime">
              <option value="09:00">09:00</option>
              <option value="12:00">12:00</option>
              <option value="18:00" selected>18:00</option>
              <option value="21:00">21:00</option>
            </select>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Email-рассылка</div>
            <div class="setting-desc">Дайджест новых разборов раз в неделю</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="notify.email">
              <span class="track"></span>
            </label>
          </div>
        </div>
      </div>
    `,
    saveLabel: 'Сохранить уведомления'
  },

  /* ---------- Лаунчер ---------- */
  launcher: {
    title: 'Лаунчер',
    description: 'Публичный профиль работает уже сейчас. Прокси и DNS — только для будущего десктоп-клиента.',
    html: `
      <div class="notice">
        <span class="notice-icon">⚙</span>
        <span>Прокси и DNS без отдельного приложения не применить — браузер этого не разрешает.
          Значения сохраняются и подхватятся в десктоп-клиенте.</span>
      </div>
      <div class="settings-group">
        <h4>Профиль</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Публичный профиль</div>
            <div class="setting-desc">Ссылка profile.html?user=ник открывает твой профиль. Выключишь — увидишь «профиль закрыт»</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="launcher.publicProfile" checked>
              <span class="track"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <h4>Сеть</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Прокси</div>
            <div class="setting-desc">Адрес прокси-сервера, если провайдер блокирует запросы</div>
          </div>
          <div class="setting-control">
            <input class="input" type="text" placeholder="http://127.0.0.1:1080" data-setting="launcher.proxy">
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">DNS</div>
            <div class="setting-desc">Сервер имён для подключения к урокам</div>
          </div>
          <div class="setting-control">
            <select class="select" data-setting="launcher.dns">
              <option value="auto">Автоматически</option>
              <option value="google">Google (8.8.8.8)</option>
              <option value="cloudflare">Cloudflare (1.1.1.1)</option>
              <option value="custom">Свой</option>
            </select>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Проверка соединения</div>
            <div class="setting-desc">Пинг до сервера Nihongo</div>
          </div>
          <div class="setting-control">
            <button class="btn btn-ghost btn-small" onclick="checkConnection()">Проверить</button>
          </div>
        </div>
      </div>
    `,
    saveLabel: 'Сохранить лаунчер'
  },

  /* ---------- Фишки ---------- */
  features: {
    title: 'Фишки',
    description: 'Перевод, транскрипция, пасхалки и оформление аватара.',
    html: `
      <div class="settings-group">
        <h4>Перевод</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Стиль перевода</div>
            <div class="setting-desc">Как показывать перевод при выделении текста</div>
          </div>
          <div class="setting-control">
            <select class="select" data-setting="features.translateStyle">
              <option value="popup">Попап рядом с текстом</option>
              <option value="panel">Панель справа</option>
              <option value="inline">Под строкой</option>
            </select>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Транскрипция</div>
            <div class="setting-desc">Ромадзи и подсказки по чтению</div>
          </div>
          <div class="setting-control">
            <select class="select" data-setting="features.transcription">
              <option value="romaji">Ромадзи</option>
              <option value="kana">Кана (фуригана)</option>
              <option value="off">Не показывать</option>
            </select>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <h4>Атмосфера</h4>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Пасхалки</div>
            <div class="setting-desc">Секретные фразы и отсылки на страницах</div>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" data-setting="features.easterEggs" checked>
              <span class="track"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Уровень сакуры</div>
            <div class="setting-desc">Сколько лепестков падает на странице</div>
          </div>
          <div class="setting-control">
            <div class="range-row" style="width:260px">
              <input class="range" type="range" min="0" max="100" step="5" value="40"
                     data-setting="features.sakuraLevel"
                     oninput="updateRangeValue(this, '%')" onchange="applyInterfaceSetting('sakura', this.value)">
              <span class="range-value">40%</span>
            </div>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-name">Стиль аватара</div>
            <div class="setting-desc">Форма рамки в профиле</div>
          </div>
          <div class="setting-control">
            <select class="select" data-setting="features.avatarStyle" onchange="applyInterfaceSetting('avatarStyle', this.value)">
              <option value="circle">Круглый</option>
              <option value="rounded">Скруглённый</option>
              <option value="square">Квадратный</option>
            </select>
          </div>
        </div>
      </div>
    `,
    saveLabel: 'Сохранить фишки'
  }
};

/* ---------- Отрисовка вкладки ---------- */

/**
 * Показывает нужную вкладку настроек.
 *
 * @param {string} tabId — ключ из SETTINGS_CONTENT
 * @param {HTMLElement} buttonElement — нажатая кнопка меню
 */
function showSettingsTab(tabId, buttonElement) {
  const content = SETTINGS_CONTENT[tabId];
  const container = document.getElementById('settingsContent');
  if (!content || !container) return;

  // Подсвечиваем активный пункт меню
  document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
  if (buttonElement) {
    buttonElement.classList.add('active');
  } else {
    const item = document.querySelector('.menu-item[data-tab="' + tabId + '"]');
    if (item) item.classList.add('active');
  }

  // Кнопка сохранения нужна только вкладкам-заглушкам
  const saveButton = content.saveLabel
    ? `<button class="btn btn-primary btn-small" onclick="saveSetting('${tabId}')">${content.saveLabel}</button>`
    : '';

  container.innerHTML = `
    <div class="settings-head">
      <div>
        <h2>${content.title}</h2>
        <p>${content.description}</p>
      </div>
      ${saveButton}
    </div>
    <div class="settings-body">${content.html}</div>
  `;

  // Запоминаем открытую вкладку, чтобы вернуться к ней после перезагрузки
  localStorage.setItem('settingsTab', tabId);
  // Меняем только хэш — так безопасно даже при открытии через file://
  history.replaceState(null, '', '#' + tabId);

  restoreSettingsValues(container);
  bindLiveSettings(container);
  bindSettingsTab(tabId);

  // Дополнительные виджеты, которым нужен готовый DOM
  if (typeof renderCustomizationState === 'function') renderCustomizationState();
  if (typeof refreshPlayerLabels === 'function') refreshPlayerLabels();
  if (typeof renderVoicePicker === 'function') renderVoicePicker();
  if (typeof renderJLPTSwitchers === 'function') renderJLPTSwitchers();
  if (typeof renderAutoThemeSwitch === 'function') renderAutoThemeSwitch();
  if (typeof renderJLPTProgress === 'function') renderJLPTProgress();

  const romajiSwitch = container.querySelector('input[onchange="setRomajiOn(this.checked)"]');
  if (romajiSwitch && typeof isRomajiOn === 'function') romajiSwitch.checked = isRomajiOn();
}

/**
 * Рисует сетку курсоров: обычный, акцентный и семь аниме.
 */
function renderCursorGrid() {
  const grid = document.getElementById('cursorGrid');
  if (!grid) return;

  const cursors = [{ id: 'default', name: 'Обычный' }, { id: 'accent', name: 'Акцентный' }]
    .concat((window.ANIME_CURSORS || []).map(item => ({ id: item.id, name: item.name })));

  const saved = typeof prefValue === 'function'
    ? String(prefValue('interface.cursor', 'default'))
    : 'default';

  const anime = window.ANIME_CURSORS || [];

  grid.innerHTML = cursors.map(item => {
    // У аниме-курсоров превью — та же картинка, что и сам курсор
    const found = anime.find(entry => entry.id === item.id);
    const urlMatch = found ? /url\("?([^")]+)"?\)/.exec(found.css) : null;
    const style = urlMatch ? ` style="--cursor-thumb:url('${urlMatch[1]}')"` : '';

    return `
    <button class="cursor-card${item.id === saved ? ' is-active' : ''}" type="button"
            data-cursor-id="${item.id}" onclick="applyCursorSetting('${item.id}')"
            title="${item.name}" aria-label="Курсор: ${item.name}">
      <span class="cursor-preview cursor-preview-${item.id}"${style}></span>
      <span class="cursor-name">${item.name}</span>
    </button>
  `;
  }).join('');
}

/** Рисует палитру акцентов. */
function renderAccentGrid() {
  const grid = document.getElementById('accentGrid');
  if (!grid) return;

  const presets = window.ACCENT_PRESETS || [];

  grid.innerHTML = presets.map(item => `
    <button class="accent-swatch" type="button" data-accent-id="${item.id}"
            data-accent-hue="${item.hue}" style="--swatch-hue:${item.hue}"
            onclick="setAccentPreset('${item.id}', ${item.hue})"
            title="${item.name}" aria-label="Цвет: ${item.name}">
      <span class="accent-check" aria-hidden="true">✓</span>
    </button>
  `).join('');
}

/** Ставит ползунки фона на сохранённые значения. */
function syncBackgroundControls() {
  const dim = Number(localStorage.getItem('nihongo_bg_dim') || 35);
  const blur = Number(localStorage.getItem('nihongo_bg_blur') || 0);

  const dimRange = document.getElementById('bgDimRange');
  const blurRange = document.getElementById('bgBlurRange');

  if (dimRange) dimRange.value = String(Number.isFinite(dim) ? dim : 35);
  if (blurRange) blurRange.value = String(Number.isFinite(blur) ? blur : 0);

  if (typeof updateCustomLabels === 'function') updateCustomLabels();
}

/** Подставляет сохранённые значения в поля активной вкладки. */
function restoreSettingsValues(container) {
  const settings = getSettings();

  container.querySelectorAll('[data-setting]').forEach(input => {
    const key = input.dataset.setting;
    if (!Object.prototype.hasOwnProperty.call(settings, key)) return;

    if (input.type === 'checkbox') {
      input.checked = Boolean(settings[key]);
    } else {
      input.value = settings[key];
    }

    // Синхронизируем подпись у слайдера
    if (input.type === 'range') {
      const valueEl = input.closest('.range-row').querySelector('.range-value');
      if (valueEl) {
        const unit = input.dataset.setting === 'interface.fontSize' ? 'px' : '%';
        valueEl.textContent = input.value + unit;
      }
    }
  });

  // Специальные блоки вкладки «Аккаунт»
  if (container.querySelector('#currentNickname')) {
    fillAccountInfo();
    refreshSocialRows();
  }

  // Подписи кастомных списков берут значения из localStorage
  if (typeof syncCustomSelects === 'function') syncCustomSelects(container);
}

/**
 * Живое применение: любое изменение поля сразу пишется в localStorage
 * и применяется к странице, без кнопки «Сохранить».
 */
function bindLiveSettings(container) {
  if (container.dataset.liveBound === '1') return;
  container.dataset.liveBound = '1';

  container.addEventListener('change', event => {
    const input = event.target.closest('[data-setting]');
    if (!input) return;

    const key = input.dataset.setting;
    const value = input.type === 'checkbox' ? input.checked : input.value;

    setSettingValue(key, value);

    if (typeof applyStoredSettings === 'function') applyStoredSettings();
    if (typeof applyAllPreferences === 'function') applyAllPreferences();
  });
}

/** Дополнительные обработчики конкретной вкладки. */
function bindSettingsTab(tabId) {
  // В разделе «Интерфейс» отражаем текущую тему в переключателе
  if (tabId === 'interface') {
    const lightSwitch = document.getElementById('lightThemeSwitch');
    if (lightSwitch) lightSwitch.checked = document.body.classList.contains('theme-light');

    renderCursorGrid();
    renderAccentGrid();
    syncBackgroundControls();
    syncStudyPaceControl();

    if (typeof renderCustomizationState === 'function') renderCustomizationState();
    return;
  }

  if (tabId !== 'account') return;

  // Код подтверждения почты — автоматически в верхний регистр
  const emailCode = document.getElementById('emailCode');
  if (emailCode) {
    emailCode.addEventListener('input', () => {
      emailCode.value = emailCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    });
  }

  // Enter отправляет форму смены пароля
  ['oldPassword', 'newPassword', 'repeatPassword'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('keydown', e => {
      if (e.key === 'Enter') changePassword();
    });
  });
}

/** Заполняет ник и срок блокировки смены ника. */
function fillAccountInfo() {
  const user = getCurrentUser();
  const nickname = user ? user.username : 'Игрок';
  const nickEl = document.getElementById('currentNickname');
  if (nickEl) nickEl.textContent = nickname;

  const pill = document.getElementById('nickCooldownPill');
  const button = document.getElementById('nicknameBtn');
  const daysLeft = nicknameCooldownDays();

  if (pill) {
    pill.textContent = daysLeft > 0 ? 'ещё ' + daysLeft + ' дн.' : 'доступно';
    pill.classList.toggle('on', daysLeft === 0);
  }

  if (button) {
    button.disabled = daysLeft > 0;
    button.title = daysLeft > 0 ? 'Ник можно менять раз в 30 дней' : '';
  }
}

/** Сколько дней осталось до следующей смены ника (0 — можно менять). */
function nicknameCooldownDays() {
  const changedAt = Number(localStorage.getItem(NICK_CHANGED_KEY) || 0);
  if (!changedAt) return 0;

  const passedDays = (Date.now() - changedAt) / (1000 * 60 * 60 * 24);
  const left = Math.ceil(NICK_COOLDOWN_DAYS - passedDays);
  return left > 0 ? left : 0;
}

/* ---------- Сохранение настроек ---------- */

/**
 * Собирает все поля с data-setting и сохраняет их.
 * Реальные настройки применяются сразу, остальные работают как заглушки.
 */
function saveSetting(tabId) {
  const container = document.getElementById('settingsContent');
  if (!container) return;

  const settings = getSettings();
  let changed = 0;

  container.querySelectorAll('[data-setting]').forEach(input => {
    const key = input.dataset.setting;
    settings[key] = input.type === 'checkbox' ? input.checked : input.value;
    changed++;
  });

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

  // Применяем всё: внешний вид, звук, уведомления, язык
  if (typeof applyStoredSettings === 'function') applyStoredSettings();
  if (typeof applyAllPreferences === 'function') applyAllPreferences();

  // Подписи кастомных списков могли устареть — синхронизируем
  if (typeof syncCustomSelects === 'function') syncCustomSelects(container);

  const title = SETTINGS_CONTENT[tabId] ? SETTINGS_CONTENT[tabId].title : tabId;
  showToast('Настройки сохранены', 'Вкладка «' + title + '» · ' + changed + ' параметр(ов) записано в этот браузер', 'success', {
    icon: 'checkCircle',
    duration: 3200
  });
}

/* ---------- Мгновенное применение настроек ---------- */

/**
 * Применяет настройку, не дожидаясь кнопки «Сохранить».
 * @param {string} kind — theme | background | cursor | fontSize | animations | compact | sakura | avatarStyle
 * @param {*} value
 */
function applyInterfaceSetting(kind, value) {
  const map = {
    theme: 'interface.theme',
    background: 'interface.background',
    cursor: 'interface.cursor',
    fontSize: 'interface.fontSize',
    animations: 'interface.animations',
    compact: 'interface.compact',
    sakura: 'features.sakuraLevel',
    avatarStyle: 'features.avatarStyle'
  };

  const key = map[kind];
  if (key) setSettingValue(key, value);

  // Тему ставим как ручной выбор: так авто-тема не перебьёт её при переходе
  if (kind === 'theme' && typeof setTheme === 'function') {
    setTheme(value, false, { source: 'user' });
    if (typeof showToast === 'function') {
      const names = { default: 'Стандартная', sakura: 'Сакура', light: 'Светлая' };
      showToast('Тема изменена', 'Включена тема «' + (names[value] || value) + '»', 'success', { duration: 2200 });
    }
    return;
  }

  if (typeof applyStoredSettings === 'function') applyStoredSettings();

  if (kind === 'sakura') {
    const level = Number(value);
    if (typeof setSakuraLevel === 'function') setSakuraLevel(level);
    showToast('Сакура', level === 0 ? 'Лепестки выключены' : 'Уровень сакуры: ' + level + '%', 'info');
  }
}

/** Обновляет подпись рядом со слайдером. */
/** Подпись ползунка темпа: «15 мин». */
function updatePaceValue(value) {
  const label = document.getElementById('studyPaceValue');
  if (label) label.textContent = value + ' мин';
}

/** Ставит ползунок темпа на сохранённое значение. */
function syncStudyPaceControl() {
  const input = document.getElementById('studyPaceRange');
  if (!input || typeof getStudyPace !== 'function') return;

  const pace = getStudyPace();
  input.value = String(pace);
  updatePaceValue(pace);
}

function updateRangeValue(input, unit = '%') {
  const valueEl = input.closest('.range-row');
  if (!valueEl) return;
  const label = valueEl.querySelector('.range-value');
  if (label) label.textContent = input.value + unit;
}

/* ---------- Привязка соцсетей ---------- */

/** Ключ настройки для сервиса. */
function socialSettingKey(service) {
  return service === 'discord' ? 'account.discord' : 'account.telegram';
}

/** Человеческое название сервиса. */
function socialTitle(service) {
  return service === 'discord' ? 'Discord' : 'Telegram';
}

/**
 * Открывает привязку аккаунта. Пока без OAuth: ник сохраняется
 * в localStorage и показывается в строке — реально, а не «заглушка».
 */
function connectSocial(service) {
  const key = socialSettingKey(service);
  const title = socialTitle(service);
  const saved = String(getSettingValue(key, '') || '');

  const body = saved
    ? `<p class="muted small">Привязан аккаунт <b>${saved}</b>. Отвязать можно в любой момент —
         данные удалятся из этого браузера.</p>
       <div class="btn-row mt-20">
         <button class="btn btn-danger-outline" onclick="unlinkSocial('${service}')">Отвязать</button>
         <button class="btn btn-outline" onclick="closeSettingsModal()">Закрыть</button>
       </div>`
    : `<div class="field">
         <label for="socialInput">Ник в ${title}</label>
         <input class="input" type="text" id="socialInput" maxlength="32" placeholder="@nickname"
                value="${saved}" autocomplete="off">
         <div class="field-hint">Без пробелов: буквы, цифры и подчёркивание.</div>
       </div>
       <div class="btn-row mt-20">
         <button class="btn btn-primary" onclick="saveSocial('${service}')">Привязать</button>
         <button class="btn btn-outline" onclick="closeSettingsModal()">Отмена</button>
       </div>`;

  openSettingsModal(title, body);

  const input = document.getElementById('socialInput');
  if (input) {
    input.focus();
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') saveSocial(service);
    });
  }
}

/** Сохраняет ник соцсети. */
function saveSocial(service) {
  const input = document.getElementById('socialInput');
  if (!input) return;

  const value = input.value.trim().replace(/^@/, '');

  if (!/^[A-Za-z0-9_.-]{2,32}$/.test(value)) {
    showToast('Проверь ник', 'Только латиница, цифры, точка, дефис и подчёркивание', 'warning');
    input.focus();
    return;
  }

  setSettingValue(socialSettingKey(service), '@' + value);
  updateSocialRow(service, '@' + value);
  closeSettingsModal();

  showToast(socialTitle(service) + ' привязан', 'Ник @' + value + ' сохранён в этом браузере', 'success', {
    icon: 'checkCircle'
  });
}

/** Отвязывает соцсеть. */
function unlinkSocial(service) {
  setSettingValue(socialSettingKey(service), '');
  updateSocialRow(service, '');
  closeSettingsModal();
  showToast(socialTitle(service) + ' отвязан', 'Данные удалены из этого браузера', 'info');
}

/** Обновляет строку привязки в разделе «Аккаунт». */
function updateSocialRow(service, value) {
  const title = service === 'discord' ? 'Discord' : 'Telegram';
  const pill = document.getElementById('link' + title + 'Pill');
  const button = document.getElementById('link' + title + 'Btn');

  if (pill) {
    pill.textContent = value ? value : 'не привязан';
    pill.classList.toggle('is-on', Boolean(value));
  }

  if (button) button.textContent = value ? 'Отвязать' : 'Привязать';
}

/** Показывает состояние привязок при открытии вкладки. */
function refreshSocialRows() {
  ['discord', 'telegram'].forEach(service => {
    updateSocialRow(service, String(getSettingValue(socialSettingKey(service), '') || ''));
  });
}

/* ---------- Переключатели безопасности ---------- */

/**
 * Сохраняет переключатель и объясняет, что он делает.
 * @param {HTMLInputElement} input
 * @param {string} name
 */
function toggleSecurity(input, name) {
  const key = input.dataset.setting;
  setSettingValue(key, input.checked);

  if (key === 'account.2fa') {
    showToast(
      input.checked ? 'Дополнительная защита включена' : 'Дополнительная защита выключена',
      input.checked
        ? 'Код подтверждения спрашивается при входе на новом устройстве'
        : 'Вход снова будет в один шаг',
      'info'
    );
    return;
  }

  showToast(name, input.checked ? 'Включено и сохранено' : 'Выключено и сохранено', 'success');
}

/* ---------- Проверка соединения ---------- */

/** Реально проверяет доступность интернета и скорость отклика. */
async function checkConnection() {
  if (navigator.onLine === false) {
    showToast('Нет соединения', 'Браузер сообщает, что интернет отключён', 'error');
    return;
  }

  const started = performance.now();

  try {
    // Запрашиваем маленький файл с самого сайта — без внешних сервисов
    await fetch('manifest.json?ping=' + Date.now(), { method: 'GET', cache: 'no-store' });
    const ms = Math.round(performance.now() - started);

    showToast('Соединение в порядке', 'Отклик сервера — ' + ms + ' мс', 'success', {
      icon: 'bolt',
      duration: 3200
    });
  } catch (error) {
    showToast('Соединение нестабильно', 'Сайт не ответил на пробный запрос', 'error');
  }
}

/* ---------- Удаление аккаунта: подтверждение кодом с почты ---------- */

// Почта, на которую отправлен код, и признак «код уже отправлен»
let deleteCodeEmail = '';
let deleteCodeSent = false;

/** Шаг 1: окно с предупреждением и полем для кода. */
function deleteAccount() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  if (!user) {
    showToast('Нет активного аккаунта', 'Сначала войдите, чтобы удалить аккаунт', 'warning');
    return;
  }

  deleteCodeEmail = String(user.email || '').trim().toLowerCase();
  deleteCodeSent = false;

  openSettingsModal('Удалить аккаунт', `
    <p class="muted small">Аккаунт <b>${user.username}</b> будет удалён из этого браузера вместе с ником и почтой.
      Прогресс, слова и настройки останутся — их можно стереть отдельно кнопкой в политике cookies.</p>

    <div class="delete-confirm-note">
      <b>Нужно подтверждение почты.</b>
      <span>Мы отправим код на <b>${deleteCodeEmail || 'почту аккаунта'}</b>. Без кода аккаунт удалить нельзя —
        так его не удалят случайно с чужого устройства.</span>
    </div>

    <div class="field mt-16">
      <label for="deleteCode">Код из письма</label>
      <input class="input code-input" type="text" id="deleteCode" maxlength="10"
             placeholder="XXXXXXXXXX" autocomplete="one-time-code"
             oninput="this.value = this.value.toUpperCase()">
      <div class="field-hint" id="deleteCodeHint">Код из 10 символов, действует 10 минут</div>
    </div>

    <div class="btn-row mt-20">
      <button class="btn btn-outline" id="deleteSendBtn" type="button" onclick="deleteAccountSendCode()">Отправить код</button>
      <button class="btn btn-danger-outline" id="deleteConfirmBtn" type="button" onclick="deleteAccountConfirm()" disabled>Удалить навсегда</button>
    </div>

    <div class="btn-row mt-12">
      <button class="btn btn-ghost btn-small" type="button" onclick="closeSettingsModal()">Отмена</button>
    </div>
  `);
}

/** Шаг 2: отправляет код на почту аккаунта. */
async function deleteAccountSendCode() {
  if (typeof apiSendCode !== 'function') {
    showToast('Недоступно', 'Проверка кода не загрузилась. Обновите страницу', 'error');
    return;
  }

  if (!deleteCodeEmail) {
    showToast('Нет почты', 'У аккаунта не указана почта — подтверждение невозможно', 'error');
    return;
  }

  const btn = document.getElementById('deleteSendBtn');
  const confirmBtn = document.getElementById('deleteConfirmBtn');
  const hint = document.getElementById('deleteCodeHint');

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Отправляем...';
  }

  const result = await apiSendCode(deleteCodeEmail);

  if (btn) {
    btn.disabled = false;
    btn.textContent = deleteCodeSent ? 'Отправить ещё раз' : 'Отправить код';
  }

  if (!result.ok) {
    showToast('Не удалось отправить код', (result.data && result.data.message) || 'Попробуйте позже', 'error');
    return;
  }

  deleteCodeSent = true;
  if (confirmBtn) confirmBtn.disabled = false;

  // Демо-режим: письма нет, код показываем прямо в окне
  const demoCode = result.data && result.data.code;
  const codeInput = document.getElementById('deleteCode');

  if (demoCode) {
    if (codeInput) codeInput.value = demoCode;
    if (hint) hint.textContent = 'Демо-режим: письмо не отправляется, код — ' + demoCode;
    showToast('Ваш код: ' + demoCode, 'Демо-режим: письмо не отправляется, код действует 10 минут', 'success');
  } else {
    if (hint) hint.textContent = 'Код отправлен на ' + deleteCodeEmail;
    showToast('Код отправлен', 'Проверьте почту ' + deleteCodeEmail, 'success');
  }

  if (codeInput) codeInput.focus();
}

/** Шаг 3: проверяет код и удаляет аккаунт. */
async function deleteAccountConfirm() {
  const codeInput = document.getElementById('deleteCode');
  const code = codeInput ? String(codeInput.value || '').trim().toUpperCase() : '';
  const confirmBtn = document.getElementById('deleteConfirmBtn');

  if (!deleteCodeSent) {
    showToast('Сначала код', 'Нажмите «Отправить код» — без него удаление недоступно', 'warning');
    return;
  }

  if (code.length !== 10) {
    showToast('Код неполный', 'Код состоит из 10 символов', 'warning');
    if (codeInput) codeInput.focus();
    return;
  }

  if (typeof apiVerifyCode !== 'function' || typeof apiDeleteAccount !== 'function') {
    showToast('Недоступно', 'Проверка кода не загрузилась. Обновите страницу', 'error');
    return;
  }

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Проверяем...';
  }

  const verify = await apiVerifyCode(deleteCodeEmail, code);

  if (!verify.ok) {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Удалить навсегда';
    }
    showToast('Код неверный', (verify.data && verify.data.message) || 'Проверьте код и попробуйте снова', 'error');
    if (codeInput) codeInput.focus();
    return;
  }

  const result = await apiDeleteAccount();
  closeSettingsModal();

  deleteCodeEmail = '';
  deleteCodeSent = false;

  if (!result.ok) {
    showToast('Не удалось удалить', (result.data && result.data.message) || 'Попробуй позже', 'error');
    return;
  }

  showToast('Аккаунт удалён', 'Спасибо, что был с нами. Возвращайся!', 'info', { icon: 'heart' });

  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1400);
}

/** Обратная совместимость: старые ссылки вели сразу на удаление. */
function confirmDeleteAccount() {
  return deleteAccountConfirm();
}

/* ---------- Маленькая модалка для настроек ---------- */

/** Открывает служебное окно настроек. */
function openSettingsModal(title, bodyHtml) {
  closeSettingsModal();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay settings-modal-overlay';
  modal.id = 'settingsModal';
  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close" onclick="closeSettingsModal()" aria-label="Закрыть">✕</button>
      <h3>${title}</h3>
      ${bodyHtml}
    </div>
  `;

  modal.addEventListener('click', event => {
    if (event.target === modal) closeSettingsModal();
  });

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
}

/** Закрывает служебное окно. */
function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;

  modal.classList.remove('open');
  setTimeout(() => modal.remove(), 260);
}

/* ---------- Совместимость ---------- */

/** Старое имя оставлено, чтобы не падали внешние ссылки. */
function stubAction(name) {
  if (name === 'Удаление аккаунта') return deleteAccount();
  if (name === 'Проверка соединения') return checkConnection();
  if (name === 'Discord') return connectSocial('discord');
  if (name === 'Telegram') return connectSocial('telegram');
}

/** Старое имя переключателя. */
function stubToggle(input, name) {
  toggleSecurity(input, name);
}

/** Скачивает JSON с данными аккаунта из localStorage. */
function downloadMyData() {
  // getAccountData() собирает аккаунт, прогресс, достижения и настройки
  const data = getAccountData();

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'nihongo-data.json';
  link.click();

  URL.revokeObjectURL(url);
  showToast('Данные готовы', 'Файл nihongo-data.json скачан', 'success');
}

/* ---------- Смена пароля ---------- */

/** Меняет пароль: старый → новый. */
async function changePassword() {
  const oldInput = document.getElementById('oldPassword');
  const newInput = document.getElementById('newPassword');
  const repeatInput = document.getElementById('repeatPassword');
  if (!oldInput || !newInput || !repeatInput) return;

  const oldPassword = oldInput.value;
  const newPassword = newInput.value;
  const repeatPassword = repeatInput.value;

  if (!oldPassword) {
    showToast('Пароль не изменён', 'Введите текущий пароль', 'warning');
    oldInput.focus();
    return;
  }

  if (newPassword.length < 8) {
    showToast('Пароль не изменён', 'Новый пароль должен быть не короче 8 символов', 'warning');
    newInput.focus();
    return;
  }

  if (newPassword !== repeatPassword) {
    showToast('Пароль не изменён', 'Новые пароли не совпадают', 'warning');
    repeatInput.focus();
    return;
  }

  if (newPassword === oldPassword) {
    showToast('Пароль не изменён', 'Новый пароль должен отличаться от старого', 'warning');
    return;
  }

  const result = await apiChangePassword(oldPassword, newPassword);

  if (!result.ok) {
    showToast('Ошибка', result.data.message || 'Не удалось сменить пароль', 'error');
    return;
  }

  oldInput.value = '';
  newInput.value = '';
  repeatInput.value = '';

  showToast('Пароль изменён', 'Используйте новый пароль при следующем входе', 'success');
}

/* ---------- Смена ника ---------- */

/** Меняет ник (не чаще раза в 30 дней). */
async function changeNickname() {
  const input = document.getElementById('newNickname');
  if (!input) return;

  const nickname = input.value.trim();
  const daysLeft = nicknameCooldownDays();

  if (daysLeft > 0) {
    showToast('Пока нельзя', 'Ник можно менять раз в 30 дней. Осталось ' + daysLeft + ' дн.', 'error');
    return;
  }

  if (!/^[A-Za-zА-Яа-яЁё0-9_-]{3,20}$/.test(nickname)) {
    showToast('Ник не подходит', '3–20 символов: буквы, цифры, дефис или подчёркивание', 'warning');
    input.focus();
    return;
  }

  const current = getCurrentUser();
  if (current && nickname === current.username) {
    showToast('Ничего не изменилось', 'Это ваш текущий ник', 'info');
    return;
  }

  const button = document.getElementById('nicknameBtn');
  if (button) {
    button.disabled = true;
    button.textContent = 'Меняем...';
  }

  const result = await apiChangeNickname(nickname);

  if (button) {
    button.disabled = false;
    button.textContent = 'Сменить ник';
  }

  if (!result.ok) {
    showToast('Ошибка', result.data.message || 'Не удалось сменить ник', 'error');
    return;
  }

  // Ник в аккаунте уже обновлён внутри apiChangeNickname,
  // остаётся запомнить дату смены
  localStorage.setItem(NICK_CHANGED_KEY, String(Date.now()));

  input.value = '';
  fillAccountInfo();
  updateHeaderAuth();

  showToast('Ник изменён', 'Теперь вы — ' + nickname, 'success');
}

/* ---------- Смена почты ---------- */

/** Шаг 1: запрашивает код на новую почту. */
async function changeEmailRequest() {
  const input = document.getElementById('newEmail');
  const button = document.getElementById('emailRequestBtn');
  if (!input) return;

  const email = input.value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/.test(email)) {
    showToast('Проверьте почту', 'Введите корректный адрес', 'warning');
    input.focus();
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'Отправляем...';
  }

  const result = await apiChangeEmailRequest(email);

  if (button) {
    button.disabled = false;
    button.textContent = 'Отправить код';
  }

  if (!result.ok) {
    showToast('Ошибка', result.data.message || 'Не удалось отправить код', 'error');
    return;
  }

  // Запоминаем почту и показываем блок с кодом
  localStorage.setItem('pendingNewEmail', email);

  const block = document.getElementById('emailConfirmBlock');
  const confirmBtn = document.getElementById('emailConfirmBtn');
  if (block) block.classList.remove('hidden');
  if (confirmBtn) confirmBtn.classList.remove('hidden');

  const demoCode = result.data && result.data.code;
  const code = document.getElementById('emailCode');

  if (demoCode) {
    showToast('Ваш код: ' + demoCode, 'Демо-режим: письмо не отправляется, код действует 10 минут', 'success');
    if (code) code.value = demoCode;
  } else {
    showToast('Код отправлен', 'Проверьте ' + email, 'success');
  }

  if (code) code.focus();
}

/** Шаг 2: подтверждает новую почту кодом. */
async function changeEmailConfirm() {
  const codeInput = document.getElementById('emailCode');
  const button = document.getElementById('emailConfirmBtn');
  if (!codeInput) return;

  const code = codeInput.value.trim().toUpperCase();
  const email = localStorage.getItem('pendingNewEmail') || '';

  if (code.length !== 10) {
    showToast('Код неполный', 'Код состоит из 10 символов', 'warning');
    codeInput.focus();
    return;
  }

  if (!email) {
    showToast('Ошибка', 'Сначала запросите код на новую почту', 'error');
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'Проверяем...';
  }

  const result = await apiChangeEmailConfirm(email, code);

  if (button) {
    button.disabled = false;
    button.textContent = 'Подтвердить почту';
  }

  if (!result.ok) {
    showToast('Не удалось', result.data.message || 'Код неверный или истёк', 'error');
    return;
  }

  localStorage.removeItem('pendingNewEmail');
  codeInput.value = '';

  const block = document.getElementById('emailConfirmBlock');
  const confirmBtn = document.getElementById('emailConfirmBtn');
  const emailInput = document.getElementById('newEmail');
  if (block) block.classList.add('hidden');
  if (confirmBtn) confirmBtn.classList.add('hidden');
  if (emailInput) emailInput.value = '';

  showToast('Почта изменена', 'Новый адрес: ' + email, 'success');
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  // settings.html — защищённая страница: без сессии уводим на регистрацию
  if (typeof isAuthorized === 'function' && !isAuthorized()) {
    window.location.href = 'register.html';
    return;
  }

  updateHeaderAuth();

  // Открываем вкладку из адреса (#sound) или последнюю сохранённую
  const hashTab = window.location.hash.replace('#', '');
  const savedTab = localStorage.getItem('settingsTab');
  const startTab = SETTINGS_CONTENT[hashTab] ? hashTab : (SETTINGS_CONTENT[savedTab] ? savedTab : 'account');

  showSettingsTab(startTab, document.querySelector('.menu-item[data-tab="' + startTab + '"]'));

  // Esc закрывает панель дизайна
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && typeof toggleDesignPanel === 'function') {
      const panel = document.getElementById('designPanel');
      if (panel && panel.classList.contains('open')) toggleDesignPanel();
    }
  });
});

/* Экспорт в глобальную область */
window.SETTINGS_CONTENT = SETTINGS_CONTENT;
window.showSettingsTab = showSettingsTab;
window.saveSetting = saveSetting;
window.updateRangeValue = updateRangeValue;
window.applyInterfaceSetting = applyInterfaceSetting;
window.changePassword = changePassword;
window.changeNickname = changeNickname;
window.changeEmailRequest = changeEmailRequest;
window.changeEmailConfirm = changeEmailConfirm;
window.getSettings = getSettings;
window.getSettingValue = getSettingValue;
window.setSettingValue = setSettingValue;
window.connectSocial = connectSocial;
window.saveSocial = saveSocial;
window.unlinkSocial = unlinkSocial;
window.toggleSecurity = toggleSecurity;
window.checkConnection = checkConnection;
window.deleteAccount = deleteAccount;
window.confirmDeleteAccount = confirmDeleteAccount;
window.deleteAccountSendCode = deleteAccountSendCode;
window.renderCursorGrid = renderCursorGrid;
window.renderAccentGrid = renderAccentGrid;
window.deleteAccountConfirm = deleteAccountConfirm;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.stubAction = stubAction;
window.stubToggle = stubToggle;
window.downloadMyData = downloadMyData;
window.nicknameCooldownDays = nicknameCooldownDays;
