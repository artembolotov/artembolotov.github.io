(function () {
  var STORAGE_KEY = 'ym_consent';
  var YM_ID = 102280899;

  function loadMetrika() {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) { return; }
      }
      k = e.createElement(t);
      a = e.getElementsByTagName(t)[0];
      k.async = 1;
      k.src = r;
      a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

    ym(YM_ID, 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true
    });
  }

  function showBanner() {
    var banner = document.createElement('div');
    banner.id = 'ym-consent-banner';
    banner.innerHTML =
      '<div id="ym-consent-inner">' +
      '<p>Сайт использует Яндекс Метрику для анализа трафика. ' +
      '<a href="/privacy/" target="_blank" rel="noopener">Подробнее</a></p>' +
      '<button id="ym-consent-btn">Понятно</button>' +
      '</div>';

    function onReady() {
      document.body.appendChild(banner);
      document.getElementById('ym-consent-btn').addEventListener('click', function () {
        localStorage.setItem(STORAGE_KEY, '1');
        banner.remove();
        loadMetrika();
      });
    }

    if (document.body) {
      onReady();
    } else {
      document.addEventListener('DOMContentLoaded', onReady);
    }
  }

  if (localStorage.getItem(STORAGE_KEY) === '1') {
    loadMetrika();
  } else {
    showBanner();
  }
})();
