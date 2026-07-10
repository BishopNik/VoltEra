# Алгоритми додавання, редагування та видалення

Цей проєкт має єдину логіку для CRM-контенту: публічна частина читає дані через API, адмінка змінює ті самі записи через захищені API-запити.

## 1. Додавання

1. Користувач або адміністратор заповнює форму.
2. Frontend збирає поля у JSON.
3. Якщо є фото об'єкта, адмінка спочатку відправляє файл у `/api/uploads` як `dataUrl` і отримує URL файлу.
4. Frontend відправляє `POST /api/{collection}`.
5. Сервер очищає payload через whitelist полів.
6. Сервер додає `_id`, `createdAt`, `updatedAt`.
7. Запис зберігається у MongoDB, якщо задано `MONGODB_URI`, або у `data/db.json` локально.
8. Публічна сторінка при наступному завантаженні читає оновлений список через `GET /api/{collection}`.

Приклади:

- заявка: `POST /api/leads`;
- відгук: `POST /api/reviews`;
- питання: `POST /api/questions`;
- об'єкт: `POST /api/projects`;
- стаття: `POST /api/articles`;
- обладнання: `POST /api/equipment`.

## 2. Редагування

1. Адміністратор відкриває розділ адмінки.
2. Адмінка завантажує записи через `GET /api/{collection}`.
3. Адміністратор змінює поля або відповідь.
4. Frontend відправляє `PATCH /api/{collection}/{id}`.
5. Сервер приймає лише дозволені поля, оновлює `updatedAt`.
6. Запис перезаписується у MongoDB або локальному JSON.
7. Адмінка повторно завантажує список і оновлює лічильники.

Приклади:

- відповідь на відгук: `PATCH /api/reviews/{id}` з `reply` і `status:"published"`;
- відповідь інженера: `PATCH /api/questions/{id}` з `answers` і `status:"answered"`;
- редагування об'єкта: `PATCH /api/projects/{id}`;
- редагування статті: `PATCH /api/articles/{id}`;
- редагування обладнання: `PATCH /api/equipment/{id}`.

## 3. Видалення

1. Адміністратор натискає “Видалити”.
2. Frontend просить підтвердження.
3. Frontend відправляє `DELETE /api/{collection}/{id}`.
4. Сервер перевіряє авторизацію.
5. Запис видаляється з MongoDB або `data/db.json`.
6. Адмінка повторно завантажує список.
7. Публічна сторінка більше не отримує цей запис через API.

## 4. Публікація на сайті

Публічна частина показує тільки опублікований контент:

- `reviews`: тільки `status:"published"`;
- `projects`: `status:"published"` або `status:"active"`;
- `articles`: `status:"published"` або `status:"active"`;
- `equipment`: `status:"published"` або `status:"active"`;
- `questions`: відкриті та відповіді читаються з `/api/questions`.

## 5. Лічильники нових записів

1. Для `leads`, `reviews`, `questions` новий запис отримує `viewedAt:null`.
2. Dashboard читає `/api/dashboard`.
3. Коли адміністратор відкриває розділ, адмінка викликає `POST /api/admin/mark-viewed`.
4. Сервер проставляє `viewedAt`.
5. Лічильник зникає або зменшується.
