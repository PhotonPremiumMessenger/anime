/* ============================================================
   admins.js — кто на сайте может всё

   Администратор — это обычный аккаунт, но с послаблениями:
   • промокоды можно активировать сколько угодно раз, в том числе
     те, что уже разобрали другие;
   • его активации не расходуют общий лимит кода, поэтому чужие
     три места на TENNO остаются чужим.

   Список ников задаётся здесь. Регистр не важен: MglochKa и
   mglochka — один и тот же человек.

   Не хотите хранить ник в коде — задайте переменные окружения:
   • ADMIN_USERNAMES — ники через запятую (главнее списка ниже);
   • ADMIN_EMAILS — почты через запятую. Это надёжнее ника: почту
     чужой человек не займёт, а ник «MglochKa» новичок может
     зарегистрировать первым, если аккаунта ещё нет.
   ============================================================ */

'use strict';

// Владелец сайта. Список можно продолжить своими никами.
const DEFAULT_ADMIN_NAMES = ['MglochKa', 'ADMIN'];

/** Все ники с полным доступом в нижнем регистре. */
function adminNames() {
  const fromEnv = String(process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);

  const list = fromEnv.length ? fromEnv : DEFAULT_ADMIN_NAMES;
  return list.map(name => name.toLowerCase());
}

/** Почты с полным доступом в нижнем регистре. */
function adminEmails() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

/** Ник принадлежит администратору. */
function isAdminName(username) {
  const needle = String(username || '').trim().toLowerCase();
  if (!needle) return false;

  return adminNames().includes(needle);
}

/** Пользователь из базы — администратор (по нику или по почте). */
function isAdmin(user) {
  if (!user) return false;
  if (isAdminName(user.username)) return true;

  const email = String(user.email || '').trim().toLowerCase();
  return Boolean(email) && adminEmails().includes(email);
}

module.exports = { DEFAULT_ADMIN_NAMES, adminNames, adminEmails, isAdminName, isAdmin };
