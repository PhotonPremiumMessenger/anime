/* ============================================================
   backup.js — экспорт и импорт прогресса
   Один JSON-файл со всеми ключами anilingo_*: опыт, уроки, слова,
   достижения, купленные предметы, друзья, настройки оформления.
   Импорт проверяет формат и не трогает чужие ключи localStorage.
   ============================================================ */

'use strict';

// Что именно попадает в файл: только наши ключи
function backupKeys() {
  const keys = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('anilingo_') || ['settings', 'theme', 'sakuraOn', 'avatar'].includes(key)) {
      keys.push(key);
    }
  }

  return keys.sort();
}

/** Собирает объект для файла. */
function buildBackup() {
  const data = {};

  backupKeys().forEach(key => {
    data[key] = localStorage.getItem(key);
  });

  return {
    app: 'anilingo',
    version: 2,
    exportedAt: new Date().toISOString(),
    user: typeof getCurrentUser === 'function' && getCurrentUser() ? getCurrentUser().username : null,
    keys: Object.keys(data).length,
    data: data
  };
}

/** Скачивает файл прогресса. */
function exportProgress() {
  const backup = buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = 'anilingo-progress-' + stamp + '.json';
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 2000);

  if (typeof showToast === 'function') {
    showToast('Файл готов', 'Сохранено ключей: ' + backup.keys + '. Файл лежит в загрузках.', 'success');
  }

  const info = document.getElementById('backupInfo');
  if (info) info.textContent = 'Последний экспорт: ' + new Date().toLocaleString('ru-RU');

  return backup;
}

/**
 * Импортирует прогресс из текста файла.
 * @param {string} text — содержимое JSON
 * @param {boolean} silent — без всплывашек
 */
function importProgressText(text, silent = false) {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    if (!silent && typeof showToast === 'function') {
      showToast('Файл не читается', 'Это не JSON из AniLingo', 'error');
    }
    return false;
  }

  // Файлы, сохранённые до переименования, помечены старым названием:
  // их тоже принимаем, иначе люди не смогут вернуть свой прогресс
  const knownApp = parsed && (parsed.app === 'anilingo' || parsed.app === 'nihongo');

  if (!knownApp || !parsed.data || typeof parsed.data !== 'object') {
    if (!silent && typeof showToast === 'function') {
      showToast('Не тот файл', 'Нужен файл, сохранённый кнопкой «Скачать прогресс»', 'error');
    }
    return false;
  }

  // В старых файлах ключи начинались с nihongo_ — переносим их на новые имена
  const renamed = {};

  Object.keys(parsed.data).forEach(key => {
    const nextKey = key.indexOf('nihongo_') === 0 ? 'anilingo_' + key.slice('nihongo_'.length) : key;
    renamed[nextKey] = parsed.data[key];
  });

  const keys = Object.keys(renamed).filter(key =>
    key.startsWith('anilingo_') || ['settings', 'theme', 'sakuraOn', 'avatar'].includes(key)
  );

  if (!keys.length) {
    if (!silent && typeof showToast === 'function') {
      showToast('Пусто', 'В файле нет данных AniLingo', 'warning');
    }
    return false;
  }

  keys.forEach(key => {
    const value = renamed[key];
    if (typeof value === 'string') localStorage.setItem(key, value);
  });

  if (!silent && typeof showToast === 'function') {
    showToast('Прогресс восстановлен', 'Ключей: ' + keys.length + '. Обновляю страницу…', 'success');
    setTimeout(() => window.location.reload(), 1200);
  }

  return keys.length;
}

/** Читает выбранный файл. */
function importProgressFile(input) {
  const file = input && input.files ? input.files[0] : null;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    importProgressText(String(reader.result || ''));
    input.value = '';
  };
  reader.readAsText(file);
}

/** Очищает прогресс (с подтверждением). */
function resetProgress() {
  const ok = window.confirm('Удалить весь прогресс в этом браузере? Аккаунт, опыт, слова и покупки пропадут.');
  if (!ok) return;

  backupKeys().forEach(key => localStorage.removeItem(key));
  window.location.href = 'index.html';
}

/** Сколько ключей и когда последний экспорт. */
function renderBackupInfo() {
  const box = document.getElementById('backupInfo');
  if (!box) return;

  const keys = backupKeys();
  box.textContent = 'В браузере ' + keys.length + ' ключей с данными. Файл экспорта содержит их все.';
}

document.addEventListener('DOMContentLoaded', renderBackupInfo);

/* Экспорт в глобальную область */
window.buildBackup = buildBackup;
window.exportProgress = exportProgress;
window.importProgressText = importProgressText;
window.importProgressFile = importProgressFile;
window.resetProgress = resetProgress;
window.backupKeys = backupKeys;
