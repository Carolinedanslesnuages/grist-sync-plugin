/**
 * Sync Service for synchronizing data between external sources and Grist
 */

import type { SyncConfig, SyncResult, SyncStatus, SourceProvider } from './types';
import { GristClient } from '../utils/grist';
import { RestProvider, MockProvider } from './providers/restProvider';

/**
 * Main sync service
 */
export class SyncService {
  private config: SyncConfig;
  private gristClient: GristClient;
  private sourceProvider: SourceProvider;
  private status: SyncStatus;
  private syncInterval?: ReturnType<typeof setInterval>;

  constructor(config: SyncConfig) {
    this.config = config;
    
    // Initialize Grist client
    this.gristClient = new GristClient({
      docId: config.grist.docId,
      tableId: config.grist.tableId,
      apiTokenGrist: config.grist.apiToken,
      gristApiUrl: config.grist.gristApiUrl,
      autoCreateColumns: config.sync.autoCreateColumns ?? true,
      uniqueKey: config.sync.uniqueKey,
      syncMode: config.sync.mode,
    });

    // Initialize source provider
    this.sourceProvider = this.createSourceProvider(config.source);

    // Initialize status
    this.status = {
      running: false,
      totalSynced: 0,
      totalErrors: 0,
    };
  }

  /**
   * Create source provider based on configuration
   */
  private createSourceProvider(sourceConfig: typeof this.config.source): SourceProvider {
    switch (sourceConfig.type) {
      case 'rest':
        return new RestProvider(sourceConfig);
      case 'mock':
        return new MockProvider([]);
      default:
        throw new Error(`Unsupported source type: ${sourceConfig.type}`);
    }
  }

  /**
   * Test connection to both Grist and source
   */
  async testConnections(): Promise<{ grist: boolean; source: boolean }> {
    const results = { grist: false, source: false };

    try {
      // Test Grist connection by fetching columns
      await this.gristClient.getColumns();
      results.grist = true;
    } catch (error) {
      console.error('Grist connection test failed:', error);
    }

    try {
      // Test source connection
      results.source = await this.sourceProvider.testConnection();
    } catch (error) {
      console.error('Source connection test failed:', error);
    }

    return results;
  }

  /**
   * Execute synchronization
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    this.status.running = true;
    this.status.lastRun = new Date();

    const result: SyncResult = {
      success: false,
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: 0,
      details: [],
      duration: 0,
    };

    try {
      // Fetch data from source
      result.details.push('Fetching data from source...');
      const sourceData = await this.fetchDataWithRetry();
      result.details.push(`Fetched ${sourceData.length} records from source`);

      // Apply mapping
      result.details.push('Applying field mapping...');
      const mappedData = this.applyMapping(sourceData);
      result.details.push(`Mapped ${mappedData.length} records`);

      // Ensure columns exist in Grist
      if (this.config.sync.autoCreateColumns) {
        result.details.push('Ensuring columns exist in Grist...');
        await this.ensureColumns(mappedData);
      }

      // Sync records to Grist
      result.details.push('Syncing records to Grist...');
      const syncResult = await this.gristClient.syncRecords(mappedData);
      
      // Handle both SyncResult and DryRunResult
      if ('added' in syncResult) {
        result.added = syncResult.added;
        result.updated = syncResult.updated;
        result.unchanged = syncResult.unchanged;
        result.errors = syncResult.errors;
        result.details.push(...syncResult.details);
      } else {
        // DryRun result
        result.details.push('Dry run completed (no actual sync)');
      }

      result.success = true;
      this.status.lastSuccess = new Date();
      this.status.totalSynced += result.added + result.updated;
      
      result.details.push('✓ Synchronization completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors = 1;
      result.details.push(`✗ Synchronization failed: ${errorMessage}`);
      this.status.lastError = errorMessage;
      this.status.totalErrors += 1;
    } finally {
      this.status.running = false;
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Fetch data with retry logic
   */
  private async fetchDataWithRetry(): Promise<any[]> {
    const maxAttempts = this.config.sync.retryAttempts ?? 3;
    const retryDelay = this.config.sync.retryDelay ?? 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.sourceProvider.fetchData();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        console.warn(`Fetch attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    throw new Error('Failed to fetch data after all retry attempts');
  }

  /**
   * Apply field mapping to source data
   */
  private applyMapping(sourceData: any[]): Array<Record<string, any>> {
    return sourceData.map(record => {
      const mappedRecord: Record<string, any> = {};
      
      for (const [targetField, sourceField] of Object.entries(this.config.mapping)) {
        // Support nested field access using dot notation
        const value = this.getNestedValue(record, sourceField);
        mappedRecord[targetField] = value;
      }
      
      return mappedRecord;
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, part) => {
      return current?.[part];
    }, obj);
  }

  /**
   * Ensure all mapped columns exist in Grist
   */
  private async ensureColumns(records: Array<Record<string, any>>): Promise<void> {
    if (records.length === 0) {
      return;
    }

    // Get all unique field names from the mapped data
    const fieldNames = new Set<string>();
    for (const record of records) {
      for (const fieldName of Object.keys(record)) {
        fieldNames.add(fieldName);
      }
    }

    // Create columns if needed
    const fieldNamesArray = Array.from(fieldNames);
    await this.gristClient.ensureColumnsExist(fieldNamesArray.map(name => ({ [name]: null })));
  }

  /**
   * Get current status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Start scheduled sync
   * Note: This is a simplified implementation. In production, use a proper cron library.
   */
  startScheduled(): void {
    if (!this.config.sync.schedule) {
      throw new Error('No schedule configured');
    }

    // For MVP, we'll use a simple interval based on the cron pattern
    // A full implementation would parse the cron expression properly
    const intervalMs = this.parseCronToInterval(this.config.sync.schedule);
    
    this.syncInterval = setInterval(() => {
      this.sync().catch(error => {
        console.error('Scheduled sync failed:', error);
      });
    }, intervalMs);

    console.log(`Scheduled sync started with interval: ${intervalMs}ms`);
  }

  /**
   * Stop scheduled sync
   */
  stopScheduled(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
      console.log('Scheduled sync stopped');
    }
  }

  /**
   * Parse cron expression to interval (simplified)
   * This is a basic implementation for MVP purposes
   */
  private parseCronToInterval(cron: string): number {
    // Default to 6 hours for the example pattern "0 */6 * * *"
    // In production, use a proper cron parser library
    const parts = cron.split(' ');
    if (parts.length >= 5) {
      const hours = parts[1];
      if (hours && hours.startsWith('*/')) {
        const interval = parseInt(hours.substring(2), 10);
        if (!isNaN(interval)) {
          return interval * 60 * 60 * 1000; // Convert hours to milliseconds
        }
      }
    }
    
    // Default to 1 hour if unable to parse
    return 60 * 60 * 1000;
  }
}
