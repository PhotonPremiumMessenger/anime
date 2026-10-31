/* ============================================================
   mailer.js — отправка писем с кодами подтверждения

   Почта уходит через nodemailer. Настройки берутся ТОЛЬКО из
   переменных окружения — в коде паролей нет.

   Если EMAIL_USER и EMAIL_PASS не заполнены, сервер работает
   в демо-режиме: письмо не отправляется, а код возвращается
   в ответе API (как было на статичной версии сайта). Так сайт
   можно поднять и проверить, не заводя почту.

   Для Gmail нужен «пароль приложения», а не обычный пароль
   от аккаунта: myaccount.google.com → Безопасность →
   Двухэтапная аутентификация → Пароли приложений.
   ============================================================ */

'use strict';

const nodemailer = require('nodemailer');

// Заполнить в .env — см. .env.example
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';

// Для Gmail менять не нужно; другой сервис — задать EMAIL_HOST/EMAIL_PORT
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 465);

// Имя отправителя в письме
const EMAIL_FROM = process.env.EMAIL_FROM || 'AniLingo';

let transporter = null;

/** Настроена ли почта (иначе демо-режим). */
function isMailConfigured() {
  return Boolean(EMAIL_USER && EMAIL_PASS);
}

/** Лениво создаёт транспорт: при демо-режиме он не нужен. */
function getTransporter() {
  if (transporter) return transporter;
  if (!isMailConfigured()) return null;

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465,
    auth: {
      // Значения из .env: EMAIL_USER и EMAIL_PASS
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  return transporter;
}

/* ---------- Письмо ---------- */

/**
 * HTML-шаблон письма с кодом.
 * Тёмный фон, крупный код, срок действия — в стиле сайта.
 */
function buildCodeEmail(code, purpose) {
  const titles = {
    register: 'Подтверждение почты',
    reset: 'Сброс пароля',
    'change-email': 'Новая почта'
  };

  const title = titles[purpose] || 'Код подтверждения';

  return `
  <div style="background:#0b0b0e;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#131318;border:1px solid #26262e;border-radius:18px;padding:30px">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#8b8b96">
        AniLingo
      </p>
      <h1 style="margin:0 0 14px;font-size:22px;color:#f2f2f5">${title}</h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#a9a9b4">
        Введите этот код на сайте. Он действует 10 минут.
      </p>
      <p style="margin:0 0 22px;padding:16px;border-radius:12px;background:#1c1c24;text-align:center;
                font-family:ui-monospace,Consolas,monospace;font-size:26px;letter-spacing:6px;color:#f2f2f5">
        ${code}
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#71717c">
        Если вы не запрашивали код — просто удалите письмо.
      </p>
    </div>
  </div>`;
}

/**
 * Отправляет код на почту.
 *
 * @param {string} email — получатель
 * @param {string} code — код из 10 символов
 * @param {string} purpose — register | reset | change-email
 * @returns {Promise<{delivered: boolean, demoCode?: string}>}
 */
async function sendCodeEmail(email, code, purpose) {
  // Демо-режим: почта не настроена
  if (!isMailConfigured()) {
    console.log(`[mail] Демо-режим (EMAIL_USER/EMAIL_PASS не заданы). Код для ${email}: ${code}`);
    return { delivered: false, demoCode: code };
  }

  const titles = {
    register: 'AniLingo — подтверждение почты',
    reset: 'AniLingo — сброс пароля',
    'change-email': 'AniLingo — новая почта'
  };

  try {
    await getTransporter().sendMail({
      from: `"${EMAIL_FROM}" <${EMAIL_USER}>`,
      to: email,
      subject: titles[purpose] || 'AniLingo — код подтверждения',
      text: `Ваш код: ${code}. Код действует 10 минут.`,
      html: buildCodeEmail(code, purpose)
    });

    return { delivered: true };
  } catch (error) {
    // Письмо не ушло — не роняем запрос, а пишем в лог.
    // Код при этом останется в демо-ответе, чтобы не блокировать вход.
    console.error('[mail] Не удалось отправить письмо:', error.message);
    return { delivered: false, demoCode: code, error: error.message };
  }
}

/* ---------- Письмо с новым паролем ---------- */

/**
 * HTML-письмо для сброса забытого пароля.
 * Раньше временный пароль уходил шаблоном «кода», и человек
 * получал пароль с подписью «введите этот код на сайте» —
 * непонятно, что с ним делать. Теперь письмо говорит прямо.
 */
function buildPasswordEmail(password) {
  return `
  <div style="background:#0b0b0e;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#131318;border:1px solid #26262e;border-radius:18px;padding:30px">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#8b8b96">
        AniLingo
      </p>
      <h1 style="margin:0 0 14px;font-size:22px;color:#f2f2f5">Новый пароль</h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#a9a9b4">
        Мы сбросили пароль по вашей просьбе. Войдите с ним на сайте
        и сразу смените его в настройках.
      </p>
      <p style="margin:0 0 22px;padding:16px;border-radius:12px;background:#1c1c24;text-align:center;
                font-family:ui-monospace,Consolas,monospace;font-size:22px;letter-spacing:2px;color:#f2f2f5">
        ${password}
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#71717c">
        Если вы не просили сброс — войдите и смените пароль: значит,
        кто-то знает адрес вашей почты.
      </p>
    </div>
  </div>`;
}

/**
 * Отправляет письмо с новым паролем.
 * @param {string} email — получатель
 * @param {string} password — временный пароль
 * @returns {Promise<{delivered: boolean, demoCode?: string}>}
 */
async function sendPasswordEmail(email, password) {
  if (!isMailConfigured()) {
    console.log(`[mail] Демо-режим. Новый пароль для ${email}: ${password}`);
    return { delivered: false, demoCode: password };
  }

  try {
    await getTransporter().sendMail({
      from: `"${EMAIL_FROM}" <${EMAIL_USER}>`,
      to: email,
      subject: 'AniLingo — новый пароль',
      text: `Новый пароль AniLingo: ${password}. Войдите с ним и смените его в настройках.`,
      html: buildPasswordEmail(password)
    });

    return { delivered: true };
  } catch (error) {
    console.error('[mail] Не удалось отправить новый пароль:', error.message);
    return { delivered: false, error: error.message };
  }
}

module.exports = { sendCodeEmail, sendPasswordEmail, isMailConfigured };
