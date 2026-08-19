import http from 'http';
import { WebSocketServer } from 'ws';
import { generateClientSnippet, generateBookmarklet } from './listener.js';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

/**
 * Loads configuration from .sharepoint/serverconfig.js (or fallback env)
 * @param {string} [configPath] Optional explicit path to config file
 * @returns {Promise<Object>}
 */
export async function loadServerConfig(configPath) {
  let config = {
    port: parseInt(process.env.PORT || '8080', 10),
    host: process.env.HOST || 'localhost',
    sharepointUrl: process.env.VITE_APP_CMS_END_POINT || undefined,
  };

  const searchPaths = configPath
    ? [configPath]
    : [
        path.resolve(process.cwd(), '.sharepoint/serverconfig.js'),
        path.resolve(process.cwd(), '.sharepoint/serverconfig.mjs'),
        path.resolve(process.cwd(), 'serverconfig.js'),
        path.resolve(process.cwd(), 'serverconfig.mjs'),
      ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      try {
        let userConfig;
        if (p.endsWith('.mjs')) {
          const fileUrl = pathToFileURL(p).href;
          const mod = await import(fileUrl);
          userConfig = mod.default || mod;
        } else {
          try {
            const fileUrl = pathToFileURL(p).href;
            const mod = await import(fileUrl);
            userConfig = mod.default || mod;
          } catch (e) {
            const { createRequire } = await import('module');
            const require = createRequire(import.meta.url);
            userConfig = require(p);
          }
        }
        config = {
          ...config,
          ...userConfig,
          resolvedFrom: p,
        };
        break;
      } catch (err) {
        console.warn(`[SP Bridge] Warning: Failed to import config from ${p}:`, err.message);
      }
    }
  }

  return config;
}

/**
 * Creates and starts a single SharePoint Tab Dev Bridge HTTP + WebSocket Server instance.
 * @param {Object} options
 * @param {string} [options.name] Profile name
 * @param {number} [options.port] Server port
 * @param {string} [options.host] Server host
 * @param {string} [options.sharepointUrl] Target SharePoint Online URL
 * @param {Array} [options.allProfiles] List of all active profile definitions
 * @returns {Promise<{ server: http.Server, wss: WebSocketServer, port: number, name: string, close: Function }>}
 */
