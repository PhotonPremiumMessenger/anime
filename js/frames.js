/* ============================================================
   frames.js — художественные рамки вокруг аватара

   Рамка — готовое изображение с прозрачным центром. Она лежит
   ПОВЕРХ аватара: кольцо приходится на край фотографии, а всё,
   что «заходит» внутрь (руки, лепестки, шипы), закрывает часть
   картинки — как на референсах.

   У каждой рамки свой масштаб (scale): он подобран так, чтобы
   дырка в картинке была чуть меньше аватара. Один и тот же файл
   одинаково смотрится и в шапке 34 px, и в профиле 180 px —
   размер считается от --av-size.

   Картинки лежат в assets/images/frames/*.webp (512×512, альфа).
   ============================================================ */

'use strict';

/**
 * Список рамок.
 *
 * Поля:
 *   id     — совпадает с id товара в магазине;
 *   file   — картинка в assets/images/frames;
 *   scale  — во сколько раз картинка больше аватара;
 *   motion — тип «жизни»: none | breathe | spin | sway | pulse.
 */
const AVATAR_FRAMES = [
  /* ---------- 3D: объёмные, с тенями и светом ---------- */
  {
    id: 'frame-hands',
    file: 'hands',
    name: 'Руки времени',
    desc: 'Костяные руки и алые шипы сжимают аватар',
    price: 9000,
    scale: 1.4,
    motion: 'breathe'
  },
  {
    id: 'frame-dragon-gold',
    file: 'dragon-gold',
    name: 'Золотой дракон',
    desc: 'Дракон свернулся вокруг кадра и светит глазами',
    price: 12000,
    scale: 1.2,
    motion: 'sway'
  },
  {
    id: 'frame-gold-baroque',
    file: 'gold-baroque',
    name: 'Баронское золото',
    desc: 'Литая филигрань с рубинами и бриллиантами',
    price: 11000,
    scale: 1.2,
    motion: 'breathe'
  },
  {
    id: 'frame-ice-crystal',
    file: 'ice-crystal',
    name: 'Вечная мерзлота',
    desc: 'Острые кристаллы льда и морозный туман',
    price: 7000,
    scale: 1.32,
    motion: 'pulse'
  },
  {
    id: 'frame-ember-lava',
    file: 'ember-lava',
    name: 'Раскалённый камень',
    desc: 'Трещины магмы и летящие искры',
    price: 8500,
    scale: 1.22,
    motion: 'pulse'
  },
  {
    id: 'frame-sakura-3d',
    file: 'sakura-3d',
    name: 'Цветущая ветвь',
    desc: 'Живые ветки сакуры и лепестки на ветру',
    price: 9500,
    scale: 1.13,
    motion: 'sway'
  },
  {
    id: 'frame-jade-bamboo',
    file: 'jade-bamboo',
    name: 'Нефритовый бамбук',
    desc: 'Полированный камень и золотая проволока',
    price: 8000,
    scale: 1.23,
    motion: 'breathe'
  },
  {
    id: 'frame-void-purple',
    file: 'void-purple',
    name: 'Пустота',
    desc: 'Фиолетовая магия и парящие руны',
    price: 10000,
    scale: 1.35,
    motion: 'spin'
  },
  {
    id: 'frame-neon-cyber',
    file: 'neon-cyber',
    name: 'Неоновый город',
    desc: 'Трубки света и отражения ночных вывесок',
    price: 7500,
    scale: 1.07,
    motion: 'pulse'
  },
  {
    id: 'frame-steel-chains',
    file: 'steel-chains',
    name: 'Стальные цепи',
    desc: 'Хромированные звенья и сюрикены',
    price: 6500,
    scale: 1.4,
    motion: 'spin'
  }
];

/** Рамка по id товара или null. */
function getAvatarFrame(id) {
  return AVATAR_FRAMES.find(frame => frame.id === id) || null;
}

/**
 * Разметка картинки-рамки. Пустая строка, если это не арт-рамка:
 * обычные CSS-рамки (например, бесплатная «Первый шаг») работают
 * через классы и этот слой им не нужен.
 */
function avatarFrameArtMarkup(frameId) {
  const frame = getAvatarFrame(frameId);
  if (!frame) return '';

  const src = 'assets/images/frames/' + frame.file + '.webp';

  return '<i class="avatar-frame-art" aria-hidden="true" data-motion="' + frame.motion + '"' +
    ' style="--fr-scale:' + frame.scale + ';background-image:url(\'' + src + '\')"></i>';
}

window.AVATAR_FRAMES = AVATAR_FRAMES;
window.getAvatarFrame = getAvatarFrame;
window.avatarFrameArtMarkup = avatarFrameArtMarkup;
