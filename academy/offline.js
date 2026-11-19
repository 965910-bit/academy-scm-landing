"use strict";
window.SCMOffline = {
  async prepare() {
    if (!window.isSecureContext || !("serviceWorker" in navigator) || !("caches" in window)) {
      throw new Error("Офлайн-пакет требует HTTPS и браузер с поддержкой Service Worker и Cache Storage.");
    }
    await navigator.serviceWorker.register("sw.js", { scope: "./", updateViaCache: "none" });
    let timer;
    try {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Пакет ещё не готов. Проверьте сеть и повторите подготовку.")), 15000); })
      ]);
      const cache = await caches.open(window.SCM_OFFLINE_CONFIG.cacheName);
      for (const file of window.SCM_OFFLINE_CONFIG.files) {
        if (!(await cache.match(new URL(file, location.href).href))) {
          throw new Error("Не все файлы пакета доступны. Обновите страницу при стабильной сети и повторите подготовку.");
        }
      }
      return true;
    } finally { clearTimeout(timer); }
  }
};
