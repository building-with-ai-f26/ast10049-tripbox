/* Public PostHog project token; never put an AI/API secret in this file. */
(() => {
  const ph = window.posthog = window.posthog || [];
  if (ph.__SV) return;
  ph._i = [];
  for (const method of ['capture', 'register', 'startSessionRecording']) {
    ph[method] = (...args) => ph.push([method, ...args]);
  }
  ph.init = (token, config) => ph._i.push([token, config, 'posthog']);
  ph.__SV = 1;
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = 'https://us-assets.i.posthog.com/static/array.js';
  document.head.append(script);
  ph.init('phc_mbVxW8TrnwrzGi4ufFGFDNP6o4m3UNnNXFw34gG6KKcr', {
    api_host: 'https://us.i.posthog.com',
    defaults: '2026-05-30',
    person_profiles: 'identified_only',
    capture_pageview: true,
    autocapture: { mask_all_text: true, mask_all_element_attributes: true },
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
      blockSelector: 'img, canvas, .ph-no-capture',
      recordCrossOriginIframes: false,
      recordCanvas: false
    },
    loaded: client => client.startSessionRecording()
  });
  // Named event survives masked autocapture. No photo or user content is sent.
  document.addEventListener('click', event => {
    if (event.target.closest('a[data-try-product]')) ph.capture('clicked_try_product');
  });
})();
