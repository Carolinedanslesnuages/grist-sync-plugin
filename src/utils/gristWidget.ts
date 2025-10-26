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
  // Check if grist object is available (provided by Grist when running as a widget)
  try {
    return typeof grist !== 'undefined' && grist !== null && typeof grist.ready === 'function';
  } catch (e) {
    // grist is not defined, we're not in a Grist environment
    return false;
  }
}

/**
 * Initialize connection to Grist and retrieve document information
 */
export async function initializeGristWidget(): Promise<GristWidgetInfo> {
  const result: GristWidgetInfo = {
    isInGrist: false,
  };

  if (!isRunningInGrist()) {
    return result;
  }

  try {
    // Initialize the Grist plugin API
    await grist.ready();
    
    result.isInGrist = true;

    // Get the document ID
    const docInfo = await grist.getTable('_grist_DocInfo');
    if (docInfo && docInfo.getRecords) {
      const records = await docInfo.getRecords();
      if (records && records.length > 0) {
        // Document ID is available through the API
        // We'll get it from the URL instead as it's more reliable
      }
    }

    // Extract Grist API URL from window location
    if (window.location && window.location.origin) {
      result.gristApiUrl = window.location.origin;
    }

    // Extract document ID from URL
    // Grist URLs are typically: https://docs.getgrist.com/doc/DOC_ID or http://localhost:8484/doc/DOC_ID
    const urlPath = window.location.pathname;
    const docMatch = urlPath.match(/\/doc\/([^\/]+)/);
    if (docMatch && docMatch[1]) {
      result.docId = docMatch[1];
    }

    // Try to get access token from Grist API
    // Note: This may not be available depending on Grist version and security settings
    try {
      const accessInfo = await grist.docApi.getAccessInfo?.();
      if (accessInfo && accessInfo.token) {
        result.accessToken = accessInfo.token;
      }
    } catch (e) {
      // Access token might not be available, which is fine
      console.info('Could not retrieve access token from Grist API:', e);
    }

  } catch (error) {
    console.warn('Error initializing Grist widget:', error);
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
    return;
  }

  try {
    await grist.ready();
    grist.onRecords((records: unknown) => {
      console.log('Grist records updated:', records);
      callback();
    });
  } catch (error) {
    console.warn('Error subscribing to Grist changes:', error);
  }
}
