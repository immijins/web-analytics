(function () {
  try {
    // 1. currentScript가 없으면 id로 태그를 찾도록 보완
    var currentScript = document.currentScript || document.getElementById('web-analytics-tracker');
    if (!currentScript) return;

    var websiteId = currentScript.getAttribute('data-website-id');
    if (!websiteId) return;

    // 현재 스크립트 도메인 기준으로 API 엔드포인트 설정
    var endpoint = currentScript.src.replace('/tracker.js', '/api/collect');

    var currentViewId = null;
    var startTime = Date.now();

    function trackPageView() {
      // 기존 체류 시간 전송
      if (currentViewId) {
        var duration = Math.round((Date.now() - startTime) / 1000);
        if (duration > 0) {
          var leavePayload = {
            viewId: currentViewId,
            websiteId: websiteId,
            duration: duration
          };
          var blob = new Blob([JSON.stringify(leavePayload)], { type: 'application/json' });
          if (navigator.sendBeacon) navigator.sendBeacon(endpoint, blob);
        }
      }

      // 새 페이지 진입 설정
      currentViewId = 'pv_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      startTime = Date.now();

      var sessionId = sessionStorage.getItem('_sa_sid');
      if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem('_sa_sid', sessionId);
      }

      var urlParams = new URLSearchParams(window.location.search);
      var payload = {
        viewId: currentViewId,
        websiteId: websiteId,
        sessionId: sessionId,
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
        screen: window.screen.width + 'x' + window.screen.height,
        utmSource: urlParams.get('utm_source'),
        utmMedium: urlParams.get('utm_medium'),
        utmCampaign: urlParams.get('utm_campaign'),
        duration: 0
      };

      // API 전송
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(function () {});
    }

    // 첫 진입 시 실행
    trackPageView();

    // SPA 라우팅(pushState) 감지 덮어쓰기
    var originalPushState = history.pushState;
    history.pushState = function () {
      originalPushState.apply(this, arguments);
      trackPageView();
    };

    var originalReplaceState = history.replaceState;
    history.replaceState = function () {
      originalReplaceState.apply(this, arguments);
      trackPageView();
    };

    window.addEventListener('popstate', trackPageView);

    // 탭 이탈 시 체류 시간 업데이트
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && currentViewId) {
        var duration = Math.round((Date.now() - startTime) / 1000);
        if (duration > 0) {
          var blob = new Blob([JSON.stringify({
            viewId: currentViewId,
            websiteId: websiteId,
            duration: duration
          })], { type: 'application/json' });
          if (navigator.sendBeacon) navigator.sendBeacon(endpoint, blob);
        }
      }
    });

  } catch (err) {}
})();