// security.js (CSRF + hardened fetch helpers)
let CSRF_TOKEN = null;

export async function initCsrf() {
  try {
    const res = await fetch(`api/csrf.php?v=${Date.now()}`, { cache: "no-store", credentials: "include" });
    const data = await res.json();
    CSRF_TOKEN = data?.csrfToken || null;
  } catch (e) {
    console.warn("CSRF init failed:", e);
    CSRF_TOKEN = null;
  }
}

export function getCsrfToken() {
  return CSRF_TOKEN;
}

export async function secureFetch(url, options = {}) {
  const opts = { credentials: "include", cache: "no-store", ...options };
  const method = (opts.method || "GET").toUpperCase();

  opts.headers = opts.headers || {};

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (!CSRF_TOKEN) {
      // Lazy-init (in case a module runs before initCsrf)
      await initCsrf();
    }
    if (CSRF_TOKEN) {
      opts.headers["X-CSRF-Token"] = CSRF_TOKEN;
    }
  }

  return fetch(url, opts);
}

export async function fetchJsonText(url, opts = {}) {
  const res = await secureFetch(url, opts);
  const raw = await res.text();
  let json;
  try { json = JSON.parse(raw); }
  catch { throw new Error("Server did not return JSON: " + raw.slice(0, 200)); }
  if (!json.ok) throw new Error(json.error || "Request failed");
  return json;
}
