/* ============================================================
   i18n.js — язык интерфейса
   Переводит «оболочку» сайта: шапку, меню, подвал и основные
   кнопки. Текст контента (уроки, аниме, грамматика) остаётся
   на русском — это учебные материалы.
   Язык берётся из настройки interface.language.
   ============================================================ */

'use strict';

/** Словарь: русский оригинал → английский и японский. */
const I18N_DICT = {
  // Навигация
  'Главная': ['Home', 'ホーム'],
  'Уроки': ['Lessons', 'レッスン'],
  'Аниме': ['Anime', 'アニメ'],
  'Тесты': ['Tests', 'テスト'],
  'Грамматика': ['Grammar', '文法'],
  'Ещё': ['More', 'もっと'],
  'Дизайн': ['Design', 'デザイン'],
  'Меню': ['Menu', 'メニュー'],

  // Группы меню
  'Учёба': ['Study', '学習'],
  'Практика': ['Practice', '練習'],
  'Прогресс': ['Progress', '進捗'],
  'Разное': ['Other', 'その他'],

  // Пункты меню
  'Словарь': ['Dictionary', '辞書'],
  'Видео-уроки': ['Video lessons', '動画レッスン'],
  'Пробный JLPT': ['JLPT trial', 'JLPT模試'],
  'Поиск': ['Search', '検索'],
  'Флешкарты': ['Flashcards', '単語カード'],
  'Кандзи-пары': ['Kanji pairs', '漢字ペア'],
  'Аудирование': ['Listening', 'リスニング'],
  'Скорость': ['Speed', 'スピード'],
  'Слабые места': ['Weak spots', '弱点'],
  'Профиль': ['Profile', 'プロフィール'],
  'Рейтинг': ['Rating', 'ランキング'],
  'Магазин': ['Shop', 'ショップ'],
  'Избранное': ['Favorites', 'お気に入り'],
  'Обновления': ['Updates', '更新'],
  'О проекте': ['About', '概要'],
  'Настройки': ['Settings', '設定'],

  // Шапка
  'Войти': ['Log in', 'ログイン'],
  'Регистрация': ['Sign up', '登録'],

  // Подвал
  'Платформа': ['Platform', 'プラットフォーム'],
  'Аккаунт': ['Account', 'アカウント'],
  'Проект': ['Project', 'プロジェクト'],
  'Конфиденциальность': ['Privacy', 'プライバシー'],
  'Cookies': ['Cookies', 'クッキー'],
  'Поддержать проект': ['Support the project', 'プロジェクトを支援'],
  'Поддержать': ['Support', '支援する'],
  'Политика конфиденциальности': ['Privacy policy', 'プライバシーポリシー'],
  'Контакты': ['Contacts', '連絡先'],
  'Все права защищены.': ['All rights reserved.', '無断転載を禁じます。'],
  'Сделано с': ['Made with', '作成'],

  // Кнопки и мелочи
  'Закрыть': ['Close', '閉じる'],
  'Отмена': ['Cancel', 'キャンセル'],
  'Сохранить': ['Save', '保存'],
  'Дальше': ['Next', '次へ'],
  'Назад': ['Back', '戻る'],
  'Пропустить': ['Skip', 'スキップ'],
  'Готово': ['Done', '完了'],
  'Свернуть все': ['Collapse all', 'すべて折りたたむ'],
  'Раскрыть все': ['Expand all', 'すべて展開'],
  'Прочитать': ['Mark read', '既読'],
  'Очистить': ['Clear', 'クリア'],
  'Уведомления': ['Notifications', '通知']
};

// Узлы, где переводим текст
const I18N_SCOPE = '.header, .footer, .nav, .design-panel, .cookie-card, .tour-card';

// Оригинальный текст каждого узла (чтобы вернуть русский)
const i18nOriginals = new WeakMap();

/** Читает язык прямо из localStorage — без зависимостей от других файлов. */
function currentInterfaceLanguage() {
  let raw = 'ru';

  try {
    const all = JSON.parse(localStorage.getItem('settings') || '{}');
    if (all && all['interface.language']) raw = all['interface.language'];
  } catch (error) {
    raw = 'ru';
  }

  return ['ru', 'en', 'ja'].includes(String(raw)) ? String(raw) : 'ru';
}

/** Перевод одной строки. */
function translateString(text, lang) {
  const trimmed = text.trim();
  if (!trimmed) return text;

  // «© 2026 AniLingo. Все права защищены.» — переводим только хвост
  const entry = I18N_DICT[trimmed];
  if (entry) {
    const translated = lang === 'en' ? entry[0] : entry[1];
    return text.replace(trimmed, translated);
  }

  return text;
}

/**
 * Переводит все подходящие текстовые узлы.
 * @param {string} lang — ru | en | ja
 */
function translateNodeTree(lang) {
  const roots = document.querySelectorAll(I18N_SCOPE);
  if (!roots.length) return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (!node.parentElement || !node.parentElement.closest(I18N_SCOPE)) return NodeFilter.FILTER_REJECT;
      if (node.parentElement.closest('script, style, textarea, input')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(node => {
    if (!i18nOriginals.has(node)) i18nOriginals.set(node, node.nodeValue);

    const original = i18nOriginals.get(node);
    node.nodeValue = lang === 'ru' ? original : translateString(original, lang);
  });
}

/** Применяет язык интерфейса. */
function applyLanguage() {
  const lang = currentInterfaceLanguage();

  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;

  translateNodeTree(lang);
}

/* Переводим и то, что дорисовывается позже (меню, панели) */
document.addEventListener('DOMContentLoaded', () => {
  applyLanguage();

  if (typeof MutationObserver !== 'function') return;

  let scheduled = false;

  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      if (document.hidden) return;
      if (currentInterfaceLanguage() !== 'ru') applyLanguage();
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
});

window.applyLanguage = applyLanguage;
window.currentInterfaceLanguage = currentInterfaceLanguage;
window.I18N_DICT = I18N_DICT;