export async function createSingleBridge(options = {}) {
  const PORT = options.port || 8080;
  const HOST = options.host || 'localhost';
  const PROFILE_NAME = options.name || 'default';
  const TARGET_SP_URL = options.sharepointUrl;
  const ALL_PROFILES = options.allProfiles || [];

  // Sockets for SharePoint tabs that execute fetch()
  const activeTabSockets = new Set();
  // Sockets for browser dashboard UI tabs that receive real-time updates
  const dashboardSockets = new Set();

  let activeTabInfo = null;
  const pendingRequests = new Map();
  const requestLogs = [];

  // In-memory GET response cache (url -> { status, headers, data, cachedAt })
  const responseCache = new Map();

  function logMessage(emoji, text, color = '\x1b[0m') {
    const time = new Date().toLocaleTimeString();
    console.log(
      `\x1b[90m[${time}]\x1b[0m ${emoji} \x1b[35m[${PROFILE_NAME}:${PORT}]\x1b[0m ${color}${text}\x1b[0m`,
    );
  }

  function generateId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  function getStatusPayload() {
    return {
      status: 'ok',
      profile: PROFILE_NAME,
      port: PORT,
      targetUrl: TARGET_SP_URL,
      activeTabs: activeTabSockets.size,
      cacheSize: responseCache.size,
      tabInfo: activeTabInfo,
      logs: requestLogs.slice(0, 100),
    };
  }

  function broadcastStatusToDashboards() {
    if (dashboardSockets.size === 0) return;
    const msg = JSON.stringify({ type: 'STATUS_UPDATE', status: getStatusPayload() });
    for (const ws of dashboardSockets) {
      if (ws.readyState === 1 /* OPEN */) {
        ws.send(msg);
      }
    }
  }

  const snippetCode = generateClientSnippet(PORT);
  const bookmarkletHref = generateBookmarklet(PORT);

  function renderDashboard() {
    const isConnected = activeTabSockets.size > 0;
    const tabStatusHtml = isConnected
      ? `<span class="status-pill status-online"><span class="pulse-dot"></span> Connected (${activeTabSockets.size} tab${activeTabSockets.size > 1 ? 's' : ''})</span>`
      : `<span class="status-pill status-offline"><span class="pulse-dot red"></span> Disconnected</span>`;

    const profilesNav =
      ALL_PROFILES.length > 1
        ? `
        <div class="profile-tabs">
          ${ALL_PROFILES.map(
            (p) => `
            <a href="http://localhost:${p.port}" class="profile-tab ${p.port === PORT ? 'active' : ''}">
              <span class="tab-name">${p.name}</span>
              <span class="tab-port">:${p.port}</span>
            </a>
          `,
          ).join('')}
        </div>
      `
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SP Bridge | ${PROFILE_NAME.toUpperCase()} (:${PORT})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-hover: #162032;
      --card-border: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --success-bg: rgba(16, 185, 129, 0.12);
      --danger: #ef4444;
      --danger-bg: rgba(239, 68, 68, 0.12);
      --amber: #f59e0b;
      --amber-bg: rgba(245, 158, 11, 0.12);
      --purple: #8b5cf6;
      --purple-hover: #7c3aed;
      --code-bg: #050811;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-sans);
      background: var(--bg);
      color: var(--text);
      padding: 16px 20px;
      font-size: 13px;
      line-height: 1.5;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }
    .layout {
      max-width: 1440px;
      width: 100%;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 12px;
      min-height: 0;
    }
    
    /* Top Navigation Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 18px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .brand {
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: -0.02em;
      color: #fff;
    }
    .profile-pill {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.35);
      color: #60a5fa;
      border-radius: 6px;
    }
    .profile-tabs {
      display: flex;
      gap: 4px;
      margin-left: 8px;
      background: rgba(0,0,0,0.25);
      padding: 2px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.04);
    }
    .profile-tab {
      padding: 3px 10px;
      border-radius: 6px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
      font-weight: 500;
    }
    .profile-tab:hover {
      background: rgba(255,255,255,0.06);
      color: var(--text);
    }
    .profile-tab.active {
      background: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
      font-weight: 600;
    }
    .tab-port { font-family: var(--font-mono); font-size: 10px; opacity: 0.75; }
    
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 12px;
    }
    .status-online {
      background: var(--success-bg);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--success);
    }
    .status-offline {
      background: var(--danger-bg);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: var(--danger);
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }
    .pulse-dot.red {
      background: var(--danger);
      box-shadow: 0 0 8px var(--danger);
    }

    /* Actions Toolbar */
    .toolbar {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      flex-shrink: 0;
    }
    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--primary);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn:hover { background: var(--primary-hover); transform: translateY(-1px); }
    .btn-purple { background: #7c3aed; }
    .btn-purple:hover { background: #6d28d9; }
    .btn-green { background: #059669; }
    .btn-green:hover { background: #047857; }
    .btn-amber { background: #d97706; }
    .btn-amber:hover { background: #b45309; }
    .btn-ghost {
      background: rgba(255,255,255,0.06);
      color: var(--text-muted);
    }
    .btn-ghost:hover {
      background: rgba(255,255,255,0.1);
      color: var(--text);
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 10px;
      flex-shrink: 0;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      transition: border-color 0.15s;
    }
    .metric-card:hover {
      border-color: rgba(255,255,255,0.15);
    }
    .metric-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.05em;
    }
    .metric-value {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .metric-sub {
      font-size: 11px;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: var(--font-mono);
    }

    /* Live Request Stream */
    .stream-container {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .stream-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-bottom: 1px solid var(--card-border);
      background: rgba(0,0,0,0.2);
      flex-shrink: 0;
      gap: 12px;
      flex-wrap: wrap;
    }
    .stream-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .stream-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stream-count {
      background: rgba(255,255,255,0.08);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      color: #93c5fd;
    }
    .stream-hint {
      color: var(--text-muted);
      font-size: 11px;
    }
    
    .table-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }
    th {
      padding: 8px 14px;
      color: var(--text-muted);
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--card-border);
      position: sticky;
      top: 0;
      background: #0f172a;
      z-index: 2;
    }
    td {
      padding: 8px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      vertical-align: middle;
    }
    .clickable-row {
      cursor: pointer;
      transition: background 0.1s ease;
    }
    .clickable-row:hover td {
      background: rgba(59, 130, 246, 0.08);
    }
    .row-error td { background: rgba(239, 68, 68, 0.04); }
    .row-error:hover td { background: rgba(239, 68, 68, 0.1); }
    
    /* Method badges */
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 10px;
      text-align: center;
      min-width: 44px;
      font-family: var(--font-mono);
      letter-spacing: 0.03em;
    }
    .badge-get { background: #0284c7; color: white; }
    .badge-post { background: #059669; color: white; }
    .badge-patch, .badge-merge { background: #d97706; color: white; }
    .badge-delete { background: #dc2626; color: white; }
    
    .status-badge {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 11px;
    }
    .status-ok { color: var(--success); }
    .status-err { color: var(--danger); }
    .cache-pill {
      font-size: 10px;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      padding: 1px 4px;
      border-radius: 4px;
      margin-right: 4px;
    }
    .time-cell { color: var(--text-muted); font-family: var(--font-mono); font-size: 11px; width: 85px; }
    .latency-cell { color: var(--text-muted); font-family: var(--font-mono); font-size: 11px; width: 120px; text-align: right; }
    .url-cell {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 650px;
    }
    .url-cell code {
      font-family: var(--font-mono);
      color: #cbd5e1;
      font-size: 11px;
    }
    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
    }

    /* Modals */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(6px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-content {
      background: #0f172a;
      border: 1px solid var(--card-border);
      border-radius: 12px;
      max-width: 800px;
      width: 100%;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
      max-height: 85vh;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title { font-size: 14px; font-weight: 700; color: #fff; }
    .modal-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
    }
    .modal-close:hover { color: #fff; }
    pre {
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      padding: 12px;
      border-radius: 8px;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .tab-nav {
      display: flex;
      gap: 6px;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 8px;
    }
    .tab-btn {
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(255,255,255,0.04);
      border: 1px solid transparent;
      color: var(--text-muted);
      font-size: 12px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      background: rgba(255,255,255,0.08);
      color: var(--text);
    }
    .tab-btn.active {
      background: rgba(59, 130, 246, 0.2);
      border-color: rgba(59, 130, 246, 0.4);
      color: #93c5fd;
    }
  </style>
</head>
<body>
  <div class="layout">
    <!-- Header -->
    <header>
      <div class="header-left">
        <span class="brand">📡 SharePoint Tab Dev Bridge</span>
        <span class="profile-pill">${PROFILE_NAME}</span>
        ${profilesNav}
      </div>
      <div id="tab-status-container">
        ${tabStatusHtml}
      </div>
    </header>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-group">
        <a class="btn btn-purple" href="${bookmarkletHref}" title="Drag this button to your Bookmarks Bar">⭐ Drag Bookmarklet (:${PORT})</a>
        <button class="btn btn-ghost" onclick="copySnippet()">📋 Copy Snippet</button>
        <button class="btn btn-ghost" onclick="toggleModal('snippet-modal', true)">🔍 View Code</button>
        ${TARGET_SP_URL ? `<a class="btn btn-green" href="${TARGET_SP_URL}" target="_blank">🌐 Open Site ↗</a>` : ''}
      </div>
      <div class="toolbar-group">
        <button class="btn" id="test-req-btn" onclick="triggerTestRequest()" style="background: #0284c7;">🧪 Send Test Request</button>
        <button class="btn btn-amber" id="clear-cache-btn" onclick="clearBridgeCache()">🧹 Clear Cache (${responseCache.size})</button>
      </div>
    </div>

    <!-- Metrics Strip -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-label">Active Site</span>
        <span class="metric-value" id="meta-site-url">
          ${activeTabInfo ? `<a href="${activeTabInfo.webAbsoluteUrl || activeTabInfo.siteUrl}" target="_blank" style="color: #60a5fa; text-decoration: none;">${activeTabInfo.webAbsoluteUrl || activeTabInfo.siteUrl} ↗</a>` : TARGET_SP_URL ? `<a href="${TARGET_SP_URL}" target="_blank" style="color: #60a5fa; text-decoration: none;">${TARGET_SP_URL} ↗</a>` : '<span style="color: var(--text-muted); font-weight: normal;">Waiting for tab...</span>'}
        </span>
        <span class="metric-sub" id="meta-rel">${activeTabInfo?.webUrl || '/'}</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Auth Session</span>
        <span class="metric-value" id="meta-user">${activeTabInfo ? activeTabInfo.user : '<span style="color: var(--text-muted); font-weight: normal;">None (open tab to login)</span>'}</span>
        <span class="metric-sub" id="meta-title">${activeTabInfo?.title || '-'}</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Local Proxy Tunnel</span>
        <span class="metric-value" style="color: #38bdf8; font-family: var(--font-mono);">http://localhost:${PORT}</span>
        <span class="metric-sub" style="color: #10b981;">Zero-Auth WebSocket Bridge</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">In-Memory Cache</span>
        <span class="metric-value" id="meta-cache"><span style="color: #38bdf8;">Active</span> (${responseCache.size} item${responseCache.size !== 1 ? 's' : ''})</span>
        <span class="metric-sub">Instant 0ms local replay</span>
      </div>
    </div>

    <!-- Live Request Stream -->
    <div class="stream-container">
      <div class="stream-header">
        <div class="stream-title-group">
          <span class="stream-title">Live Request Stream</span>
          <span class="stream-count" id="logs-count-badge">${requestLogs.length}</span>
          <span class="stream-hint">• Click any row to inspect response</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-ghost" style="padding: 3px 8px; font-size: 11px;" onclick="clearLogs()">Clear Stream</button>
        </div>
      </div>

      <div class="table-scroll">
        <table id="logs-table">
          <thead>
            <tr>
              <th style="width: 85px;">Time</th>
              <th style="width: 60px;">Method</th>
              <th>Endpoint</th>
              <th style="width: 70px;">Status</th>
              <th style="width: 120px; text-align: right;">Latency</th>
            </tr>
          </thead>
          <tbody id="logs-tbody">
            <!-- Rows injected reactively -->
          </tbody>
        </table>
        <div class="empty-state" id="empty-state" style="display: none;">
          <p>No requests received yet on port <b>${PORT}</b>.</p>
          <p style="margin-top: 6px; font-size: 12px; opacity: 0.7;">Make a request from your Vue app or click <b>"🧪 Send Test Request"</b> in the toolbar above.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Snippet Code Modal -->
  <div id="snippet-modal" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">SharePoint Tab Listener Code (Port ${PORT})</span>
        <button class="modal-close" onclick="toggleModal('snippet-modal', false)">✕</button>
      </div>
      <pre style="max-height: 300px; overflow: auto;"><code id="modal-code">${snippetCode}</code></pre>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button class="btn" onclick="copySnippet()">📋 Copy to Clipboard</button>
        <button class="btn btn-ghost" onclick="toggleModal('snippet-modal', false)">Close</button>
      </div>
    </div>
  </div>

  <!-- Request Inspector Modal -->
  <div id="inspect-modal" class="modal-overlay">
    <div class="modal-content" style="max-width: 900px; height: 80vh;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
          <span id="inspect-method-badge" class="badge"></span>
          <span class="modal-title" id="inspect-title" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); font-size: 12.5px;"></span>
          <span id="inspect-status-badge" class="status-badge"></span>
          <span id="inspect-latency" style="color: var(--text-muted); font-size: 11px; font-family: var(--font-mono);"></span>
        </div>
        <button class="modal-close" onclick="toggleModal('inspect-modal', false)">✕</button>
      </div>
      
      <div class="tab-nav">
        <button class="tab-btn active" id="tab-btn-response" onclick="switchInspectTab('response')">Response Body</button>
        <button class="tab-btn" id="tab-btn-headers" onclick="switchInspectTab('headers')">Headers</button>
        <button class="tab-btn" id="tab-btn-request" onclick="switchInspectTab('request')">Request Payload</button>
      </div>

      <div id="inspect-tab-response" class="inspect-tab-content" style="flex: 1; min-height: 0; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: flex-end; margin-bottom: 6px;">
          <button class="btn btn-ghost" style="padding: 3px 8px; font-size: 11px;" onclick="copyInspectJson()">📋 Copy JSON</button>
        </div>
        <pre style="flex: 1; max-height: none; overflow: auto;"><code id="inspect-response-body"></code></pre>
      </div>

      <div id="inspect-tab-headers" class="inspect-tab-content" style="display: none; flex: 1; min-height: 0; overflow: auto;">
        <pre style="flex: 1; max-height: none; overflow: auto;"><code id="inspect-headers-body"></code></pre>
      </div>

      <div id="inspect-tab-request" class="inspect-tab-content" style="display: none; flex: 1; min-height: 0; overflow: auto;">
        <pre style="flex: 1; max-height: none; overflow: auto;"><code id="inspect-request-body"></code></pre>
      </div>

      <div style="display: flex; justify-content: flex-end;">
        <button class="btn btn-ghost" onclick="toggleModal('inspect-modal', false)">Close</button>
      </div>
    </div>
  </div>

  <script>
    let localLogs = [];
    let currentInspectLog = null;
    let ws = null;

    function copySnippet() {
      const code = ${JSON.stringify(snippetCode)};
      navigator.clipboard.writeText(code).then(() => {
        alert('Snippet for port ${PORT} copied to clipboard! Paste it into DevTools Console on your SharePoint tab.');
      });
    }

    function toggleModal(id, show) {
      document.getElementById(id).style.display = show ? 'flex' : 'none';
    }

    function inspectLog(id) {
      const log = localLogs.find(l => l.id === id);
      if (!log) return;
      currentInspectLog = log;

      document.getElementById('inspect-method-badge').className = 'badge badge-' + log.method.toLowerCase();
      document.getElementById('inspect-method-badge').innerText = log.method;
      document.getElementById('inspect-title').innerText = log.url;
      document.getElementById('inspect-status-badge').className = 'status-badge ' + (log.status >= 400 ? 'status-err' : 'status-ok');
      document.getElementById('inspect-status-badge').innerText = log.status + ' ' + (log.statusText || '');
      document.getElementById('inspect-latency').innerText = (log.fromCache ? '(cached) ' : '') + log.elapsed + 'ms';

      // Format response body
      const formattedData = typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : (log.data || '<empty body>');
      document.getElementById('inspect-response-body').innerText = formattedData;

      // Format headers
      document.getElementById('inspect-headers-body').innerText = JSON.stringify(log.headers || {}, null, 2);

      // Format request payload
      document.getElementById('inspect-request-body').innerText = log.requestBody ? (typeof log.requestBody === 'object' ? JSON.stringify(log.requestBody, null, 2) : log.requestBody) : '<no payload>';

      switchInspectTab('response');
      toggleModal('inspect-modal', true);
    }

    function switchInspectTab(tab) {
      ['response', 'headers', 'request'].forEach(t => {
        document.getElementById('tab-btn-' + t).className = 'tab-btn' + (t === tab ? ' active' : '');
        document.getElementById('inspect-tab-' + t).style.display = t === tab ? 'flex' : 'none';
      });
    }

    function copyInspectJson() {
      if (!currentInspectLog) return;
      const text = typeof currentInspectLog.data === 'object' ? JSON.stringify(currentInspectLog.data, null, 2) : (currentInspectLog.data || '');
      navigator.clipboard.writeText(text).then(() => {
        alert('Response payload copied to clipboard!');
      });
    }

    async function clearBridgeCache() {
      await fetch('/api/clear-cache');
    }

    async function clearLogs() {
      await fetch('/api/clear-logs');
      localLogs = [];
      renderLogs();
    }

    async function triggerTestRequest() {
      const btn = document.getElementById('test-req-btn');
      btn.innerText = '⏳ Sending...';
      btn.disabled = true;
      try {
        const res = await fetch('/_api/web/lists?$select=Title,ItemCount,Hidden&$filter=Hidden%20eq%20false&$top=10', {
          headers: { 'Accept': 'application/json;odata=verbose' }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert('❌ Test request returned status ' + res.status + ':\\n' + (data?.error?.message?.value || res.statusText));
        }
      } catch (err) {
        alert('❌ Request failed: ' + err.message);
      } finally {
        btn.innerText = '🧪 Send Test Request';
        btn.disabled = false;
      }
    }

    function renderLogs() {
      const tbody = document.getElementById('logs-tbody');
      const emptyState = document.getElementById('empty-state');
      const countBadge = document.getElementById('logs-count-badge');
      const table = document.getElementById('logs-table');

      countBadge.innerText = localLogs.length;

      if (localLogs.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        tbody.innerHTML = '';
        return;
      }

      table.style.display = 'table';
      emptyState.style.display = 'none';

      tbody.innerHTML = localLogs.map(log => \`
        <tr class="\${log.status >= 400 ? 'row-error' : 'row-ok'} clickable-row" onclick="inspectLog('\${log.id}')" title="Click to inspect response payload">
          <td class="time-cell">\${log.time}</td>
          <td><span class="badge badge-\${log.method.toLowerCase()}">\${log.method}</span></td>
          <td class="url-cell" title="\${log.url}"><code>\${log.url}</code></td>
          <td><span class="status-badge \${log.status >= 400 ? 'status-err' : 'status-ok'}">\${log.status}</span></td>
          <td class="latency-cell">
            \${log.fromCache ? '<span class="cache-pill">⚡ cached</span>' : ''} 
            \${log.elapsed}ms
          </td>
        </tr>
      \`).join('');
    }

    function applyStatusData(status) {
      if (!status) return;

      // Update tab connection badge
      const badgeContainer = document.getElementById('tab-status-container');
      if (status.activeTabs > 0) {
        badgeContainer.innerHTML = '<span class="status-pill status-online"><span class="pulse-dot"></span> Connected (' + status.activeTabs + ' tab' + (status.activeTabs > 1 ? 's' : '') + ')</span>';
      } else {
        badgeContainer.innerHTML = '<span class="status-pill status-offline"><span class="pulse-dot red"></span> Disconnected</span>';
      }

      // Update meta items
      if (status.tabInfo) {
        const siteUrl = status.tabInfo.webAbsoluteUrl || status.tabInfo.siteUrl || '';
        document.getElementById('meta-site-url').innerHTML = '<a href="' + siteUrl + '" target="_blank" style="color: #60a5fa; text-decoration: none;">' + siteUrl + ' ↗</a>';
        document.getElementById('meta-user').innerText = status.tabInfo.user || '-';
        document.getElementById('meta-title').innerText = status.tabInfo.title || '-';
        document.getElementById('meta-rel').innerText = status.tabInfo.webUrl || '/';
      }

      // Update cache badge
      document.getElementById('meta-cache').innerHTML = '<span style="color: #38bdf8;">Active</span> (' + status.cacheSize + ' item' + (status.cacheSize !== 1 ? 's' : '') + ')';
      document.getElementById('clear-cache-btn').innerText = '🧹 Clear Cache (' + status.cacheSize + ')';

      // Update logs
      localLogs = status.logs || [];
      renderLogs();
    }

    // Connect real-time WebSocket to bridge (Zero HTTP Polling!)
    function connectDashboardWebSocket() {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(proto + '//' + location.host + '/ws?role=dashboard');

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'STATUS_UPDATE') {
            applyStatusData(msg.status);
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        setTimeout(connectDashboardWebSocket, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    // Fetch initial status once and connect live WebSocket push
    fetch('/api/status').then(r => r.json()).then(applyStatusData).catch(()=>{});
    connectDashboardWebSocket();
  </script>
</body>
</html>`;
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, MERGE');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Ignore browser internal noise silently
    if (
      pathname === '/favicon.ico' ||
      pathname.startsWith('/.well-known/') ||
      pathname === '/robots.txt'
    ) {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === '/api/clear-logs') {
      requestLogs.length = 0;
      broadcastStatusToDashboards();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'cleared' }));
      return;
    }

    if (pathname === '/api/clear-cache') {
      const count = responseCache.size;
      responseCache.clear();
      logMessage('🧹', `Flushed ${count} cached responses`, '\x1b[33m');
      broadcastStatusToDashboards();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'cleared', count }));
      return;
    }

    if (pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getStatusPayload()));
      return;
    }

    if (pathname === '/' || pathname === '/status' || pathname === '/bridge-ui') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderDashboard());
      return;
    }

    if (pathname === '/snippet.js' || pathname === '/bridge.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(snippetCode);
      return;
    }

    if (pathname === '/health' || pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getStatusPayload()));
      return;
    }

    // Check GET response cache for instantaneous local development response
    const targetUrl = req.url;
    if (req.method === 'GET' && responseCache.has(targetUrl)) {
      const cached = responseCache.get(targetUrl);
      const requestId = generateId();
      const logEntry = {
        id: requestId,
        time: new Date().toLocaleTimeString(),
        method: req.method,
        url: targetUrl,
        status: cached.status || 200,
        statusText: 'OK',
        elapsed: 0,
        fromCache: true,
        headers: cached.headers || {},
        data: cached.data,
        requestBody: null,
      };
      requestLogs.unshift(logEntry);
      if (requestLogs.length > 100) requestLogs.pop();
      logMessage(
        '⚡',
        `${req.method} ${targetUrl} [${cached.status} (from cache) - 0ms]`,
        '\x1b[36m',
      );

      broadcastStatusToDashboards();

      const responseHeaders = { ...cached.headers, 'x-from-bridge-cache': 'true' };
      delete responseHeaders['content-encoding'];
      delete responseHeaders['content-length'];
      delete responseHeaders['transfer-encoding'];

      res.writeHead(cached.status, responseHeaders);
      if (typeof cached.data === 'object') {
        res.end(JSON.stringify(cached.data));
      } else {
        res.end(cached.data || '');
      }
      return;
    }

    // If mutating method (POST, PUT, PATCH, MERGE, DELETE), purge relevant cache entries
    if (['POST', 'PUT', 'PATCH', 'MERGE', 'DELETE'].includes(req.method.toUpperCase())) {
      responseCache.clear();
    }

    if (activeTabSockets.size === 0) {
      const errorMsg = {
        error: {
          code: 'NO_SHAREPOINT_TAB_CONNECTED',
          message: `No active SharePoint tab connected to bridge on port ${PORT} (${PROFILE_NAME}). Please open your SharePoint site (${TARGET_SP_URL || 'https://<tenant>.sharepoint.com/...'}) and run the bridge snippet/bookmarklet. Visit http://localhost:${PORT}/ for setup instructions.`,
          bridgeUrl: `http://localhost:${PORT}`,
          targetUrl: TARGET_SP_URL,
          profile: PROFILE_NAME,
        },
      };
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(errorMsg));
      return;
    }

    let bodyBuffer = [];
    req.on('data', (chunk) => bodyBuffer.push(chunk));
    req.on('end', () => {
      const rawBody = Buffer.concat(bodyBuffer).toString('utf-8');
      const requestId = generateId();

      const startTime = Date.now();
      logMessage('➡️', `${req.method} ${targetUrl}`, '\x1b[36m');

      const outgoingHeaders = { ...req.headers };
      const accept = outgoingHeaders['accept'] || '';
      if (!accept || accept === '*/*' || accept.includes('html') || accept.includes('xml')) {
        outgoingHeaders['accept'] = 'application/json;odata=verbose;charset=utf-8';
      }

      const bridgeMessage = {
        id: requestId,
        type: 'REQUEST',
        method: req.method,
        url: targetUrl,
        headers: outgoingHeaders,
        body: rawBody || undefined,
      };

      const targetSocket = Array.from(activeTabSockets)[0];

      const timeoutTimer = setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId);
          const logEntry = {
            id: requestId,
            time: new Date().toLocaleTimeString(),
            method: req.method,
            url: targetUrl,
            status: 504,
            statusText: 'Gateway Timeout',
            elapsed: Date.now() - startTime,
            fromCache: false,
            headers: {},
            data: {
              error: { message: `SharePoint tab request timed out after 30s on port ${PORT}` },
            },
            requestBody: rawBody || null,
          };
          requestLogs.unshift(logEntry);
          logMessage('⚠️', `${req.method} ${targetUrl} [504 Gateway Timeout]`, '\x1b[31m');

          broadcastStatusToDashboards();

          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: { message: `SharePoint tab request timed out after 30s on port ${PORT}` },
            }),
          );
        }
      }, 30000);

      pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timeoutTimer);
          const elapsed = Date.now() - startTime;
          const status = data.status || 200;

          // Cache successful GET responses
          if (req.method === 'GET' && status >= 200 && status < 300) {
            responseCache.set(targetUrl, {
              status,
              headers: data.headers || {},
              data: data.data,
              cachedAt: Date.now(),
            });
          }

          const logEntry = {
            id: requestId,
            time: new Date().toLocaleTimeString(),
            method: req.method,
            url: targetUrl,
            status,
            statusText: data.statusText || '',
            elapsed,
            fromCache: false,
            headers: data.headers || {},
            data: data.data,
            requestBody: rawBody || null,
          };
          requestLogs.unshift(logEntry);
          if (requestLogs.length > 100) requestLogs.pop();

          const statusColor = status >= 400 ? '\x1b[31m' : '\x1b[32m';
          logMessage(
            '⬅️',
            `${req.method} ${targetUrl} [${status} ${data.statusText || ''} - ${elapsed}ms]`,
            statusColor,
          );

          broadcastStatusToDashboards();

          const responseHeaders = { ...(data.headers || {}) };
          // Delete compression headers because the browser already uncompressed the payload in the SharePoint tab
          delete responseHeaders['content-encoding'];
          delete responseHeaders['content-length'];
          delete responseHeaders['transfer-encoding'];

          if (!responseHeaders['content-type']) {
            responseHeaders['content-type'] = 'application/json; charset=utf-8';
          }

          res.writeHead(status, responseHeaders);
          if (typeof data.data === 'object') {
            res.end(JSON.stringify(data.data));
          } else {
            res.end(data.data || '');
          }
        },
        reject: (err) => {
          clearTimeout(timeoutTimer);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: err.message || 'Bridge execution failed' } }));
        },
      });

      targetSocket.send(JSON.stringify(bridgeMessage));
    });
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const parsedReqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const isDashboard = parsedReqUrl.searchParams.get('role') === 'dashboard';

    if (isDashboard) {
      dashboardSockets.add(ws);
      // Send initial status immediately on connect
      ws.send(JSON.stringify({ type: 'STATUS_UPDATE', status: getStatusPayload() }));

      ws.on('close', () => {
        dashboardSockets.delete(ws);
      });
      return;
    }

    // Otherwise, this is a SharePoint tab worker
    activeTabSockets.add(ws);
    logMessage('🔌', `SharePoint tab connected!`, '\x1b[32m');
    broadcastStatusToDashboards();

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'HELLO') {
          activeTabInfo = {
            siteUrl: msg.siteUrl,
            webUrl: msg.webUrl,
            webAbsoluteUrl: msg.webAbsoluteUrl,
            user: msg.user,
            title: msg.title,
            connectedAt: new Date().toISOString(),
          };
          logMessage(
            '🟢',
            `SharePoint Session Authenticated: ${activeTabInfo.webAbsoluteUrl || activeTabInfo.siteUrl} (${activeTabInfo.user})`,
            '\x1b[32m',
          );
          broadcastStatusToDashboards();
        } else if (msg.type === 'RESPONSE') {
          const pending = pendingRequests.get(msg.id);
          if (pending) {
            pendingRequests.delete(msg.id);
            pending.resolve(msg);
          }
        }
      } catch (e) {
        logMessage('❌', `Failed to parse client message: ${e.message}`, '\x1b[31m');
      }
    });

    ws.on('close', () => {
      activeTabSockets.delete(ws);
      if (activeTabSockets.size === 0) {
        activeTabInfo = null;
        logMessage('🔴', `SharePoint tab disconnected. Waiting for reconnection...`, '\x1b[33m');
      }
      broadcastStatusToDashboards();
    });

    ws.on('error', (err) => {
      logMessage('❌', `WebSocket error: ${err.message}`, '\x1b[31m');
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `\x1b[31m[SP Bridge Error]\x1b[0m Port ${PORT} (${PROFILE_NAME}) is already in use by another process.`,
        );
      }
      reject(err);
    });

    server.listen(PORT, () => {
      resolve({
        server,
        wss,
        name: PROFILE_NAME,
        port: PORT,
        host: HOST,
        targetUrl: TARGET_SP_URL,
        close: () => {
          wss.close();
          server.close();
        },
      });
    });
  });
}

