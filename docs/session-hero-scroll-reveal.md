# Hero: скролл и наезд следующей секции

Документ фиксирует актуальное решение для мобильного сценария, где высота `.section--hero` больше высоты viewport.

## Проблема

На узком viewport hero выше одного экрана. При исходном `position: sticky; top: 0` следующая секция `#work` начинала визуально наезжать на hero слишком рано: пользователь ещё не дочитал нижнюю часть hero, а `Featured Stories` уже поднималась поверх неё.

## Решение

Hero остаётся sticky во всех режимах. Для высокой hero скрипт считает отрицательный `top`:

```text
--hero-sticky-top = viewportHeight - heroHeight
```

Например, если hero высотой `929px`, а viewport `800px`, итоговый `top` равен `-129px`.

Это даёт нужную механику без переключения слоёв по скроллу:

1. В начале hero находится в нормальной позиции.
2. Пока пользователь скроллит первые `heroHeight - viewportHeight` пикселей, hero уезжает вверх вместе с документом.
3. В момент, когда низ hero совпадает с низом viewport, sticky фиксирует hero на отрицательном `top`.
4. После этого `#work` и `.projects-area`, которые уже остаются слоем выше hero, начинают наезжать поверх неё.

## Реализация

- [`scripts/hero-sticky-behavior.js`](../scripts/hero-sticky-behavior.js)
  - выставляет `data-hero-tall` на `<html>`, если `heroHeight > viewportHeight + 1`;
  - пишет CSS-переменную `--hero-sticky-top`;
  - пересчитывает геометрию через `ResizeObserver`, `window.resize`, `visualViewport.resize` и `document.fonts.ready`;
  - не использует scroll listener и не выставляет `data-hero-past-hero`.
- [`styles/layout.css`](../styles/layout.css)
  - сохраняет `.section--hero.hero { position: sticky; z-index: var(--layer-hero-under); }`;
  - для `html[data-hero-tall] .section--hero.hero` меняет только `top`;
  - оставляет `#work` и `.projects-area` на `var(--layer-after-hero)`.
- [`index.html`](../index.html)
  - подключает `scripts/hero-sticky-behavior.js` с `defer` до `header-theme.js`.

## Почему не z-index фазы

Предыдущая попытка переводила tall hero в `position: relative` и меняла порядок слоёв до/после порога. Это убирало sticky-поведение и не создавало устойчивую фазу фиксации: после порога hero продолжала уезжать вверх, а `#work` фактически оставалась обычным следующим блоком.

Отрицательный sticky `top` решает задачу на уровне layout-механики браузера: порог получается из геометрии самой hero, без отдельного состояния скролла.

## Проверка

Основной регресс-тест: [`tests/smoke/home.hero-reveal.spec.ts`](../tests/smoke/home.hero-reveal.spec.ts).

Проверяемые сценарии:

- `390x800`: hero выше viewport, до порога `#work` ещё не перекрывает hero;
- на пороге низ hero совпадает с низом viewport;
- после порога `#work` наезжает поверх sticky hero;
- на широких viewport hero остаётся обычной `sticky; top: 0`.

Дополнительно после правок нужно проверить, что footer reveal и project sticky transitions не регрессировали.
