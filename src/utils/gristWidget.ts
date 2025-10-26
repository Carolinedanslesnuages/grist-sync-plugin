/**
 * Utility for integrating with Grist Custom Widget API
 * Automatically detects if running within a Grist environment
 * and provides access to Grist document information
 */

import type { GristConfig } from '../config';
import { parseGristUrl } from './grist';

// Type for grist global (will be undefined if not in Grist environment)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GristAPI = any;

interface GristWidgetInfo {
  isInGrist: boolean;
  docId?: string;
  tableId?: string;
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
 * Extract Grist info from URL query parameters
 */
function extractFromQueryParams(): Partial<GristWidgetInfo> {
  const result: Partial<GristWidgetInfo> = {};
  
  try {
    if (typeof window === 'undefined' || !window.location) {
      return result;
    }
    
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('docId')) {
      result.docId = params.get('docId') || undefined;
      console.log('[Grist Auto-Detection] Found docId in query params:', result.docId);
    }
    
    if (params.has('tableId') || params.has('table')) {
      result.tableId = params.get('tableId') || params.get('table') || undefined;
      console.log('[Grist Auto-Detection] Found tableId in query params:', result.tableId);
    }
    
    if (params.has('gristApiUrl')) {
      result.gristApiUrl = params.get('gristApiUrl') || undefined;
      console.log('[Grist Auto-Detection] Found gristApiUrl in query params:', result.gristApiUrl);
    }
    
    if (params.has('apiTokenGrist')) {
      result.accessToken = params.get('apiTokenGrist') || undefined;
      console.log('[Grist Auto-Detection] Found apiTokenGrist in query params');
    }
    
  } catch (e) {
    console.debug('[Grist Auto-Detection] Error extracting query params:', e);
  }
  
  return result;
}

/**
 * Extract Grist info from document referrer
 */
function extractFromReferrer(): Partial<GristWidgetInfo> {
  const result: Partial<GristWidgetInfo> = {};
  
  try {
    if (typeof window === 'undefined' || !document.referrer) {
      return result;
    }
    
    const referrerUrl = document.referrer;
    console.log('[Grist Auto-Detection] Analyzing referrer:', referrerUrl);
    
    // Use parseGristUrl to extract docId, tableId, and API URL from referrer
    const parsed = parseGristUrl(referrerUrl);
    
    if (parsed.gristApiUrl) {
      result.gristApiUrl = parsed.gristApiUrl;
      console.log('[Grist Auto-Detection] Detected API URL from referrer:', result.gristApiUrl);
    }
    
    if (parsed.docId) {
      result.docId = parsed.docId;
      console.log('[Grist Auto-Detection] Detected Document ID from referrer:', result.docId);
    }
    
    if (parsed.tableId) {
      result.tableId = parsed.tableId;
      console.log('[Grist Auto-Detection] Detected Table ID from referrer:', result.tableId);
    }
    
  } catch (e) {
    console.debug('[Grist Auto-Detection] Error extracting from referrer:', e);
  }
  
  return result;
}

/**
 * Extract Grist info from parent window
 */
function extractFromParent(): Partial<GristWidgetInfo> {
  const result: Partial<GristWidgetInfo> = {};
  
  try {
    if (typeof window === 'undefined' || window.parent === window) {
      return result;
    }
    
    // If we have a parent window (iframe), we might be embedded
    // Try to extract info from parent location if accessible
    try {
      if (window.parent.location && window.parent.location.href) {
        const parentUrl = window.parent.location.href;
        console.log('[Grist Auto-Detection] Analyzing parent location');
        
        // Use parseGristUrl to extract docId, tableId, and API URL from parent
        const parsed = parseGristUrl(parentUrl);
        
        if (parsed.gristApiUrl) {
          result.gristApiUrl = parsed.gristApiUrl;
          console.log('[Grist Auto-Detection] Detected API URL from parent:', result.gristApiUrl);
        }
        
        if (parsed.docId) {
          result.docId = parsed.docId;
          console.log('[Grist Auto-Detection] Detected Document ID from parent:', result.docId);
        }
        
        if (parsed.tableId) {
          result.tableId = parsed.tableId;
          console.log('[Grist Auto-Detection] Detected Table ID from parent:', result.tableId);
        }
      }
    } catch (e) {
      // Cross-origin parent, cannot access location - this is expected
      console.debug('[Grist Auto-Detection] Cannot access parent location (likely cross-origin)');
    }
    
  } catch (e) {
    console.debug('[Grist Auto-Detection] Error extracting from parent:', e);
  }
  
  return result;
}

/**
 * Initialize connection to Grist and retrieve document information
 * Uses multi-strategy detection: Grist Widget API → parent → referrer → query params
 */
