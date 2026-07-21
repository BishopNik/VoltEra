# Google Search Console для Voltares

## Підтвердження домену

1. У Search Console обрати **Add property → Domain**.
2. Ввести `voltares.pp.ua` без протоколу та шляху.
3. Скопіювати TXT-запис Google у DNS-панель домену, дочекатися оновлення DNS і натиснути **Verify**. Domain property через DNS — рекомендований основний спосіб, бо охоплює HTTPS, HTTP, www і всі піддомени.
4. Змінна `GOOGLE_SITE_VERIFICATION` підтримує додаткове підтвердження HTML meta tag. У неї потрібно вставляти лише значення `content`, без усього HTML-тега. Якщо змінна порожня, тег не генерується.

## Sitemap та перша індексація

1. Відкрити **Sitemaps** і надіслати `https://www.voltares.pp.ua/sitemap.xml`.
2. Переконатися, що статус sitemap — `Success`, а кількість знайдених URL приблизно відповідає публічним сторінкам сайту.
3. Через **URL Inspection** перевірити головну сторінку.
4. Перевірити 3–5 важливих товарів, зокрема моделі 6, 8 і 12 кВт, а також сторінки `/categories/inverters`, `/categories/batteries` і `/calculators.html`.
5. Запитувати індексацію лише для нових або суттєво оновлених пріоритетних сторінок. Масові повторні запити не прискорюють обхід.

## Регулярна перевірка

- **Pages**: причини `Crawled — currently not indexed`, `Duplicate`, `Not found`, `Blocked by robots.txt`.
- **Sitemaps**: помилки читання й різкі зміни кількості URL.
- **Core Web Vitals**: мобільні та desktop-групи URL.
- **Enhancements / Shopping**: помилки Product, Breadcrumb і FAQ structured data.
- **Performance → Search results**: запити, сторінки, країна Україна/Польща, пристрій, покази, кліки, CTR і середня позиція.

Щомісяця потрібно експортувати запити з високими показами та низьким CTR або позицією 5–20. Їх заносять у [seo-query-clusters.md](./seo-query-clusters.md), групують за наміром і використовують для покращення категорій, товарів, FAQ та статей. Окремо раз на місяць перевіряють помилки індексації й 404.

Search Console API на цьому етапі не підключений: для нього потрібні окремий Google Cloud проєкт, OAuth/service account і явне рішення щодо доступів.
