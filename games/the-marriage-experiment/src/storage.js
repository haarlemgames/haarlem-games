(function () {
  "use strict";

  const PREFIX = "mafs:";

  function safeGet(key) {
    try {
      return window.localStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, value);
      return true;
    } catch {
      return false;
    }
  }

  const storage = {

    getJSON(key, fallback) {
      const raw = safeGet(key);
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    setJSON(key, value) {
      try {
        return safeSet(key, JSON.stringify(value));
      } catch {
        return false;
      }
    },

    getString(key, fallback = null) {
      const raw = safeGet(key);
      return raw === null ? fallback : raw;
    },

    setString(key, value) {
      return safeSet(key, value);
    },

    remove(key) {
      try {
        window.localStorage.removeItem(PREFIX + key);
      } catch {

      }
    },
  };

  window.MAFS = window.MAFS || {};
  window.MAFS.storage = storage;
})();
