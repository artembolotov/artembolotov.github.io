---
title: "Как я&nbsp;перешёл с&nbsp;Google Analytics на&nbsp;Яндекс.Метрику"
description: "И&nbsp;почему пришлось это сделать"
tags: [webdev]
image: /blog/img/2025-05-30-goodbye-ga/migrate.png
---

![Уходим с GA](/blog/img/2025-05-30-goodbye-ga/migrate.png)

С&nbsp;1&nbsp;июля 2024 года вступили в&nbsp;силу изменения в&nbsp;законодательстве, которые ограничивают использование Google Analytics для российских сайтов. Расскажу, как перенёс аналитику на&nbsp;Яндекс.Метрику и&nbsp;настроил всё правильно с&nbsp;точки зрения защиты персональных данных.

## Почему пришлось уходить

Новые требования ограничивают передачу данных российских пользователей в&nbsp;страны, которые не&nbsp;обеспечивают должный уровень защиты персональных данных. Google Analytics хранит всё на&nbsp;серверах в&nbsp;США, что теперь создаёт правовые риски.

Выбор простой: или переходим на&nbsp;отечественные решения, или готовимся к&nbsp;возможным штрафам.

## Что понадобится

Для миграции нужно:
- Аккаунт в&nbsp;Яндексе
- Доступ к&nbsp;коду сайта
- Понимание, где сейчас установлен Google Analytics

## Создание счётчика

Процесс довольно простой:

1. Заходим на&nbsp;[metrika.yandex.ru](https://metrika.yandex.ru/){:target="_blank"}
2. Нажимаем &laquo;Добавить счётчик&raquo;
3. Указываем адрес сайта
4. Получаем код

Но&nbsp;не&nbsp;спешите его сразу устанавливать.

## Правильная установка с&nbsp;учётом GDPR

Главное правило&nbsp;&mdash; счётчик должен запускаться только после явного согласия пользователя на&nbsp;использование cookies.

### Базовый код

```html
<!-- Yandex.Metrika counter -->
<script type="text/javascript">
   (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) {
         if (document.scripts[j].src === r) { return; }
      }
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
   })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

   window.yaCounterInit = false;
</script>
<!-- /Yandex.Metrika counter -->
```

### Логика запуска

```javascript
const initYandexMetrika = function() {
    if (typeof ym !== 'undefined' && !window.yaCounterInit) {
        ym(12345678, "init", {
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: true
        });
        window.yaCounterInit = true;
    }
}

// Проверяем сохранённое согласие
if (localStorage.getItem('cookies_accepted')) {
    initYandexMetrika();
} else {
    document.getElementById('cookie-banner').style.display = 'block';
}

// Обработка согласия
document.getElementById('accept-cookies').addEventListener('click', function() {
    localStorage.setItem('cookies_accepted', 'true');
    document.getElementById('cookie-banner').style.display = 'none';
    initYandexMetrika();
});
```

![Баннер согласия](/blog/img/2025-05-30-goodbye-ga/screenlines-banner.png)
*Простой баннер внизу экрана*

## Важный момент про noscript

Яндекс.Метрика предлагает добавить такой код для пользователей без JavaScript:

```html
<!-- Не используйте это -->
<noscript>
  <div><img src="https://mc.yandex.ru/watch/12345678" style="position:absolute; left:-9999px;" alt="" /></div>
</noscript>
```

Проблема в&nbsp;том, что эта картинка загружается всегда, даже когда пользователь не&nbsp;давал согласия. Это нарушение принципа информированного согласия. Просто не&nbsp;добавляйте этот код.

## Настройка параметров

Рекомендуемые настройки:

```javascript
ym(12345678, "init", {
    clickmap: true,           // Карта кликов
    trackLinks: true,         // Отслеживание внешних ссылок
    accurateTrackBounce: true,// Точный показатель отказов
    webvisor: false,          // Лучше отключить для соблюдения GDPR
    ecommerce: "dataLayer"    // Для интернет-магазинов
});
```

## Частые проблемы

### Данные не&nbsp;поступают

**Блокировщики рекламы.** AdBlock и&nbsp;подобные расширения блокируют счётчики. Для тестирования временно отключите их.

**Проблемы с&nbsp;геолокацией.** Если ваш трафик идёт через зарубежные серверы (корпоративная сеть, спутниковый интернет), Метрика может некорректно определять местоположение.

**Режим инкогнито.** В&nbsp;приватном режиме localStorage работает только до&nbsp;закрытия окна.

### Проверка работы

1. Откройте консоль разработчика (F12)
2. Перейдите на&nbsp;вкладку Network
3. Введите в&nbsp;фильтр `mc.yandex`
4. Обновите страницу и&nbsp;дайте согласие
5. Проверьте, что запросы отправляются

![Консоль разработчика](/blog/img/2025-05-30-goodbye-ga/dev_tool.png)

## Перенос целей

Если использовали цели в&nbsp;Google Analytics, их&nbsp;нужно адаптировать:

```javascript
// Google Analytics
gtag('event', 'purchase', {
    value: 1000,
    currency: 'RUB'
});

// Яндекс.Метрика
ym(12345678, 'reachGoal', 'purchase', {
    order_price: 1000,
    currency: 'RUB'
});
```

## Чек-лист после миграции

- Удалён код Google Analytics
- Установлена Яндекс.Метрика
- Настроен запуск после согласия
- Удалён noscript-код
- Проверена работа в&nbsp;разных браузерах
- Обновлена политика конфиденциальности
- Перенесены важные цели

## Итог

Переход на&nbsp;Яндекс.Метрику&nbsp;&mdash; вынужденная, но&nbsp;не&nbsp;такая уж&nbsp;страшная мера. Основной функционал похож, есть свои интересные возможности вроде карты скроллинга и&nbsp;аналитики форм. Главное&nbsp;&mdash; правильно настроить с&nbsp;учётом требований о&nbsp;защите персональных данных.