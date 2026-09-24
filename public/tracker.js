(function () {
  try {
    var currentScript = document.querySelector(
      'script[data-website-id]'
    );

    if (!currentScript) return;

    var websiteId =
      currentScript.getAttribute('data-website-id');

    if (!websiteId) return;

    var endpoint = new URL(
      '/api/collect',
      currentScript.src
    ).href;

    function sendPageView() {
      try {
        var payload = {
          websiteId: websiteId,
          path:
            window.location.pathname +
            window.location.search,
          referrer: document.referrer || null,
          screen:
            window.screen.width +
            'x' +
            window.screen.height,
        };

        var blob = new Blob(
          [JSON.stringify(payload)],
          {
            type: 'application/json',
          }
        );

        if (navigator.sendBeacon) {
          navigator.sendBeacon(endpoint, blob);
        } else {
          fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(function () {});
        }
      } catch (e) {
        console.error('[Tracker]', e);
      }
    }

    if (document.readyState === 'complete') {
      setTimeout(sendPageView, 100);
    } else {
      window.addEventListener(
        'load',
        function () {
          setTimeout(sendPageView, 100);
        },
        { once: true }
      );
    }
  } catch (err) {
    console.error('[Tracker]', err);
  }
})();