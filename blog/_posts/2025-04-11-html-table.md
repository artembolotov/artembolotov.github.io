---
title: "Sticky header в html таблице"
description: "Проблема и решение"
draft: true
---

Есть у html-таблиц очень полезное качество: при увеличении ширины ячейки станет шире весь столбец.

![Красота: столбец сам тянется под содержимое](/blog/img/2025-04-11-html-table/20250408_184100.gif)
*Столбец сompaund растёт по ширине, когда цены растут*

В одном из моих проектов нужно было именно такое поведение. При этом хотелось зафиксировать шапку, чтобы при прокрутке она всегда оставалась наверху.

```css
thead th {
  position: sticky;
  top: 0;
}
```

И вот тут начались неожиданности...

![Текст заголовка остался, а оформление уехало](/blog/img/2025-04-11-html-table/20250408_184620.gif)
*Текст заголовка остался, а оформление уехало*

Добавим background-color и посмотрим, что будет теперь.

```css
thead th {
    position: sticky;
    top: 0;
    background-color: white;
}
```

![Третья gif](/blog/img/2025-04-11-html-table/20250408_184644.gif)
*Границы заголовка некрасиво "рвутся" при прокрутке*

Оказалось, это достаточно известная проблема и есть изящное (как мне казалось) решение: добавить к ячейкам заголовка псевдоклассы :before и :after, применив к ним определённую комбинацию свойств и покрасив границы.

```css
th:after, th:before {
    content: '';
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

![Пятая gif](/blog/img/2025-04-11-html-table/20250408_184927.gif) 

![Шестая gif](/blog/img/2025-04-11-html-table/20250408_184947.gif)

![Седьмая gif](/blog/img/2025-04-11-html-table/20250408_185609.gif)

![Восьмая gif](/blog/img/2025-04-11-html-table/20250408_185627.gif)

