# Аналітика Voltares

## Архітектура

`analytics.js` — єдиний first-party data layer. Google Tag завантажується з Consent Mode і `analytics_storage: denied`, а модуль лише після згоди передає події в GA4 та Microsoft Clarity. Помилки, блокування скриптів або AdBlock не впливають на форми й основні функції.

Конфігурація генерується сервером у `/analytics-config.js` із середовища. Ідентифікатори не зберігаються в Git. До натискання **«Прийняти аналітику»** Google Tag працює без аналітичних cookies і без `page_view`, а Clarity не завантажується. Рішення зберігається локально; кнопка **«Налаштування cookies»** дозволяє змінити його. Поля форм автоматично отримують `data-clarity-mask="true"`.

## Події

| Подія | Система | Тригер | Безпечні параметри | Конверсія | Де | Перевірка |
|---|---|---|---|---|---|---|
| `view_item` | GA4 + Clarity | завантаження товару | `product_slug`, `product_category`, `page_type` | ні | `/products/*` | GA4 DebugView, Clarity custom events |
| `view_item_list` | обидві | каталог або категорія | `page_type` | ні | каталог, категорії | DebugView |
| `select_item` | обидві | вибір картки | `product_slug` | ні | каталог, головна | DebugView |
| `view_search_results` | GA4 | завершення введення пошуку | лише `search_term_length` | ні | каталог | DebugView |
| `article_view`, `faq_view`, `calculator_view` | обидві | відповідна сторінка | `page_type` | ні | контент | DebugView |
| `open_product_modal` | обидві | відкриття картки | `product_slug` | ні | каталог, головна | DebugView / Clarity |
| `view_full_product_page` | обидві | повна сторінка товару | товарний контекст | ні | товари | DebugView |
| `related_product_click` | обидві | пов’язана модель | `product_slug` | вторинна | товари | DebugView |
| `product_image_click` | обидві | фото товару | товарний контекст | ні | товари, каталог | DebugView |
| `form_start` | обидві | перший фокус у формі | `form_name` | ні | усі форми | DebugView / Clarity |
| `form_submit` | обидві | API підтвердив заявку | тип форми/товару | основна | форми лідів | Realtime / Clarity |
| `form_error` | обидві | HTTP або network error | `error_type`, без тексту форми | ні | форми лідів | DebugView |
| `generate_lead` | обидві | успішне створення ліда | `lead_type`, `product_slug`, `form_name` | **основна** | форми лідів | Realtime, DebugView |
| `request_consultation` | обидві | CTA або успішна консультація | `cta_location` / тип ліда | **основна** | сайт | DebugView |
| `request_quote` | обидві | успішний запит товару | `product_slug` | **основна** | каталог | DebugView |
| `phone_click` | обидві | `tel:` | `link_location` | **основна** | сайт | Realtime / Clarity |
| `email_click` | обидві | `mailto:` | сторінковий контекст | ні | сайт | DebugView |
| `telegram_click`, `viber_click`, `whatsapp_click` | обидві | месенджер | сторінковий контекст | **основна** | сайт | Realtime / Clarity |
| `calculator_start` | обидві | перша взаємодія | `calculator_type` | ні | калькулятори | DebugView |
| `calculator_complete` | обидві | зміна завершена | `calculator_type`, `result_range` | вторинна | калькулятори | DebugView / Clarity |
| `calculator_cta_click` | обидві | CTA після розрахунку | `calculator_type` | вторинна | калькулятори | DebugView |
| `engaged_catalog` | обидві | перегляд трьох різних товарів | `products_viewed` | вторинна | каталог, головна | DebugView |
| `article_product_click` | обидві | перехід зі статті на товар | `product_slug` | вторинна | статті | DebugView |
| `contact_view` | обидві | перехід до контактного блоку | `trigger` | вторинна | сайт | DebugView |

Подія `download_product_document` автоматично спрацює для посилань на PDF, коли в картках з’являться реальні інструкції. Наразі таких посилань немає. Імена, телефони, email, місто й повідомлення відкидаються data layer та не передаються провайдерам.

## Рекомендовані key events у GA4

Позначити як key event: `generate_lead`, `phone_click`, `telegram_click`, `viber_click`, `whatsapp_click`. `request_consultation` і `request_quote` варто залишити допоміжними подіями, щоб одна форма не рахувалася двома конверсіями поряд із `generate_lead`. `calculator_complete` також залишається вторинним сигналом, доки не буде перевірена його кореляція з продажами.

## Налаштування Vercel

У **Project → Settings → Environment Variables** додати окремо для Production (і за потреби Preview):

```text
PUBLIC_SITE_URL=https://www.voltares.pp.ua
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GOOGLE_SITE_VERIFICATION=значення_content_із_meta_tag
CLARITY_PROJECT_ID=xxxxxxxxxx
ANALYTICS_DEBUG=false
```

Після зміни виконати новий deployment. Для preview можна встановити `ANALYTICS_DEBUG=true`, але не використовувати production GA4 property, якщо тестові перегляди не мають потрапляти у звіти.

## Перевірка

1. Відкрити сайт у приватному вікні: до згоди не повинно бути запитів до Google Analytics або Clarity.
2. Прийняти аналітику. У Network має з’явитися один GA4 та один Clarity loader.
3. Для GA4 відкрити **Reports → Realtime** і **Admin → DebugView**. На preview з `ANALYTICS_DEBUG=true` події також логуються в console без персональних даних.
4. Відкрити товар, каталог, калькулятор і відправити тестову заявку. Перевірити назви та безпечні параметри.
5. У Clarity відкрити **Recordings / Dashboard**, перевірити custom events і переконатися, що всі поля форм замасковані.
6. Відхилити аналітику через налаштування cookies і переконатися після reload, що зовнішні скрипти не завантажуються.

Реальну працездатність GA4 і Clarity можна підтвердити лише після встановлення production ID та перевірки на production-домені.
