(function () {
    // 스크립트 태그 속성에서 website-id 추출
    var currentScript = document.currentScript;
    var websiteId = currentScript ? currentScript.getAttribute('data-website-id') : null;

    if (!websiteId) {
        console.warn('[Analytics] data-website-id가 지정되지 않았습니다.');
        return;
    }

    // 트래커 도메인 자동 감지
    var endpoint = currentScript.src.replace('/tracker.js', '/api/collect');

    function sendPageView() {
        var payload = {
            websiteId: websiteId,
            path: window.location.pathname + window.location.search,
            referrer: document.referrer || null,
            screen: window.screen.width + 'x' + window.screen.height,
        };

        if (navigator.sendBeacon) {
            var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(endpoint, blob);
        } else {
            fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true,
                credentials: 'omit'
            }).catch(function (err) {
                console.error('[Analytics] Failed to send pageview', error);
            });
        }
    }

    // 첫 진입 시 전송
    sendPageView();

    // SPA 라우트 변경 처리
    var pushState = history.pushState;
    if (pushState) {
        history.pushState = function() {
            pushState.apply(this, arguments);
            sendPageView();
        };
    }

    window.addEventListener('popstate', sendPageView);
})();