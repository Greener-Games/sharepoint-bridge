/**
 * Client listener generator for the active SharePoint browser tab.
 * Injects a WebSocket tunnel into the page to execute native authenticated fetch() calls.
 *
 * @param {number} port Bridge server port (e.g. 8080)
 * @returns {string} JavaScript code to run in DevTools Console or as a bookmarklet
 */
export function generateClientSnippet(port = 8080) {
  return `(function() {
  if (window.__SP_DEV_BRIDGE_ACTIVE__) {
    console.log("%c[SP Bridge] Already active on this tab!", "color: #10b981; font-weight: bold;");
    return;
  }
  window.__SP_DEV_BRIDGE_ACTIVE__ = true;

  const WS_URL = "ws://localhost:${port}/ws";
  let socket = null;
  let retryTimer = null;
  let badgeEl = null;

  function createBadge() {
    if (document.getElementById("sp-bridge-status-badge")) return;
    badgeEl = document.createElement("div");
    badgeEl.id = "sp-bridge-status-badge";
    badgeEl.style.position = "fixed";
    badgeEl.style.bottom = "16px";
    badgeEl.style.right = "16px";
    badgeEl.style.zIndex = "999999";
    badgeEl.style.padding = "8px 14px";
    badgeEl.style.borderRadius = "20px";
    badgeEl.style.fontSize = "12px";
    badgeEl.style.fontFamily = "system-ui, -apple-system, sans-serif";
    badgeEl.style.fontWeight = "600";
    badgeEl.style.boxShadow = "0 4px 14px rgba(0,0,0,0.2)";
    badgeEl.style.transition = "all 0.3s ease";
    badgeEl.style.cursor = "pointer";
    badgeEl.title = "SharePoint Local Dev Bridge (Port ${port}) - Click to toggle";
    badgeEl.onclick = function() {
      badgeEl.style.opacity = badgeEl.style.opacity === "0.3" ? "1" : "0.3";
    };
    document.body.appendChild(badgeEl);
  }

  function updateBadge(connected, message) {
    if (!badgeEl) createBadge();
    if (connected) {
      badgeEl.style.backgroundColor = "#065f46";
      badgeEl.style.color = "#ecfdf5";
      badgeEl.style.border = "1px solid #10b981";
      badgeEl.innerHTML = "🟢 <b>SP Bridge Connected</b> (" + (window._spPageContextInfo?.webServerRelativeUrl || "Site") + ")";
    } else {
      badgeEl.style.backgroundColor = "#7f1d1d";
      badgeEl.style.color = "#fef2f2";
      badgeEl.style.border = "1px solid #ef4444";
      badgeEl.innerHTML = "🔴 <b>SP Bridge Disconnected</b> " + (message || "Retrying...");
    }
  }

  async function getRequestDigest() {
    const existing = document.getElementById("__REQUESTDIGEST")?.value;
    if (existing) return existing;
    try {
      const siteUrl = window._spPageContextInfo?.webAbsoluteUrl || window.location.origin;
      const res = await fetch(siteUrl + "/_api/contextinfo", {
        method: "POST",
        headers: { "Accept": "application/json;odata=verbose" },
        credentials: "include"
      });
      const data = await res.json();
      return data?.d?.GetContextWebInformation?.FormDigestValue || "";
    } catch (e) {
      return "";
    }
  }

  function resolveUrl(reqUrl) {
    if (reqUrl.startsWith("http://") || reqUrl.startsWith("https://")) {
      try {
        const u = new URL(reqUrl);
        if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
          reqUrl = u.pathname + u.search;
        } else {
          return reqUrl;
        }
      } catch (e) {}
    }

    const webRelative = window._spPageContextInfo?.webServerRelativeUrl || "";

    if (reqUrl.startsWith("/sites/") || (webRelative && reqUrl.startsWith(webRelative))) {
      return window.location.origin + reqUrl;
    }

    if (reqUrl.startsWith("/_api") || reqUrl.startsWith("_api")) {
      const cleanPath = reqUrl.startsWith("/") ? reqUrl : "/" + reqUrl;
      const base = webRelative.endsWith("/") ? webRelative.slice(0, -1) : webRelative;
      return window.location.origin + base + cleanPath;
    }

    return window.location.origin + (reqUrl.startsWith("/") ? reqUrl : "/" + reqUrl);
  }

  async function handleBridgeRequest(msg) {
    const { id, method = "GET", url, headers = {}, body } = msg;
    const targetUrl = resolveUrl(url);

    console.log(\`%c[SP Bridge :${port}] ➡️ \${method} \${targetUrl}\`, "color: #3b82f6; font-weight: bold;");

    const fetchHeaders = new Headers(headers);
    const existingAccept = fetchHeaders.get("accept") || "";
    if (!existingAccept || existingAccept === "*/*" || existingAccept.includes("html") || existingAccept.includes("xml")) {
      fetchHeaders.set("Accept", "application/json;odata=verbose;charset=utf-8");
    }

    if (["POST", "PUT", "PATCH", "MERGE", "DELETE"].includes(method.toUpperCase()) && !fetchHeaders.has("X-RequestDigest")) {
      const digest = await getRequestDigest();
      if (digest) {
        fetchHeaders.set("X-RequestDigest", digest);
      }
    }

    const fetchOptions = {
      method,
      headers: fetchHeaders,
      credentials: "include"
    };

    if (body && !["GET", "HEAD"].includes(method.toUpperCase())) {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    try {
      const start = performance.now();
      const res = await fetch(targetUrl, fetchOptions);
      const elapsed = Math.round(performance.now() - start);

      const responseHeaders = {};
      res.headers.forEach((val, key) => {
        responseHeaders[key.toLowerCase()] = val;
      });

      const contentType = res.headers.get("content-type") || "";
      let responseData;
      if (contentType.includes("json")) {
        try {
          responseData = await res.json();
        } catch (err) {
          responseData = await res.text();
        }
      } else {
        responseData = await res.text();
      }

      console.log(
        \`%c[SP Bridge :${port}] ⬅️ \${res.status} \${res.statusText} (\${elapsed}ms)\`,
        res.ok ? "color: #10b981; font-weight: bold;" : "color: #ef4444; font-weight: bold;"
      );

      socket.send(JSON.stringify({
        id,
        type: "RESPONSE",
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        data: responseData,
        elapsed
      }));
    } catch (err) {
      console.error("[SP Bridge] Fetch error:", err);
      socket.send(JSON.stringify({
        id,
        type: "RESPONSE",
        status: 502,
        statusText: "Bad Gateway",
        headers: { "content-type": "application/json" },
        data: {
          error: {
            message: err.message || "Failed to fetch in SharePoint tab",
            targetUrl
          }
        }
      }));
    }
  }

  function connect() {
    createBadge();
    updateBadge(false, "Connecting to bridge...");

    try {
      socket = new WebSocket(WS_URL);
    } catch (e) {
      updateBadge(false, "WebSocket creation failed");
      scheduleReconnect();
      return;
    }

    socket.onopen = function() {
      updateBadge(true);
      console.log("%c[SP Bridge] 🚀 Connected to local dev bridge on port ${port}!", "color: #10b981; font-size: 14px; font-weight: bold;");
      
      socket.send(JSON.stringify({
        type: "HELLO",
        siteUrl: window.location.origin,
        webUrl: window._spPageContextInfo?.webServerRelativeUrl || window.location.pathname,
        webAbsoluteUrl: window._spPageContextInfo?.webAbsoluteUrl || window.location.href,
        user: window._spPageContextInfo?.userEmail || window._spPageContextInfo?.userLoginName || "Authenticated User",
        title: document.title
      }));
    };

    socket.onmessage = function(event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "REQUEST") {
          handleBridgeRequest(msg);
        } else if (msg.type === "PING") {
          socket.send(JSON.stringify({ type: "PONG" }));
        }
      } catch (e) {
        console.error("[SP Bridge] Failed to parse message:", e);
      }
    };

    socket.onclose = function() {
      updateBadge(false, "Server disconnected");
      console.warn("[SP Bridge] Connection lost to local bridge on port ${port}. Retrying in 3s...");
      scheduleReconnect();
    };

    socket.onerror = function() {
      updateBadge(false, "Connection error");
    };
  }

  function scheduleReconnect() {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(connect, 3000);
  }

  connect();
})();`;
}

export function generateBookmarklet(port = 8080) {
  const code = generateClientSnippet(port);
  return `javascript:${encodeURIComponent(code.replace(/\n\s*/g, ' '))}`;
}
