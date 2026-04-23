# Sticky backgrounds — worklog (2026-04-23)

## Контекст

Задача: сделать смену project background **scrubbable по скроллу** (можно остановиться на 30%, быстрее прокрутить — быстрее завершить), убрать ранние/рывковые переключения при sticky, и устранить видимый **стык/шов** между блоками во время кроссфейда.

## Итоговое поведение (desktop ≥1024px)

- **Fade window**: последние **50vh** до момента, когда следующий `.section-header` доезжает до `top: 0`.
- **Scrubbed**: opacity меняется только от скролла (без time-based transitions):
  - фон (background stage layers)
  - header artwork + Odds shader
  - цвет текста upcoming секции
  - header theme (`data-header-theme`) синхронизирован с фейдом (доминирующий слой)
- **Artwork push-off**: текущий арт дополнительно “выталкивается” вверх через `translateY` на протяжении **100vh** (для надёжности, чтобы не оставался “залипшим” в предыдущей секции).
- **Устранение шва**: добавлен `feather` overlay поверх background stage, который пиково включается в середине перехода.

## Причины проблем “trigger then done” (что было исправлено)

- Логика кроссфейда раньше не работала ожидаемо, потому что при наличии sticky header происходил ранний выход, и background/art могли выглядеть как “сработал триггер и всё”.
- Time-based CSS transitions (`transition: opacity ...`) делали scrub “вязким” и похожим на таймер, а не на скролл.
- Цвета текста пытались смешиваться через CSS custom properties (`--section-accent` и т.п.), но `getComputedStyle(...).getPropertyValue('--section-accent')` часто возвращает `var(...)`, поэтому blend не работал.

## Реализация (что сделано)

### 1) Scroll-linked фейд 50vh и push-off арта 100vh

Файл: `scripts/project-sticky-background.js`

- `tFade` считается по `innerHeight * 0.5`
- `tPush` считается по `innerHeight * 1.0`
- Background layers: current `1 - tFade`, upcoming `tFade`
- Art opacity: current `1 - tFade`, upcoming `tFade`
- Art translate: текущая секция получает `--project-art-translate-y` (negative translate по `tPush`)

### 2) Полное отключение time-based transitions для scrub

Файлы:
- `styles/layout.css`: `.project-background-layer { transition: none; }`
- `styles/components.css`: для `.section-header__art` и `.section--odds__shader` `transition: none;`

Также убраны `.is-active` правила, которые форсили opacity в `1` и конфликтовали с переменной `--project-art-opacity`.

### 3) Цвет текста upcoming секции до/во время анимации

Файл: `scripts/project-sticky-background.js`

- Кэшируем **реальные computed `color`** у элементов:
  - `.section-header__content .section-title` (headline)
  - `.section-header__content .type-body-lg.section-title` (description)
  - `.section-header__meta` (tags)
- До окна (когда `tFade = 0`) upcoming секция выглядит как текущая.
- В окне — линейный RGB-blend до собственных цветов.

### 4) Header theme sampler синхронизирован с fade

Файл: `scripts/project-sticky-background.js`

- `data-header-theme` переключается по доминирующему слою (`tFade >= 0.5`).

### 5) Soft seam / feather overlay (градиентный “смягчитель стыка”)

Файлы:
- `index.html`: добавлен `<div class="project-background-feather"></div>` внутри `.project-background-stage`
- `styles/layout.css`: стили overlay + градиент + `--project-feather-opacity`
- `scripts/project-sticky-background.js`: `--project-feather-opacity` вычисляется как:
  - `strength = 4 * tFade * (1 - tFade)` (пик на `tFade = 0.5`)
  - `opacity = strength * FEATHER_MAX` (сейчас `FEATHER_MAX = 0.16`)

## Изменённые файлы (в этом чате)

- `index.html`
- `styles/layout.css`
- `styles/components.css`
- `scripts/project-sticky-background.js`

## Как проверять

Desktop (≥1024px):

- Медленно докрутить до последних ~50vh перед следующим sticky:
  - фон/арт/текст/тема должны плавно “скрабиться” скроллом и останавливаться на промежуточных значениях
- Перескроллить быстро:
  - переход должен “быстро” завершаться, без запаздывания
- Проверить, что арт **не остаётся “вверх приклеенным”** к предыдущей секции и продолжает уходить в течение ~100vh.
- Проверить, что “шов” между блоками стал менее заметным (feather включается в середине перехода).

## Тюнинг-параметры (если нужно)

- **Feather strength**: `FEATHER_MAX` в `scripts/project-sticky-background.js`
- **Feather band position/width**: проценты в `linear-gradient(...)` у `.project-background-feather` в `styles/layout.css`
- **Art push distance**: `pushDistancePx = innerHeight * 0.35` в `scripts/project-sticky-background.js`

