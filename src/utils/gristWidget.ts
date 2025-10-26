/**
 * Utility for integrating with Grist Custom Widget API
 * Automatically detects if running within a Grist environment
 * and provides access to Grist document information
 */

import type { GristConfig } from '../config';

// Type for grist global (will be undefined if not in Grist environment)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GristAPI = any;

interface GristWidgetInfo {
  isInGrist: boolean;
  docId?: string;
  gristApiUrl?: string;
  accessToken?: string;
}

/**
 * Get the Grist API object from the window if available
 */
function getGristAPI(): GristAPI | null {
  try {
    // In a browser environment, grist is available as window.grist
    if (typeof window !== 'undefined' && (window as any).grist) {
      return (window as any).grist;
    }
    return null;
  } catch (e) {
    console.debug('Error accessing window.grist:', e);
    return null;
  }
}

/**
 * Check if the plugin is running within a Grist Custom Widget
 */
export function isRunningInGrist(): boolean {
  // Check if grist object is available (provided by Grist when running as a widget)
  try {
    const grist = getGristAPI();
    const result = grist !== null && typeof grist.ready === 'function';
    console.log('[Grist Auto-Detection] isRunningInGrist:', result);
    return result;
  } catch (e) {
    console.debug('[Grist Auto-Detection] Error checking grist environment:', e);
    return false;
  }
}

/**
 * Initialize connection to Grist and retrieve document information
 */
export async function initializeGristWidget(): Promise<GristWidgetInfo> {
  console.log('[Grist Auto-Detection] Starting initialization...');
  
  const result: GristWidgetInfo = {
    isInGrist: false,
  };

  if (!isRunningInGrist()) {
    console.log('[Grist Auto-Detection] Not running in Grist environment');
    return result;
  }

  const grist = getGristAPI();
  if (!grist) {
    console.log('[Grist Auto-Detection] Grist API not available');
    return result;
  }

  try {
    console.log('[Grist Auto-Detection] Calling grist.ready()...');
    // Initialize the Grist plugin API
    await grist.ready();
    console.log('[Grist Auto-Detection] grist.ready() completed successfully');
    
    result.isInGrist = true;

    // Extract Grist API URL and document ID
    // When running as a custom widget, we might be in an iframe
    // Try multiple sources to find the document URL
    
    let gristOrigin: string | null = null;
    let gristPath: string | null = null;
    
    // Strategy 1: Check if we're in an iframe and can access parent
    try {
      if (window.parent && window.parent !== window && window.parent.location) {
        gristOrigin = window.parent.location.origin;
        gristPath = window.parent.location.pathname;
        console.log('[Grist Auto-Detection] Detected from parent window - origin:', gristOrigin, 'path:', gristPath);
      }
    } catch (e) {
      // Cross-origin access denied, try other methods
      console.debug('[Grist Auto-Detection] Cannot access parent.location (cross-origin):', e);
    }
    
    // Strategy 2: Use document.referrer if parent is not accessible
    if (!gristOrigin && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        gristOrigin = referrerUrl.origin;
        gristPath = referrerUrl.pathname;
        console.log('[Grist Auto-Detection] Detected from referrer - origin:', gristOrigin, 'path:', gristPath);
      } catch (e) {
        console.debug('[Grist Auto-Detection] Could not parse referrer URL:', e);
      }
    }
    
    // Strategy 3: Fallback to current window location
    if (!gristOrigin) {
      gristOrigin = window.location.origin;
      gristPath = window.location.pathname;
      console.log('[Grist Auto-Detection] Using current window - origin:', gristOrigin, 'path:', gristPath);
    }
    
    // Set the Grist API URL
    if (gristOrigin) {
      result.gristApiUrl = gristOrigin;
      console.log('[Grist Auto-Detection] Final API URL:', result.gristApiUrl);
    }
    
    // Extract document ID from the path
    // Support multiple URL patterns:
    // - /doc/DOC_ID
    // - /o/ORG/doc/DOC_ID
    // - /doc/DOC_ID/p/...
    if (gristPath) {
      console.log('[Grist Auto-Detection] Parsing path for docId:', gristPath);
      const docMatch = gristPath.match(/\/doc\/([^\/]+)/);
      if (docMatch && docMatch[1]) {
        result.docId = docMatch[1];
        console.log('[Grist Auto-Detection] Detected Document ID:', result.docId);
      } else {
        console.log('[Grist Auto-Detection] Could not extract Document ID from path:', gristPath);
      }
    }

    // Try to get access token from Grist API
    // Note: This may not be available depending on Grist version and security settings
    try {
      console.log('[Grist Auto-Detection] Attempting to retrieve access token...');
      const accessInfo = await grist.docApi.getAccessInfo?.();
      if (accessInfo && accessInfo.token) {
        result.accessToken = accessInfo.token;
        console.log('[Grist Auto-Detection] Access token retrieved successfully');
      } else {
        console.log('[Grist Auto-Detection] No access token in response');
      }
    } catch (e) {
      // Access token might not be available, which is fine
      console.info('[Grist Auto-Detection] Could not retrieve access token from Grist API:', e);
    }

    console.log('[Grist Auto-Detection] Final result:', result);

  } catch (error) {
    console.error('[Grist Auto-Detection] Error initializing Grist widget:', error);
    result.isInGrist = false;
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

  if (gristInfo.accessToken) {
    updatedConfig.apiTokenGrist = gristInfo.accessToken;
  }

  return updatedConfig;
}

/**
 * Subscribe to table changes in Grist (if running as a widget)
 */
export async function subscribeToGristChanges(callback: () => void): Promise<void> {
  if (!isRunningInGrist()) {
    console.log('[Grist Auto-Detection] Not in Grist, skipping subscribeToGristChanges');
    return;
  }

  const grist = getGristAPI();
  if (!grist) {
    console.log('[Grist Auto-Detection] Grist API not available for subscription');
    return;
  }

  try {
    await grist.ready();
    grist.onRecords((records: unknown) => {
      console.log('[Grist Auto-Detection] Grist records updated:', records);
      callback();
    });
  } catch (error) {
    console.warn('[Grist Auto-Detection] Error subscribing to Grist changes:', error);
  }
}
