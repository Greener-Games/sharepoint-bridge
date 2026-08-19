#!/usr/bin/env node
/**
 * Test script for SharePoint Tab Dev Bridge
 * Reads config from .sharepoint/serverconfig.js and runs sample queries against the bridge.
 *
 * Usage:
 *   npm run test:sharepoint-bridge                  # Fetches and lists all SharePoint lists
 *   npm run test:sharepoint-bridge [ListName]      # Fetches top 5 items from a specific list
 */

import { loadServerConfig } from './server.mjs';

const specifiedList = process.argv[2];
const config = await loadServerConfig();
const bridgePort = process.env.PORT || config.port || 8080;

const testUrl = specifiedList
  ? `http://localhost:${bridgePort}/_api/web/lists/getbytitle('${specifiedList}')/items?$select=Id,Title&$top=5`
  : `http://localhost:${bridgePort}/_api/web/lists?$select=Title,ItemCount,Hidden&$filter=Hidden%20eq%20false&$orderby=Title`;

console.log(`\n🔍 SharePoint Tab Dev Bridge Test`);
console.log(
  `Mode:        ${specifiedList ? `Query List '${specifiedList}'` : 'Fetch All Visible Lists'}`,
);
console.log(`Bridge Port: ${bridgePort}`);
console.log(`Endpoint:    ${testUrl}\n`);

async function runTest() {
  try {
    const healthRes = await fetch(`http://localhost:${bridgePort}/health`);
    if (!healthRes.ok) {
      console.error(`❌ Bridge server responded with status ${healthRes.status}`);
      process.exit(1);
    }
    const health = await healthRes.json();
    console.log(
      `Bridge Status: OK (Active Tabs: ${health.activeTabs}, Cache: ${health.cacheSize || 0} items)`,
    );

    if (health.activeTabs === 0) {
      console.warn(`\n⚠️ No SharePoint tab is currently connected on port ${bridgePort}!`);
      console.warn(
        `1. Open your SharePoint site: ${health.targetUrl || 'https://<tenant>.sharepoint.com/...'}`,
      );
      console.warn(
        `2. Visit http://localhost:${bridgePort}/ and click the bookmarklet or copy the snippet.`,
      );
      console.warn(`3. Re-run this test script.\n`);
      process.exit(1);
    }

    if (health.tabInfo) {
      console.log(`Connected Site:     ${health.tabInfo.webAbsoluteUrl || health.tabInfo.siteUrl}`);
      console.log(`Authenticated User: ${health.tabInfo.user}\n`);
    }

    console.log(`📡 Sending test query...`);
    const start = Date.now();
    const res = await fetch(testUrl, {
      headers: {
        Accept: 'application/json;odata=verbose',
      },
    });
    const elapsed = Date.now() - start;

    console.log(`HTTP Status: ${res.status} ${res.statusText} (${elapsed}ms)`);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Request failed:\n${errText}`);
      process.exit(1);
    }

    const data = await res.json();
    const items = data?.d?.results || data?.value || data;

    if (Array.isArray(items)) {
      console.log(`\n✅ Success! Received ${items.length} records:`);
      if (!specifiedList) {
        console.table(items.map((i) => ({ Title: i.Title, 'Item Count': i.ItemCount })));
      } else {
        console.log(JSON.stringify(items, null, 2));
      }
    } else {
      console.log(`\n✅ Success! Received response:`);
      console.log(JSON.stringify(items, null, 2));
    }
  } catch (err) {
    console.error(`❌ Connection failed: ${err.message}`);
    if (err.cause?.code === 'ECONNREFUSED') {
      console.error(
        `\nIs the bridge server running on port ${bridgePort}? Start it with:\n  npm run dev:sharepoint\n`,
      );
    }
    process.exit(1);
  }
}

runTest();
