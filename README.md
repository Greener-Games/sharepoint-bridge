# SharePoint Tab Dev Bridge

> Zero-auth local development WebSocket proxy bridge for developing and debugging against SharePoint Online REST APIs in strict corporate environments.

[![npm version](https://img.shields.io/npm/v/@greener-games/sharepoint-bridge.svg)](https://www.npmjs.com/package/@greener-games/sharepoint-bridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Overview

The **SharePoint Tab Dev Bridge** allows developers to develop and debug against real SharePoint Online REST APIs locally on `http://localhost:5173` without requiring Azure AD / Entra ID App Registrations, Client IDs/Secrets, IT security exemptions, or custom browser command-line flags.

Instead of hardcoding corporate credentials, it establishes a lightweight local WebSocket tunnel directly to an already-authenticated SharePoint browser tab in Edge or Chrome.

---

## Quickstart

### 1. Install

```bash
npm install @greener-games/sharepoint-bridge --save-dev
```

### 2. Configure (`.sharepoint/serverconfig.js`)

Create a `.sharepoint/serverconfig.js` in your project root:

```javascript
module.exports = {
  port: 8080,
  sharepointUrl: 'https://<tenant>.sharepoint.com/sites/MySite',
  profiles: {
    mainSite: {
      port: 8080,
      sharepointUrl: 'https://<tenant>.sharepoint.com/sites/MySite',
    },
    templates: {
      port: 8081,
      sharepointUrl: 'https://<tenant>.sharepoint.com/sites/Templates',
    },
  },
};
```

### 3. Run

```bash
# Start the bridge server & dashboard on http://localhost:8080/
npx sp-bridge

# Or integrate into your package.json scripts:
# "dev:sharepoint": "concurrently \"vite --mode sharepoint\" \"sp-bridge\""
```

1. Open your target SharePoint site in Edge or Chrome.
2. Visit `http://localhost:8080/` and drag the **⭐ Bookmarklet** button to your bookmarks bar.
3. Click the bookmarklet while on the SharePoint tab.
4. Your local frontend (`http://localhost:5173`) can now make standard REST requests to `http://localhost:8080/_api/...` seamlessly!

---

## Features

- **Zero Corporate Auth Needed**: Re-uses the active browser SSO cookie session.
- **Full HTTP Method Support**: Handles `GET`, `POST`, `PATCH`, `MERGE`, and `DELETE`.
- **Automatic Form Digest Tokens**: Seamlessly acquires fresh `X-RequestDigest` tokens for write operations.
- **In-Memory Caching & 0ms Replay**: Caches repeated GET queries with instant 1-click flush controls.
- **Real-Time Developer Dashboard**: Built-in developer dashboard with live request inspector, headers view, and latency tracking over WebSockets (0 HTTP polling).
- **Concurrent Multi-Profile Support**: Spin up multiple bridge servers simultaneously on different ports for distinct SharePoint sites.

---

## License

MIT © [Tom Greener](https://github.com/TomGreener91)
