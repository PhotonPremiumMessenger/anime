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
| `google.js` | Passport и стратегия Google, подписанный `state` |
| `routes/auth.js` | регистрация, вход, коды, пароль, ник, почта |
| `routes/google.js` | `GET /auth/google` и `/auth/google/callback` |
| `routes/user.js` | настройки, профиль, выгрузка данных, фон профиля |
| `routes/promo.js` | промокоды: проверка и выдача награды |
| `routes/tts.js` | озвучка слов: `POST /api/tts` отдаёт MP3 |
| `tts.js` | озвучка: Microsoft Edge TTS, запасной Google, кэш, пределы |
| `admins.js` | кто на сайте может всё (промокоды без ограничений) |
| `uploads.js` | приём файлов оформления профиля |

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

### Вход через Google

Заполните `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` — и на странице
входа появится рабочая кнопка «Войти через Google». Без них сайт
работает как обычно, а кнопка честно сообщает, что вход не настроен.

Где взять ключи (console.cloud.google.com):

1. **APIs & Services → OAuth consent screen** — заполнить форму,
   тип External, указать почту поддержки.
2. **Credentials → Create credentials → OAuth client ID** →
   тип **Web application**.
3. **Authorized redirect URIs** — ровно тот адрес, куда Google
   возвращает человека, без слэша на конце:

   ```
   https://www.anilingo.fun/auth/google/callback
   http://localhost:3000/auth/google/callback
   ```

4. Скопировать Client ID и Client secret в `.env`.

Необязательные переменные:

| Переменная | Что это |
| --- | --- |
| `GOOGLE_CALLBACK_URL` | адрес коллбэка, если сервер за прокси определяет домен неправильно |
| `SITE_URL` | куда возвращать человека после входа (`https://www.anilingo.fun`) |

Как это работает:

* `GET /auth/google` уводит на страницу согласия Google. В параметре
  `state` лежит короткий подписанный JWT с адресом возврата — чужой
  ответ Google не примут.
* `GET /auth/google/callback` ищет аккаунт по почте из Google.
  Нашёлся — обычный JWT на 30 дней, как при входе по паролю.
  Не нашёлся — создаётся аккаунт с этой почтой, **без пароля**
  и без ника (`password_hash = NULL`, `needs_profile = 1`).
* Дальше человек попадает на страницу `complete-profile`, где
  придумывает ник и пароль. Пароль сохраняется `bcrypt`-хешем
  (10 раундов), и дальше работает обычный вход по почте.
* Сессий на сервере нет: `passport.session()` не используется,
  состояние входа живёт в JWT.

## Полный доступ (администратор)

Администратор — обычный аккаунт с послаблениями: промокоды можно
активировать повторно, израсходованные коды для него не исчезают,
а его активации **не тратят общий лимит** кода, поэтому остальным
достаются все места.

Кто администратор, решает `admins.js`: по умолчанию ники `MglochKa` и
`ADMIN` (регистр не важен). Не хотите держать ник в коде — задайте
переменные окружения:

| Переменная | Что это |
| --- | --- |
| `ADMIN_USERNAMES` | ники через запятую, главнее списка в `admins.js` |
| `ADMIN_EMAILS` | почты через запятую — надёжнее ника |

Почта надёжнее: ник `MglochKa` может занять любой новый игрок, если
аккаунт с таким ником ещё не создан, а почту — нет. Поэтому на боевом
сервере лучше задать `ADMIN_EMAILS` со своей почтой.

Проверить, что доступ включён: после входа открыть `/api/auth/me` —
в ответе будет `"admin": true`, а в профиле у ника появится плашка
`ADMIN`.

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
| POST | `/api/auth/complete-google-profile` | `{ username, password }`, нужен токен |
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

### Вход через Google

Это адреса для браузера (редиректы), а не для `fetch` — поэтому они
живут в корне, без `/api`.

| Метод | Адрес | Что делает |
| --- | --- | --- |
| GET | `/auth/google?next=/profile` | редирект на страницу согласия Google |
| GET | `/auth/google/callback` | принимает ответ Google, выдаёт JWT |

После входа человек уезжает на `/complete-profile#token=…&next=…`.
Хвост после `#` на сервер не уходит, а страница сразу стирает его
из адресной строки.

### Озвучка

| Метод | Адрес | Тело |
| --- | --- | --- |
| POST | `/api/tts` | `{ text, lang: 'ja' \| 'ru', rate? }` |
| GET | `/api/tts/voices` | — |
| GET | `/api/tts/health` | проверка связи с сервисами синтеза |

