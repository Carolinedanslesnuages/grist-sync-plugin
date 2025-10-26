/**
 * Types for the Grist Sync Service
 */

/**
 * Configuration for Grist sync
 */
export interface SyncConfig {
  grist: GristConnectionConfig;
  source: SourceConfig;
  mapping: Record<string, string>;
  sync: SyncOptions;
}

/**
 * Grist connection configuration
 */
export interface GristConnectionConfig {
  docId: string;
  tableId: string;
  gristApiUrl: string;
  apiToken?: string;
}

/**
 * Source provider configuration
 */
export interface SourceConfig {
  type: 'rest' | 'google-sheets' | 'sql' | 'mock';
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  credentials?: Record<string, any>;
  query?: string;
  dataPath?: string;
}

/**
 * Sync options
 */
export interface SyncOptions {
  mode: 'add' | 'update' | 'upsert';
  uniqueKey?: string;
  schedule?: string;
  autoCreateColumns?: boolean;
  batchSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Sync status
 */
export interface SyncStatus {
  running: boolean;
  lastRun?: Date;
  lastSuccess?: Date;
  lastError?: string;
  totalSynced: number;
  totalErrors: number;
}

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  added: number;
  updated: number;
  unchanged: number;
  errors: number;
  details: string[];
  duration: number;
}

/**
 * Source provider interface
 */
export interface SourceProvider {
  /**
   * Fetch data from the source
   */
  fetchData(): Promise<any[]>;
  
  /**
   * Test connection to the source
   */
  testConnection(): Promise<boolean>;
}
