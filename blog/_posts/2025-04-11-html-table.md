---
title: "Sticky header в html таблице"
description: "Всё дело в шапке"
---

Не&nbsp;думал, что в&nbsp;2025 мне понадобятся таблицы на&nbsp;сайте, как и&nbsp;ручная вёрстка при наличии нейросетей. Но&nbsp;есть у&nbsp;html-таблиц очень полезное свойство: при увеличении ширины ячейки становится шире весь столбец.

![Красота: столбец сам тянется под содержимое](/blog/img/2025-04-11-html-table/20250408_184100.gif)
*Столбец &laquo;Сompaund&raquo; растёт по&nbsp;ширине, когда цены растут*

В&nbsp;одном из&nbsp;моих проектов нужно было именно такое поведение. При этом хотелось зафиксировать шапку, чтобы при прокрутке она всегда оставалась наверху.

```css
thead th {
    position: sticky;
    top: 0;
}
```

И&nbsp;вот тут начались сюрпризы не&nbsp;в&nbsp;виде торта...

![Текст заголовка остался, а&nbsp;оформление уехало](/blog/img/2025-04-11-html-table/20250408_184620.gif)
*Текст заголовка остался, а&nbsp;оформление уехало*

Добавим *background-color* и&nbsp;посмотрим, что будет теперь.

```css
thead th {
    position: sticky;
    top: 0;
    background-color: white;
}
```

![Третья gif](/blog/img/2025-04-11-html-table/20250408_184644.gif)
*Границы заголовка некрасиво &laquo;рвутся&raquo; при прокрутке*

Оказалось, это достаточно известная проблема и&nbsp;есть изящное (как мне казалось) решение: добавить к&nbsp;ячейкам заголовка псевдоклассы *:before* и *:after*, применив к&nbsp;ним определённую комбинацию свойств и&nbsp;покрасив границы.

```css
th:after, th:before {
    content: &rsquo;&rsquo;;
    position: absolute;
    top: 0;
    height: 100%;
    width: 100%;
}

th:after {
    right: -1px;
    border-right: 1px solid #ddd;
    bottom: -1px;
    border-bottom: 1px solid #ddd;
}

th:before {
    left: -1px;
    border-left: 1px solid #ddd;
    top: -1px;
    border-top: 1px solid #ddd;
}
```

![четвертая gif](/blog/img/2025-04-11-html-table/20250408_184710.gif)
*Границы шапки не&nbsp;уезжают, но&nbsp;не&nbsp;совпадают с&nbsp;границами таблицы*

Можно продолжит костылить, но&nbsp;особенность в&nbsp;том, что проблемы нет, если поменять стиль границ таблицы:

```css
table {
    border-collapse: collapse;
}
```

Правда появились двойные границы ячеек, что тоже не&nbsp;очень подходит.

![Пятая gif](/blog/img/2025-04-11-html-table/20250408_184927.gif)
*Шапка не&nbsp;рвётся, но&nbsp;теперь таблица выглядит не&nbsp;очень модно*

```css
table {
    border-collapse: collapse;
}
```

Убираем интервалы между ячейками и&nbsp;получаем красивую таблицу с&nbsp;толстыми границами (1px + 1px = 2px).

```css
table {
    border-spacing: 0;
}
```

![Шестая gif](/blog/img/2025-04-11-html-table/20250408_184947.gif)
*Двойные ~~стандарты~~ границы*

Кстати, если поставить ширину линии 0.5px, проблему мы&nbsp;решим, но&nbsp;только на&nbsp;дисплеях retina. Поэтому попробуем другой способ, который пришёл, можно сказать, во&nbsp;сне: покрасим границы выборочно. Но&nbsp;так, чтобы в&nbsp;сумме покрасить всю таблицу. Пока (для наглядности) разными цветами:

```css
table {
    border-left: 1px solid red;
}

thead th {
    background-color: white;
    border-top: 1px solid green;
}

th, td {
    border-right: 1px solid blue;
    border-bottom: 1px solid orange;
}
```

![Седьмая gif](/blog/img/2025-04-11-html-table/20250408_185609.gif)
*Идеальные границы, хоть и&nbsp;весёлые*

А&nbsp;теперь одним:

```css
table {
    border-left: 1px solid #ddd;
}

thead th {
    background-color: white;
    border-top: 1px solid #ddd;
}

th, td {
    border-right: 1px solid #ddd;
    border-bottom: 1px solid #ddd;
}
```

![Восьмая gif](/blog/img/2025-04-11-html-table/20250408_185627.gif)
*Идеальная таблица*

Всё, теперь с&nbsp;чувством душевного спокойствия переходим к&nbsp;следующей задаче.