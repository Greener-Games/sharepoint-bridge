# @greener-games/sharepoint-bridge

A zero-auth local development WebSocket proxy bridge for developing and debugging against SharePoint Online REST APIs in strict corporate environments.

---

## Features

- **Zero Corporate Auth Needed**: Leverages your active, SSO-authenticated SharePoint tab session in Edge/Chrome.
- **Configurable via `serverconfig.js`**: Easily set target site URLs, ports, and multi-profile environments.
- **Full HTTP Method Support**: Handles `GET`, `POST`, `PATCH`, `MERGE`, and `DELETE` requests.
- **Automatic `X-RequestDigest` Token Acquisition**: Seamlessly acquires fresh anti-forgery form digest tokens for mutating operations.
- **Interactive Dashboard & Bookmarklet**: Built-in dashboard on `http://localhost:8080/` with live request logs, latency counters, and 1-click bookmarklets.
- **In-Memory Response Caching**: Accelerates local development by caching GET responses with instant 1-click flush controls.
- **Multi-Instance Support**: Run multiple bridge servers concurrently on different ports for separate SharePoint sites.

---

## Configuration (`.sharepoint/serverconfig.js`)

Create a `serverconfig.js` file in your `.sharepoint/` folder:

```javascript
module.exports = {
  // Local bridge server port (default: 8080)
  port: 8080,

  // Default target SharePoint Online site
  sharepointUrl: 'https://<tenant>.sharepoint.com/sites/MySite',

  // Optional named profiles for multi-site development
  profiles: {
    mainSite: {
      port: 8080,
      sharepointUrl: 'https://<tenant>.sharepoint.com/sites/MyMainSite',
    },
    templateSite: {
      port: 8081,
      sharepointUrl: 'https://<tenant>.sharepoint.com/sites/MyTemplateSite',
    },
  },
};
```

---

## Usage

### CLI Commands

```bash
# Start default bridge using serverconfig.js
sp-bridge

# Start with a specific port
sp-bridge --port=8081

# Start with a named profile from serverconfig.js
sp-bridge --profile=templateSite
```

### Programmatic API

```javascript
import { createSharePointBridge } from '@greener-games/sharepoint-bridge';

const bridge = await createSharePointBridge({
  port: 8080,
  sharepointUrl: 'https://<tenant>.sharepoint.com/sites/MySite',
});

// Cleanly close when done
// bridge.close()
```

---

## Connecting the Browser Tab

1. Open your target SharePoint site in your browser (`https://<tenant>.sharepoint.com/sites/...`).
2. Visit `http://localhost:8080/` and drag the **⭐ Bookmarklet** button to your browser bar.
3. Click the bookmarklet while on the SharePoint tab.
4. A green status pill `🟢 SP Bridge Connected` appears on the page.

---

## Testing the Plugin in Isolation

You can run isolated queries against the bridge directly from the plugin package:

```bash
# Run isolated smoke test (fetches all visible lists)
npm --prefix plugins/SharePointBridge test

# Or query a specific SharePoint list
node plugins/SharePointBridge/src/test.mjs MyCustomList
```
