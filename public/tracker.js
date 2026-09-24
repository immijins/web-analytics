(function () {
  try {
    var currentScript = document.currentScript;
    if (!currentScript) return;

    var websiteId = currentScript.getAttribute('data-website-id');
    if (!websiteId) return;

    // API 엔드포인트 생성
    var endpoint = currentScript.src.replace('/tracker.js', '/api/collect');

    function sendPageView() {
      try {
        var payload = {
          websiteId: websiteId,
          path: window.location.pathname + window.location.search,
          referrer: document.referrer || null,
          screen: window.screen.width + 'x' + window.screen.height,
        };

        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

        if (navigator.sendBeacon) {
          navigator.sendBeacon(endpoint, blob);
        } else {
          fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
            credentials: 'omit',
          }).catch(function () {});
        }
      } catch (e) {}
    }

    // 메인 스레드 렌더링을 방해하지 않도록 약간의 지연 후 실행
    if (document.readyState === 'complete') {
      setTimeout(sendPageView, 100);
    } else {
      window.addEventListener('load', function () {
        setTimeout(sendPageView, 100);
      });
    }

    // SPA 페이지 이동 감지 (안전한 popstate 전용)
    window.addEventListener('popstate', function () {
      setTimeout(sendPageView, 100);
    });
  } catch (err) {}
})();