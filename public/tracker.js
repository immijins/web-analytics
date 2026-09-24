(function () {
  try {
    var currentScript = document.currentScript;
    if (!currentScript) return;

    var websiteId = currentScript.getAttribute('data-website-id');
    var endpoint = currentScript.src.replace('/tracker.js', '/api/collect');

    var currentViewId = null;
    var startTime = Date.now();

    function trackPageView() {
      // 1. 기존 페이지 체류 시간 처리
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

      // 2. 새 페이지 진입 정보 설정
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

      // 3. 데이터 전송
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(function () {});
    }

    // 첫 페이지 진입 시 전송
    trackPageView();

    // React Router 등 SPA 내부 이동(pushState, replaceState) 감지 덮어쓰기
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

    // 뒤로가기 / 앞으로가기 감지
    window.addEventListener('popstate', trackPageView);

    // 탭 닫기 / 이탈 시 체류 시간 기록
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