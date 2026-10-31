# AniLingo — сервер

Node.js + Express + SQLite. Отвечает за аккаунты, коды подтверждения
на почту, настройки и прогресс, которые синхронизируются между
устройствами.

## Что внутри

| Файл | Назначение |
| --- | --- |
| `index.js` | точка входа: Express, CORS, лимиты запросов, статика |
| `db.js` | SQLite через встроенный `node:sqlite`, схема и запросы |
| `mailer.js` | nodemailer, письма с кодами (`EMAIL_USER` / `EMAIL_PASS`) |
| `auth.js` | подпись и проверка JWT, middleware `requireAuth` |
| `routes/auth.js` | регистрация, вход, коды, пароль, ник, почта |
| `routes/user.js` | настройки, профиль, выгрузка данных |

## Требования

**Node.js 22.5 или новее.** База работает на встроенном модуле
`node:sqlite`, поэтому нативных сборок нет: не нужны компиляторы и
скачивание заголовков Node. Проверить версию: `node -v`.

## Установка

```bash
cd server
cp .env.example .env
nano .env                 # заполнить JWT_SECRET и почту
npm install
npm start
```

Сервер поднимется на `http://0.0.0.0:3000` и сам раздаст сайт из корня
репозитория. База создастся при первом запуске в `server/data/anilingo.db`.

## Переменные окружения

Обязательные:

| Переменная | Что это |
| --- | --- |
| `JWT_SECRET` | секрет подписи токенов, `openssl rand -hex 32` |
| `EMAIL_USER` | адрес, с которого уходят письма |
| `EMAIL_PASS` | **пароль приложения** Google, не обычный пароль |

Для Gmail пароль приложения: `myaccount.google.com` → Безопасность →
Двухэтапная аутентификация → Пароли приложений.

Если `EMAIL_USER` и `EMAIL_PASS` не заполнены, сервер работает в
**демо-режиме**: письмо не отправляется, а код возвращается в ответе
и показывается на экране. Так можно проверить всё, не заводя почту.

`GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` в `.env.example` есть, но
**не используются** — это заготовка на будущее. Входа через Google на
сайте нет и не добавляется: Google здесь только почтовый сервис.

## API

Все ответы — JSON. Ошибка всегда `{ "message": "текст" }`.

### Проверка связи

```
GET /api/health → { ok: true, service: 'anilingo', mail: true }
```

Фронтенд спрашивает этот адрес при загрузке. Нет ответа — сайт
переходит в демо-режим на localStorage.

### Аккаунты

| Метод | Адрес | Тело |
| --- | --- | --- |
| POST | `/api/auth/send-code` | `{ email, purpose? }` |
| POST | `/api/auth/verify-code` | `{ email, code, purpose? }` |
| POST | `/api/auth/register` | `{ username, email, password }` |
| POST | `/api/auth/login` | `{ login, password }` |
| POST | `/api/auth/logout` | — |
| GET | `/api/auth/me` | нужен токен |
| POST | `/api/auth/forgot-password` | `{ email }` |
| PUT | `/api/auth/password` | `{ oldPassword, newPassword }` |
| PUT | `/api/auth/nickname` | `{ username }` |
| POST | `/api/auth/email/request` | `{ email }` |
| POST | `/api/auth/email/confirm` | `{ email, code }` |
| DELETE | `/api/auth/account` | `{ password? }` |

`purpose` у кода: `register`, `reset`, `change-email`, `delete`.
Если не передан, сервер решает сам: почты нет в базе — `register`,
есть — `delete`.

Регистрация возможна только после проверки кода: `register` смотрит,
что для этой почты есть подтверждённый код.

### Данные пользователя (нужен заголовок `Authorization: Bearer <токен>`)

| Метод | Адрес | Тело |
| --- | --- | --- |
| GET | `/api/user/settings` | — |
| PUT | `/api/user/settings` | `{ patch: { 'interface.theme': 'light' } }` |
| GET | `/api/user/profile` | — |
| PUT | `/api/user/profile` | `{ xp, level, data }` |
| GET | `/api/user/export` | — |

`PUT /api/user/settings` принимает **патч**, а не весь объект: телефон и
компьютер не затирают настройки друг друга. Значение `null` удаляет
ключ и возвращает значение по умолчанию.

Оба ответа — `GET` и `PUT` — содержат ещё и отметки времени:

```json
{
  "ok": true,
  "settings": { "data.anilingo_progress": { "1": { "done": true } } },
  "updated":  { "data.anilingo_progress": "2026-10-30T11:22:33.114Z" }
}
```

По ним клиент (`js/sync.js`) понимает, чьё значение свежее. Без этого
два устройства затирали бы прогресс друг друга: тот, кто открыл
страницу позже, отправлял бы свой старый вариант поверх нового.
Правило простое: ключ менялся здесь — уходит здешнее значение и
запоминается новая отметка; ключ менялся на другом устройстве —
приезжает его значение.

Какие ключи относятся к аккаунту:

| Префикс | Что это |
| --- | --- |
| без префикса | настройки интерфейса и контента, например `interface.theme` |
| `appearance.` | цвет сайта: свой цвет, палитра, радуга |
| `data.` | прогресс, достижения, серия дней, ошибки, флешкарты, магазин, избранное |

Крупные значения (больше 32 КБ) клиент на сервер не отправляет:
музыка и свой фон остаются на устройстве.

## База данных

```sql
users         (id, username, username_key, email, email_key,
               password_hash, avatar, email_verified, created_at, updated_at)
email_codes   (id, email_key, code, purpose, expires_at, attempts,
               verified, used, created_at)
user_settings (user_id, key, value, updated_at)   -- PRIMARY KEY (user_id, key)
user_profile  (user_id, xp, level, data, updated_at)
```

`username_key` и `email_key` — приведённые к нижнему регистру копии:
`COLLATE NOCASE` в SQLite понимает только латиницу, а ники у нас
бывают кириллицей.

Коды живут 10 минут, дают 5 попыток, на адрес не больше 6 писем в час.

## Развёртывание на VPS

```bash
# nginx раздаёт статику, Express только API
SERVE_STATIC=0 npm start

# или наоборот: Express раздаёт всё
npm start
```

За `nginx` обязательно `proxy_set_header X-Forwarded-For $remote_addr;`,
иначе лимиты запросов посчитают всех одним IP.

Для автозапуска — `pm2 start index.js --name anilingo-api`.

## Проверка, что всё работает

```bash
curl http://localhost:3000/api/health
node db.js                      # покажет файл базы и таблицы
```

## Что не синхронизируется (остаётся в браузере)

- фон сайта, загруженный пользователем;
- флаги «показано окно приветствия», тур, согласие на cookies;
- плейлист и свои музыкальные файлы — это мегабайты, сервер их не хранит.