/**
 * Starts all configured SharePoint bridge profiles (or a single requested profile).
 * @param {Object} options
 * @returns {Promise<Array<Object>>}
 */
export async function createSharePointBridge(options = {}) {
  const loadedConfig = await loadServerConfig(options.configPath);

  // If specific profile is requested
  if (options.profile && loadedConfig.profiles && loadedConfig.profiles[options.profile]) {
    const profileDef = loadedConfig.profiles[options.profile];
    const single = await createSingleBridge({
      ...loadedConfig,
      ...profileDef,
      name: options.profile,
      ...options,
    });
    printStartupBanner([single], loadedConfig.resolvedFrom);
    return [single];
  }

  // If specific port/url passed on CLI directly
  if (options.port || options.sharepointUrl) {
    const single = await createSingleBridge({
      ...loadedConfig,
      ...options,
      name: options.profile || 'custom',
    });
    printStartupBanner([single], loadedConfig.resolvedFrom);
    return [single];
  }

  // If profiles dictionary is defined in config, start ALL profiles!
  if (loadedConfig.profiles && Object.keys(loadedConfig.profiles).length > 0) {
    const profileEntries = Object.entries(loadedConfig.profiles);
    const allProfileDefs = profileEntries.map(([name, conf]) => ({
      name,
      port: conf.port,
      sharepointUrl: conf.sharepointUrl,
    }));

    const instances = await Promise.all(
      profileEntries.map(([name, conf]) =>
        createSingleBridge({
          ...loadedConfig,
          ...conf,
          name,
          allProfiles: allProfileDefs,
        }),
      ),
    );

    printStartupBanner(instances, loadedConfig.resolvedFrom);
    return instances;
  }

  // Fallback to single bridge with root config
  const single = await createSingleBridge({
    ...loadedConfig,
    ...options,
    name: 'default',
  });
  printStartupBanner([single], loadedConfig.resolvedFrom);
  return [single];
}

function printStartupBanner(instances, configPath) {
  console.log('\n' + '='.repeat(76));
  console.log(
    `\x1b[32m\x1b[1m  📡 SharePoint Tab Dev Bridge - Active Instances (${instances.length})\x1b[0m`,
  );
  if (configPath) {
    console.log(`  ⚙️  Config: \x1b[90m${path.relative(process.cwd(), configPath)}\x1b[0m`);
  }
  console.log('='.repeat(76));

  for (const inst of instances) {
    console.log(
      `  🔹 \x1b[35m[${inst.name.toUpperCase()}]\x1b[0m Dashboard: \x1b[36mhttp://localhost:${inst.port}/\x1b[0m`,
    );
    if (inst.targetUrl) {
      console.log(`     Target Site: \x1b[33m${inst.targetUrl}\x1b[0m`);
    }
  }
  console.log('='.repeat(76));
  console.log(`  👉 Open your SharePoint site, visit the dashboard, and run the bookmarklet!`);
  console.log('='.repeat(76) + '\n');
}
