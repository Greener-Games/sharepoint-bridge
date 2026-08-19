import type { Server as HttpServer } from 'http';
import type { WebSocketServer } from 'ws';

export interface SharePointBridgeProfile {
  port: number;
  sharepointUrl?: string;
  host?: string;
}

export interface SharePointBridgeOptions {
  name?: string;
  port?: number;
  host?: string;
  sharepointUrl?: string;
  configPath?: string;
  profile?: string;
  profiles?: Record<string, SharePointBridgeProfile>;
}

export interface SharePointBridgeInstance {
  server: HttpServer;
  wss: WebSocketServer;
  name: string;
  port: number;
  host: string;
  targetUrl?: string;
  close: () => void;
}

/**
 * Starts all configured SharePoint bridge profiles (or a single requested profile).
 */
export function createSharePointBridge(
  options?: SharePointBridgeOptions,
): Promise<SharePointBridgeInstance[]>;

/**
 * Creates and starts a single SharePoint Tab Dev Bridge HTTP + WebSocket Server instance.
 */
export function createSingleBridge(
  options?: SharePointBridgeOptions,
): Promise<SharePointBridgeInstance>;

/**
 * Loads configuration from .sharepoint/serverconfig.js (or fallback locations)
 */
export function loadServerConfig(
  configPath?: string,
): Promise<SharePointBridgeOptions & { resolvedFrom?: string }>;

/**
 * Generates the in-browser WebSocket listener script to inject into the SharePoint tab.
 */
export function generateClientSnippet(port?: number, host?: string): string;

/**
 * Generates the bookmarklet href string for 1-click browser activation.
 */
export function generateBookmarklet(port?: number, host?: string): string;
