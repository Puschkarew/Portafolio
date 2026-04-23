# Отчёт: футер в стиле area17 (reveal под контентом)

**Статус (актуальная эталонная реализация):** это поведение футера — **источник правды** для репозитория; не менять без явной задачи. Регрессии запрещены: см. раздел **Site footer — do not regress** в [AGENTS.md](../AGENTS.md).

**Дата:** 22 апреля 2026  
**Контекст:** реализация плана «Area17-style footer reveal» (без правок самого plan-файла).

## Цель

Сделать так, чтобы футер **не ощущался** как обычный следующий блок в потоке, а **открывался снизу**, пока основной контент визуально остаётся **слой выше** — по аналогии с [area17.com](https://area17.com/) и с паттерном со [CSS-Tricks (sticky footer / sliding)](https://css-tricks.com/creating-sliding-effects-using-sticky-positioning/).

## Реализация

### CSS

1. **Токены слоёв** ([`styles/tokens.css`](../styles/tokens.css), блок 3.6):
   - `--layer-footer-under: 1` — футер под слоем основного контента;
   - `--layer-main: 2` — `main` поверх футера при наложении.

2. **Основной контент** ([`styles/layout.css`](../styles/layout.css)):
   - Селектор `main#main-content.site-main`: `position: relative`, `z-index: var(--layer-main)`, фон `var(--color-surface-page)` (чтобы в промежутках между секциями не «просвечивал» футер).

3. **Футер** (тот же файл, `.section.section--footer.site-footer`):
   - `position: sticky`, `bottom: 0`, `z-index: var(--layer-footer-under)`.

4. **Доступность / якоря**:
   - `scroll-margin-block-start: var(--space-600)` на футере `#contact` и на `#footer-meta` (чтобы клики по навигации к `#contact` / «CV» не прятались под шапку).

### JavaScript

Изменения **не вносились**: [`scripts/header-theme.js`](../scripts/header-theme.js) по-прежнему только выставляет `data-header-theme` на `<html>`. План допускал отсутствие правок HTML/JS.

### HTML

Разметка **не менялась** (у `main` уже был класс `site-main`).

## Тестирование

| Проверка | Результат |
|----------|-----------|
| `npm run lint:quality` (Stylelint + html-validate) | Успех |
| `check-html-structure.mjs`, `check-css-consistency.mjs` | Успех |
| Playwright: `home.visual`, `home.a11y`, `home.token-semantic` (Chromium + Firefox) | Успех |
| **Новый** [`tests/smoke/home.footer-reveal.spec.ts`](../tests/smoke/home.footer-reveal.spec.ts) — слои, `position`/`z-index`, скролл в конец, видимость `.footer__message` на 390 / 1512 / 1920 | Успех |

**Примечание по `home.live-parity`:** прогон против локального HTTP на порту, отличном от занятого, показал падение по метрике `heroOverlapArea` (ожидается `0`, фактически ненулевое пересечение геро-блока на узком вьюпорте). Поведение не связывалось напрямую с правками футера; для регресса по эффекту футера добавлен отдельный smoke `home.footer-reveal.spec.ts`.

**Safari:** в `playwright.config` нет проекта WebKit; ручной проход на Safari рекомендован в [`AGENTS.md`](../AGENTS.md) для визуальных эффектов (в т.ч. `mix-blend-mode` на `.footer__model` в [`styles/components.css`](../styles/components.css)).

## Изменённые и добавленные файлы

- [`styles/tokens.css`](../styles/tokens.css) — переменные `--layer-main`, `--layer-footer-under`.
- [`styles/layout.css`](../styles/layout.css) — слой `main`, sticky-футер, `scroll-margin` для якорей.
- [`tests/smoke/home.footer-reveal.spec.ts`](../tests/smoke/home.footer-reveal.spec.ts) — новый тест.

## Опциональные следующие шаги (не из текущей реализации)

- Микро-`scale` на `main` у нижней зоны скролла (как в п. 5 плана) — с учётом `prefers-reduced-motion`.
- Разобрать стабильность `heroOverlapArea` в `home.live-parity` (например, ожидание `load` / шрифтов / единая среда среза).
