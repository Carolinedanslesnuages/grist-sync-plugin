// src/utils/gristWidget.ts
/**
 * Utility for integrating with Grist Custom Widget API
 * Automatically detects if running within a Grist environment
 * and provides access to Grist document information
 */

import type { GristConfig } from '../config';

// Type for grist global (will be undefined if not in Grist environment)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const grist: any;

interface GristWidgetInfo {
  isInGrist: boolean;
  docId?: string;
  gristApiUrl?: string;
  accessToken?: string;
}

/**
 * Check if the plugin is running within a Grist Custom Widget
 */
export function isRunningInGrist(): boolean {
  try {
    return typeof grist !== 'undefined' && grist !== null && typeof grist.ready === 'function';
  } catch (e) {
    return false;
  }
}

/**
 * Try multiple URL patterns to extract a Grist document ID.
 * Supports:
 * - /doc/<docId>
 * - /o/<org>/doc/<docId>
 * - /<docId>/<docName>/p/<n>  (pattern seen in local dev)
 */
function extractDocIdFromPath(pathname: string): string | null {
  if (!pathname) return null;

  // /doc/<id>
  let m = pathname.match(/\/doc\/([^\/]+)/);
  if (m && m[1]) return m[1];

  // /o/<org>/doc/<id>
  m = pathname.match(/\/o\/[^\/]+\/doc\/([^\/]+)/);
  if (m && m[1]) return m[1];

  // /<docId>/<something>/p/<n>  (local Grist dev pattern)
  m = pathname.match(/^\/([^\/]+)\/[^\/]+\/p\/\d+/);
  if (m && m[1]) return m[1];

  // Generic fallback: first path segment might be the docId
  m = pathname.match(/^\/([^\/]+)(?:\//|$)/);
  if (m && m[1]) return m[1];

  return null;
}

/**
 * Initialize connection to Grist and retrieve document information
 */
export async function initializeGristWidget(): Promise<GristWidgetInfo> {
  const result: GristWidgetInfo = {
    isInGrist: false,
  };

  // If running as an actual Grist widget, prefer grist API
  if (isRunningInGrist()) {
    try {
      await grist.ready();
      result.isInGrist = true;

      // Try to get access token from Grist API if available
      try {
        const accessInfo = await grist.docApi?.getAccessInfo?.();
        if (accessInfo && accessInfo.token) {
          result.accessToken = accessInfo.token;
        }
      } catch (e) {
        console.info('Could not retrieve access token from Grist API:', e);
      }
    } catch (err) {
      console.warn('Error initializing grist API:', err);
      result.isInGrist = false;
    }
  }

  // Multi-strategy detection for origin / path / docId:
  // 1) try parent window (if same-origin)
  // 2) fallback to document.referrer (works for cross-origin iframe)
  // 3) fallback to current window.location (useful when app served by Grist or when opened directly)
  // 4) fallback to query params (?docId=...&gristApiUrl=...)
  try {
    let gristOrigin: string | undefined;
    let gristPath: string | undefined;

    // Strategy 1: try reading parent (may throw if cross-origin)
    try {
      if (window.parent && window.parent !== window) {
        // protect with try/catch — may be blocked cross-origin
        gristOrigin = window.parent.location?.origin;
        gristPath = window.parent.location?.pathname;
      }
    } catch (e) {
      // access to parent blocked by browser -> fallback to referrer
      console.debug('Access to window.parent blocked (cross-origin), will try document.referrer', e);
    }

    // Strategy 2: use document.referrer (commonly set when loaded in iframe)
    if ((!gristOrigin || !gristPath) && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        gristOrigin = gristOrigin || ref.origin;
        gristPath = gristPath || ref.pathname;
      } catch (e) {
        console.debug('document.referrer exists but could not be parsed as URL', e);
      }
    }

    // Strategy 3: use current window.location (useful when app is served by Grist or opened directly)
    if (!gristOrigin && window.location?.origin) {
      gristOrigin = window.location.origin;
    }
    if (!gristPath && window.location?.pathname) {
      gristPath = window.location.pathname;
    }

    // Strategy 4: query params fallback (handy in dev)
    try {
      const sp = new URLSearchParams(window.location.search);
      if (!gristOrigin && sp.get('gristApiUrl')) {
        gristOrigin = sp.get('gristApiUrl') || undefined;
      }
      if (!gristPath && sp.get('docId')) {
        // If docId passed as query param, set it below
      }
      // also allow ?docId=... directly
      const qDoc = sp.get('docId');
      if (qDoc) {
        result.docId = qDoc;
      }
    } catch (e) {
      // ignore
    }

    if (gristOrigin) {
      result.gristApiUrl = gristOrigin;
    }

    if (gristPath) {
      const docIdFromPath = extractDocIdFromPath(gristPath);
      if (docIdFromPath) result.docId = result.docId || docIdFromPath;
    }

    // Last-resort: if still no docId, try to extract from window.location.pathname (again)
    if (!result.docId) {
      const docId = extractDocIdFromPath(window.location.pathname || '');
      if (docId) result.docId = docId;
    }
  } catch (e) {
    console.warn('Error extracting Grist info from page environment:', e);
  }

  return result;
}

/**
 * Apply Grist widget information to configuration
 */
export function applyGristInfoToConfig(
  config: GristConfig,
  gristInfo: GristWidgetInfo
): GristConfig {
  const updatedConfig = { ...config };

  if (gristInfo.docId) {
    updatedConfig.docId = gristInfo.docId;
  }

  if (gristInfo.gristApiUrl) {
    updatedConfig.gristApiUrl = gristInfo.gristApiUrl;
  }

  // If we got an access token from the widget API, apply it to the config token field
  if (gristInfo.accessToken) {
    updatedConfig.apiTokenGrist = gristInfo.accessToken;
  }

  return updatedConfig;
}