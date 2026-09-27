(function () {
  try {
    var currentScript = document.querySelector('script[data-website-id]');
    if (!currentScript) return;

    var websiteId = currentScript.getAttribute('data-website-id');
    if (!websiteId) return;

    var endpoint = new URL('/api/collect', currentScript.src).href;

    var lastPath = null;
    var startTime = Date.now();
    var currentViewId = null;
    var maxScrollPercentage = 0;

    // 세션 ID 발급 (30분 단위 유지 또는 브라우저 세션)
    function getSessionId() {
      var sid = sessionStorage.getItem('_analytics_sid');
      if (!sid) {
        sid = 's_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem('_analytics_sid', sid);
      }
      return sid;
    }

    // 스크롤 깊이 측정
    function updateScrollDepth() {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var windowHeight = window.innerHeight;
      var docHeight = document.documentElement.scrollHeight;
      if (docHeight > windowHeight) {
        var scrollPercent = Math.round((scrollTop + windowHeight) / docHeight * 100);
        if (scrollPercent > maxScrollPercentage) {
          maxScrollPercentage = Math.min(scrollPercent, 100);
        }
      }
    }
    window.addEventListener('scroll', updateScrollDepth, { passive: true });

    // 페이지 체류시간 및 데이터 전송
    function sendPageView(isUpdate) {
      try {
        var path = window.location.pathname + window.location.search;
        if (!isUpdate && path === lastPath) return;

        var now = Date.now();
        var duration = Math.round((now - startTime) / 1000);

        // URL Query 파라미터에서 UTM 및 검색어 파싱
        var urlParams = new URLSearchParams(window.location.search);

        var payload = {
          websiteId: websiteId,
          sessionId: getSessionId(),
          path: path,
          referrer: document.referrer || null,
          screen: window.screen.width + 'x' + window.screen.height,
          duration: duration,
          maxScroll: maxScrollPercentage,
          utmSource: urlParams.get('utm_source') || urlParams.get('query') || urlParams.get('q'),
          utmMedium: urlParams.get('utm_medium'),
          utmCampaign: urlParams.get('utm_campaign'),
          utmTerm: urlParams.get('utm_term'),
        };

        var body = JSON.stringify(payload);

        if (navigator.sendBeacon) {
          var blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon(endpoint, blob);
        } else {
          fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'omit',
            body: body,
            keepalive: true,
          }).catch(function () {});
        }

        if (!isUpdate) {
          lastPath = path;
          startTime = Date.now();
          maxScrollPercentage = 0;
        }
      } catch (error) {
        console.error('[Web Analytics]', error);
      }
    }

    // 최초 실행
    function init() {
      sendPageView(false);
    }

    if (document.readyState === 'complete') {
      setTimeout(init, 100);
    } else {
      window.addEventListener('load', function () { setTimeout(init, 100); }, { once: true });
    }

    // 페이지 이탈 / 탭 전환 시 체류시간 전송
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        sendPageView(true);
      }
    });

    // SPA 이동 감지
    var originalPushState = history.pushState;
    var originalReplaceState = history.replaceState;

    history.pushState = function () {
      sendPageView(true); // 이전 페이지 체류시간 업로드
      originalPushState.apply(history, arguments);
      setTimeout(function () { sendPageView(false); }, 100);
    };

    history.replaceState = function () {
      sendPageView(true);
      originalReplaceState.apply(history, arguments);
      setTimeout(function () { sendPageView(false); }, 100);
    };

    window.addEventListener('popstate', function () {
      sendPageView(true);
      setTimeout(function () { sendPageView(false); }, 100);
    });

    // custom 이벤트 추적 함수 노출 (선택사항)
    window.trackEvent = function (eventName, eventData) {
      var eventEndpoint = new URL('/api/event', currentScript.src).href;
      var payload = {
        websiteId: websiteId,
        sessionId: getSessionId(),
        eventName: eventName,
        path: window.location.pathname,
        eventData: eventData || {}
      };
      if (navigator.sendBeacon) {
        navigator.sendBeacon(eventEndpoint, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      }
    };

  } catch (error) {
    console.error('[Web Analytics] Tracker Error:', error);
  }
})();