Ответ на `POST /api/tts` — не JSON, а готовый **MP3**
(`Content-Type: audio/mpeg`). Заголовки `X-TTS-Voice`, `X-TTS-Lang` и
`X-TTS-Cache: hit|miss` помогают проверить, какой голос сработал и
попали ли вы в кэш сервера.

- `text` — до 300 символов, пустой текст даёт `400`;
- `lang` — `ja` (Нанами, `ja-JP-NanamiNeural`) или `ru` (Светлана,
  `ru-RU-SvetlanaNeural`). Не передали — сервер определит по тексту;
- `rate` — скорость 0.5–1.5 из настроек, уходит в голос процентами;
- если сервис Microsoft не ответил за 9 секунд, сервер пробует
  второй путь — Google Translate (обычный HTTPS, без WebSocket).
  На некоторых хостингах провайдер режет `wss://` к
  `speech.platform.bing.com`, хотя HTTPS к нему же работает: без
  второго пути озвучка там не работает совсем;
- кто именно прочитал слово, видно в заголовке `X-TTS-Provider`
  (`edge` или `google`), а подпись голоса в интерфейсе честно
  говорит «Запасной голос»;
- если не ответил никто из двух, маршрут отдаёт `502` с понятным
  текстом, а следующие 20 секунд падает сразу.

Когда озвучка не идёт, а в браузере видно только `502`, смотреть
причину нужно здесь:

```bash
curl -s https://www.anilingo.fun/api/tts/health
```

В ответе — поле `providers` с результатом по каждому пути отдельно:
время, размер звука или текст ошибки. Так сразу видно, что мешает:
провайдер блокирует WebSocket, сбиты часы (403) или что-то третье.

Токен не нужен: слова слушают и гости. Частота ограничена отдельным
лимитом — 240 запросов за 15 минут с одного IP, поэтому на боевом
сервере маршрут не станет бесплатным генератором озвучки.

Готовый MP3 кэшируется в памяти сервера (до 150 записей), а браузер
хранит звук в IndexedDB по ключу `язык:текст` — повторное слово
не генерируется заново.

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
users         (id, username, username_key, email, email_key, password_hash,
               avatar, email_verified, google_id, needs_profile,
               created_at, updated_at)
email_codes   (id, email_key, code, purpose, expires_at, attempts,
               verified, used, created_at)
user_settings (user_id, key, value, updated_at)   -- PRIMARY KEY (user_id, key)
user_profile  (user_id, xp, level, data, updated_at)
```

`username_key` и `email_key` — приведённые к нижнему регистру копии:
`COLLATE NOCASE` в SQLite понимает только латиницу, а ники у нас
бывают кириллицей.

Коды живут 10 минут, дают 5 попыток, на адрес не больше 6 писем в час.

У аккаунта из Google `password_hash` пустой, а `username` — пустая
строка до знакомства; `username_key` тогда получает служебное
значение `~google:<почта>`, чтобы не нарушать уникальность.
`google_id` хранится с частичным уникальным индексом (NULL-ы не
считаются), поэтому к одной учётной записи Google привязан один
аккаунт сайта.

Старая база пересобирается сама при первом запуске новой версии:
`migrateUsersForGoogle()` добавляет поля и снимает `NOT NULL` с
`username` и `password_hash`, сохраняя `id` и все внешние ссылки.
В логе появится `[db] Аккаунтов пересобрано под вход через Google: N`.

## Развёртывание на VPS

```bash
# nginx раздаёт статику, Express только API
SERVE_STATIC=0 npm start

# или наоборот: Express раздаёт всё
npm start
```

За `nginx` обязательно `proxy_set_header X-Forwarded-For $remote_addr;`,
иначе лимиты запросов посчитают всех одним IP.

**Проксировать нужно и `/auth/`.** Это адреса входа через Google:
по ним браузер ходит редиректом, а не `fetch`, поэтому они живут в
корне, а не под `/api/`. Если `/auth/` не проксировать, nginx отдаст
по этим адресам `index.html` — страница откроется без стилей, а в
консоли посыпятся `Unexpected token '<'` (вместо js приходит HTML).

```nginx
location /auth/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Готовый конфиг целиком — `deploy/nginx-anilingo.conf`.

Проверка после правки (`sudo nginx -t && sudo systemctl reload nginx`):

```bash
curl -sI https://www.anilingo.fun/auth/google | head -3
# должно быть: HTTP/2 302 и Location: https://accounts.google.com/o/oauth2/v2/auth?…
# если видно 200 и text/html — nginx всё ещё отдаёт index.html
```

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
