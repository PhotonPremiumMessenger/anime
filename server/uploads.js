/* ============================================================
   uploads.js — загрузка файлов оформления профиля

   Здесь живёт всё, что связано с файлами, а не с данными:
   папка на диске, приём файла и удаление старого.

   Как устроено:
   • файлы лежат в server/uploads/<папка>/ — это не база,
     поэтому картинки не раздувают SQLite;
   • имя файла собираем сами: <префикс>-<id>-<время>.<расширение>,
     к имени от пользователя не обращаемся вовсе;
   • в базу уходит только адрес вида /uploads/covers/cover-3-....jpg;
   • старый файл удаляем, когда загрузили новый — мусор не копится.

   Проверка размера и типа — на сервере: браузеру доверяем только
   подсказку, решает всё равно multer + проверка MIME.
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Корень загрузок. Лежит внутри server/, поэтому не попадает в Git
// (см. .gitignore) и легко переносится вместе с проектом.
const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(__dirname, 'uploads');

// Пределы размеров
const IMAGE_LIMIT = 5 * 1024 * 1024;   // 5 МБ — фото
const VIDEO_LIMIT = 10 * 1024 * 1024;  // 10 МБ — видео

// Какие типы принимаем: картинки и видео для фонов
const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const VIDEO_TYPES = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov'
};

/** Все разрешённые типы: MIME → расширение. */
const ALLOWED_TYPES = Object.assign({}, IMAGE_TYPES, VIDEO_TYPES);

/** Создаёт папку загрузок при старте: multer не умеет это сам. */
function ensureUploadDirs() {
  const folders = ['covers', 'avatars'];

  folders.forEach(folder => {
    fs.mkdirSync(path.join(UPLOAD_ROOT, folder), { recursive: true });
  });
}

/** Адрес файла для браузера. */
function publicUrl(folder, fileName) {
  return '/uploads/' + folder + '/' + fileName;
}

/**
 * Удаляет файл по его публичному адресу.
 * Тихо игнорирует всё, что не похоже на наш файл: чужие адреса
 * и попытки выйти за пределы папки загрузок отсекаем.
 */
function removeUploaded(url) {
  const clean = String(url || '').trim();
  if (!clean.startsWith('/uploads/')) return false;

  const relative = clean.slice('/uploads/'.length);
  const target = path.resolve(UPLOAD_ROOT, relative);
  const root = path.resolve(UPLOAD_ROOT);

  // Файл должен лежать строго внутри папки загрузок
  if (target !== root && !target.startsWith(root + path.sep)) return false;

  try {
    fs.unlinkSync(target);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Приём одного файла в папку.
 * @param {string} folder — подпапка внутри uploads
 * @param {string} prefix — начало имени файла
 * @param {number} limit — предел размера в байтах
 */
function singleFileUploader(folder, prefix, limit) {
  ensureUploadDirs();

  const storage = multer.diskStorage({
    destination(req, file, done) {
      const target = path.join(UPLOAD_ROOT, folder);
      fs.mkdirSync(target, { recursive: true });
      done(null, target);
    },

    filename(req, file, done) {
      const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname || '').toLowerCase() || '.bin';
      const stamp = Date.now().toString(36);
      const salt = crypto.randomBytes(4).toString('hex');
      const owner = req.user && req.user.id ? String(req.user.id) : 'guest';

      done(null, prefix + '-' + owner + '-' + stamp + '-' + salt + ext);
    }
  });

  return multer({
    storage: storage,
    limits: { fileSize: limit, files: 1 },
    fileFilter(req, file, done) {
      if (!ALLOWED_TYPES[file.mimetype]) {
        done(new Error('UNSUPPORTED_TYPE'));
        return;
      }

      done(null, true);
    }
  }).single('file');
}

/* ---------- Готовые приёмники ---------- */

// Фон профиля: фото до 5 МБ или видео до 10 МБ.
// Лимит multer общий, поэтому ставим 10 МБ, а точную проверку
// «фото не больше 5 МБ» делает маршрут: он видит MIME.
const takeCoverFile = singleFileUploader('covers', 'cover', VIDEO_LIMIT);

// Аватар остаётся картинкой в base64 (он маленький), но функция
// пригодится, если решим перевести и его на файлы.
const takeAvatarFile = singleFileUploader('avatars', 'avatar', IMAGE_LIMIT);

module.exports = {
  UPLOAD_ROOT,
  IMAGE_LIMIT,
  VIDEO_LIMIT,
  IMAGE_TYPES,
  VIDEO_TYPES,
  ALLOWED_TYPES,
  ensureUploadDirs,
  publicUrl,
  removeUploaded,
  singleFileUploader,
  takeCoverFile,
  takeAvatarFile
};
