// Legacy shim retained for compatibility.
// Extended popout now uses module entrypoint: /legacy/main.js
console.info('FailSafe legacy-roadmap.js loaded; redirecting to module UI bootstrap.');
if (!window.__failsafeLegacyBootstrapped) {
  window.__failsafeLegacyBootstrapped = true;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'legacy/main.js';
  document.body.appendChild(script);
}