export async function initializeGristWidget(): Promise<GristWidgetInfo> {
  console.log('[Grist Auto-Detection] Starting initialization...');
  
  const result: GristWidgetInfo = {
    isInGrist: false,
  };

  let wsProvidedDocId: string | undefined;

  // Strategy 1: Try Grist Widget API (when running as a custom widget)
  if (isRunningInGrist()) {
    const grist = getGristAPI();
    if (grist) {
      try {
        console.log('[Grist Auto-Detection] Calling grist.ready()...');
        // Initialize the Grist plugin API
        await grist.ready();
        console.log('[Grist Auto-Detection] grist.ready() completed successfully');
        
        result.isInGrist = true;

        // Extract Grist API URL from window location
        if (window.location && window.location.origin) {
          result.gristApiUrl = window.location.origin;
          console.log('[Grist Auto-Detection] Detected API URL:', result.gristApiUrl);
        }

        // Extract document ID and table ID from URL using parseGristUrl
        if (window.location && window.location.href) {
          console.log('[Grist Auto-Detection] Parsing widget URL:', window.location.href);
          const parsed = parseGristUrl(window.location.href);
          
          if (parsed.docId) {
            result.docId = parsed.docId;
            wsProvidedDocId = parsed.docId; // Save for use in subsequent strategies
            console.log('[Grist Auto-Detection] Detected Document ID from widget URL:', result.docId);
          } else {
            console.log('[Grist Auto-Detection] Could not extract Document ID from widget URL');
          }
          
          if (parsed.tableId) {
            result.tableId = parsed.tableId;
            console.log('[Grist Auto-Detection] Detected Table ID from widget URL:', result.tableId);
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

        console.log('[Grist Auto-Detection] Final result from Grist API:', result);
        return result;

      } catch (error) {
        console.error('[Grist Auto-Detection] Error initializing Grist widget:', error);
        result.isInGrist = false;
      }
    }
  }

  // Strategy 2: Try to extract from parent window (iframe context)
  console.log('[Grist Auto-Detection] Trying parent window detection...');
  const parentInfo = extractFromParent();
  if (parentInfo.docId || parentInfo.gristApiUrl || parentInfo.tableId) {
    console.log('[Grist Auto-Detection] Found info from parent:', parentInfo);
    // Preserve WS-provided docId if available
    if (!result.docId && parentInfo.docId) {
      result.docId = wsProvidedDocId || parentInfo.docId;
    }
    if (!result.gristApiUrl && parentInfo.gristApiUrl) {
      result.gristApiUrl = parentInfo.gristApiUrl;
    }
    if (!result.tableId && parentInfo.tableId) {
      result.tableId = parentInfo.tableId;
    }
    result.isInGrist = true;
  }

  // Strategy 3: Try to extract from document.referrer
  console.log('[Grist Auto-Detection] Trying referrer detection...');
  const referrerInfo = extractFromReferrer();
  if (referrerInfo.docId || referrerInfo.gristApiUrl || referrerInfo.tableId) {
    console.log('[Grist Auto-Detection] Found info from referrer:', referrerInfo);
    // Only override if not already set, but preserve WS-provided docId
    if (!result.docId && referrerInfo.docId) {
      result.docId = wsProvidedDocId || referrerInfo.docId;
    }
    if (!result.gristApiUrl && referrerInfo.gristApiUrl) {
      result.gristApiUrl = referrerInfo.gristApiUrl;
    }
    if (!result.tableId && referrerInfo.tableId) {
      result.tableId = referrerInfo.tableId;
    }
    if (!result.accessToken && referrerInfo.accessToken) {
      result.accessToken = referrerInfo.accessToken;
    }
    result.isInGrist = true;
  }

  // Strategy 4: Try to extract from query parameters (useful for development)
  console.log('[Grist Auto-Detection] Trying query parameter detection...');
  const queryInfo = extractFromQueryParams();
  if (queryInfo.docId || queryInfo.gristApiUrl || queryInfo.tableId || queryInfo.accessToken) {
    console.log('[Grist Auto-Detection] Found info from query params:', queryInfo);
    // Only override if not already set, but preserve WS-provided docId
    if (!result.docId && queryInfo.docId) {
      result.docId = wsProvidedDocId || queryInfo.docId;
    }
    if (!result.gristApiUrl && queryInfo.gristApiUrl) {
      result.gristApiUrl = queryInfo.gristApiUrl;
    }
    if (!result.tableId && queryInfo.tableId) {
      result.tableId = queryInfo.tableId;
    }
    if (!result.accessToken && queryInfo.accessToken) {
      result.accessToken = queryInfo.accessToken;
    }
    result.isInGrist = true;
  }

  console.log('[Grist Auto-Detection] Final result:', result);
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

  if (gristInfo.tableId) {
    updatedConfig.tableId = gristInfo.tableId;
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
