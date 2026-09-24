(function () {
  try {
    // tracker.js를 불러온 script 태그 찾기
    var currentScript = document.querySelector(
      'script[data-website-id]'
    );

    if (!currentScript) return;

    var websiteId = currentScript.getAttribute('data-website-id');

    if (!websiteId) return;

    // tracker.js가 올라가 있는 Next.js 서버의 API 주소
    var endpoint = new URL(
      '/api/collect',
      currentScript.src
    ).href;

    var lastPath = null;

    // 페이지뷰 전송
    function sendPageView() {
      try {
        var path =
          window.location.pathname +
          window.location.search;

        // 같은 URL 중복 전송 방지
        if (path === lastPath) return;

        lastPath = path;

        var payload = {
          websiteId: websiteId,
          path: path,
          referrer: document.referrer || null,
          screen:
            window.screen.width +
            'x' +
            window.screen.height,
        };

        var body = JSON.stringify(payload);

        // 페이지 종료/이동 상황에서도 전송하기 위해 sendBeacon 사용
        if (navigator.sendBeacon) {
          var blob = new Blob([body], {
            type: 'application/json',
          });

          navigator.sendBeacon(endpoint, blob);
        } else {
          fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: body,
            keepalive: true,
          }).catch(function () {});
        }
      } catch (error) {
        console.error('[Web Analytics]', error);
      }
    }

    // 최초 페이지뷰
    function init() {
      sendPageView();
    }

    if (document.readyState === 'complete') {
      setTimeout(init, 100);
    } else {
      window.addEventListener(
        'load',
        function () {
          setTimeout(init, 100);
        },
        { once: true }
      );
    }

    // -----------------------------
    // SPA 페이지 이동 감지
    // -----------------------------

    var originalPushState = history.pushState;
    var originalReplaceState = history.replaceState;

    history.pushState = function () {
      originalPushState.apply(history, arguments);

      setTimeout(function () {
        sendPageView();
      }, 100);
    };

    history.replaceState = function () {
      originalReplaceState.apply(history, arguments);

      setTimeout(function () {
        sendPageView();
      }, 100);
    };

    // 뒤로가기 / 앞으로가기
    window.addEventListener('popstate', function () {
      setTimeout(function () {
        sendPageView();
      }, 100);
    });
  } catch (error) {
    console.error('[Web Analytics] Tracker Error:', error);
  }
})();