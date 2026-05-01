# Добавить Laptop Illustration В Reference-Секцию

## Summary
Добавить в секцию `Schrift Foundry references` новый первый блок-иллюстрацию из Figma node `2049:16231`, используя локальный ассет `assets/figma/Schrfit Foundry/MM_Laptop_LT-H-03.jpg`. Блок должен стоять перед текущей верхней reference-grid парой, не меняя header/footer и существующие изображения.

## Implementation Changes
- В `src/schrift-foundry.njk` внутри `<section class="case-reference-stack">` добавить новый `<figure>` перед `.case-reference-grid--top`.
- Использовать новый класс, например `.case-reference-illustration`, с `<img>`:
  - `src="{{ "/assets/figma/Schrfit Foundry/MM_Laptop_LT-H-03.jpg" | url }}"`
  - `width="6000"` и `height="4000"`
  - пустой или описательный `alt` по смыслу; если декоративная case-иллюстрация, использовать `alt=""`.
- В `styles/components.css` добавить стили для нового блока по Figma:
  - full-width внутри `.case-reference-stack`;
  - aspect ratio `1464 / 1038`;
  - background `var(--color-orange-500)` или точный `#ff5c00`, если токен совпадает недостаточно;
  - `border-radius: var(--radius-sm)`;
  - `overflow: hidden`;
  - `img` на всю площадь, `object-fit: cover`.
- На мобильных ширинах не добавлять отдельный layout, если существующая `.case-reference-stack` уже даёт full-width поток; сохранить тот же aspect-ratio и radius.

## Test Plan
- Запустить `npm run build`.
- Обновить `http://localhost:8080/schrift-foundry/` в in-app browser.
- Проверить, что новая laptop-иллюстрация появилась первой в reference-секции, перед верхней grid-парой.
- Проверить desktop `1064x993` и mobile viewport: изображение грузится без 404, занимает full-width блока, не ломает отступы между существующими reference-блоками.
- Визуально сравнить с Figma screenshot: оранжевый контейнер/изображение `object-cover`, radius `4px`, высота соответствует `1464/1038`.

## Assumptions
- Figma order является источником истины: `TextIllutstration` добавляется первым элементом контейнера, перед существующими grid-блоками.
- JPG уже лежит в правильной папке и должен использоваться локально, а не через временный Figma asset URL.
- Существующие незакоммиченные изменения в SVG/CSS не откатывать.
