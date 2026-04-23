# Shadow rework — handoff (2026-04-23)

## Goal

Пересобрать тень карточек под веб так, чтобы она выглядела **мягко и “дорого”** на почти однотонных фонах, без **banding/ступенчатости**, без “грязи”, не копируя Figma-слои 1:1. Нужны **несколько рабочих вариантов** + быстрый переключатель для выбора.

## Root cause (почему исходная тень “полосила”)

- Исходно тень была собрана как **очень длинный хвост** из нескольких `box-shadow` слоёв с большими offset’ами и очень низкой opacity. В браузере это часто превращается в **ступени** из‑за композитинга/квантования, особенно на ровном фоне.

## Где сейчас тень в проекте

- Токены: `styles/tokens.css`
  - `--card-shadow` берётся из `--shadow-card-*`.
- Применение: `.card` в `styles/components.css`.

## Ключевые изменения в коде (уже внедрено)

### 1) DOM: клиппинг контента отделён от тени

Чтобы мягкие слои могли рисоваться **снаружи** карточки, а контент внутри оставался clipped:

- `.card` теперь `overflow: visible;` и может иметь псевдо-слои “наружу”.
- Контент карточки обёрнут в `.card__clip` (`overflow: hidden; border-radius: ...; z-index: 1;`).

Файл: `index.html` — практически все карточки теперь:

```html
<article class="card ...">
  <div class="card__clip">
    <div class="card__media ...">…</div>
    <div class="card__tag">…</div>
  </div>
</article>
```

### 2) Shadow lab UI: переключатель пресетов в вёрстке

- Файл: `index.html`
- Панель: `.shadow-switch` с radio A–F (без JS).
- Переключение реализовано через `html:has(#shadow-variant-*:checked)` в `styles/components.css`.

### 3) Пресеты сведены в токены

Файл: `styles/tokens.css`

- Цвет: `--shadow-card-color: 2 10 69;`
- Контакт: `--shadow-card-contact`
- Пресеты `--shadow-card-preset-a` … `--shadow-card-preset-f`

### 4) Card ambient / underlay слои

Файл: `styles/components.css`

- `.card::before` = ambient слой (градиент + blur) настраивается через CSS vars:
  - `--card-ambient-bg`, `--card-ambient-blur`, `--card-ambient-opacity`, etc.
- `.card::after` = CATK-like underlay (blurred gradient underlay), включается только на пресете F.

## Важный баг, который проявлялся как “теней нет”

Симптом: “Не вижу разницы, теней как будто нет”.

Причина: попытка писать `rgba(var(--shadow-card-color), 0.18)` при `--shadow-card-color: 2 10 69;` **невалидна** для legacy `rgba()` → браузер сбрасывал `box-shadow` в `none`.

Фикс: переход на валидный синтаксис CSS Color 4:

- `rgb(var(--shadow-card-color) / 0.18)`

Проверка была сделана через Playwright: computed `box-shadow` для A/B/D/E до фикса был `none`, после фикса стал корректным.

## Presets (текущее состояние)

Переключаются радиокнопками внизу страницы (Shadow A–F).

- **A**: layered `box-shadow` (negative spread style)
- **B**: Hybrid-B: contact `box-shadow` + shaped ambient (через `::before`)
- **C**: radial ambient + blur (через `::before`), “воздушная подушка”
- **D**: Stripe-like (2 больших слоя `box-shadow`, tinted)
- **E**: Material/Tailwind-like (компактный 2-step `box-shadow`)
- **F (CATK-like)**: contact `box-shadow` + отдельный **blurred gradient underlay** (`.card::after`) по мотивам `catk.de` (`base-media-gradient__content`).

## CATK исследование (что важно)

На `https://catk.de/` эффект вокруг медиа делается **не** `box-shadow` на `IMG/VIDEO`, а отдельным слоем:

- `div.base-media-gradient__content ...`
  - `background-image: data-uri SVG linearGradient`
  - `filter: blur(128px)`
  - `position: absolute`
  - `z-index: -1`

У `IMG.magic-image` и `VIDEO.magic-player-video` computed `box-shadow: none`.

В нашем проекте это отражено пресетом **F** (underlay слой).

## Artifacts / evidence

Скриншоты сравнения (локальные):

- `artifacts/shadow-lab-v2/*-cards.png` / `*-cards-fixed.png`
- CATK: `artifacts/catk-figure.png` (видно мягкое “поле” вокруг медиа)

## Quality gates

Линты прогонялись и должны быть зелёные:

- `npm run lint:quality`

## Open decisions / what next agent should do

1) **Выбор финального пресета** (скорее всего B или F, зависит от вкуса: F более “CATK-ish” и может быть слишком цветным).
2) Если выбран финал: выполнить gate из плана — **удалить панель** и `html:has(...)` ветки, оставить один продакшн-набор токенов.
3) (Опционально) Для F: сделать “CATK-like, but calmer” — тот же underlay принцип, но **менее цветной** (например, в одном hue вокруг `--shadow-card-color`).

