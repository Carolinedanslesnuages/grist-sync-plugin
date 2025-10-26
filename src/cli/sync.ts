#!/usr/bin/env node

/**
 * CLI Sync Script for Grist Sync Plugin
 * 
 * This script runs the synchronization based on saved configuration.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SyncService } from '../sync/syncService.js';
import type { SyncConfig } from '../sync/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main sync function
 */
async function main(): Promise<void> {
  console.log('🔄 Grist Sync - Starting synchronization\n');

  try {
    // Load configuration
    const config = await loadConfiguration();

    // Create sync service
    const syncService = new SyncService(config);

    // Execute sync
    console.log('📊 Executing synchronization...\n');
    const result = await syncService.sync();

    // Display results
    console.log('\n📈 Synchronization Results:');
    console.log(`  Added: ${result.added}`);
    console.log(`  Updated: ${result.updated}`);
    console.log(`  Unchanged: ${result.unchanged}`);
    console.log(`  Errors: ${result.errors}`);
    console.log(`  Duration: ${result.duration}ms\n`);

    if (result.details.length > 0) {
      console.log('📋 Details:');
      result.details.forEach(detail => console.log(`  ${detail}`));
      console.log();
    }

    if (result.success) {
      console.log('✅ Synchronization completed successfully!\n');
      process.exit(0);
    } else {
      console.error('❌ Synchronization failed!\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Sync failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Load configuration from file
 */
async function loadConfiguration(): Promise<SyncConfig> {
  const configPath = path.join(__dirname, '../../config/grist-sync.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Configuration file not found: ${configPath}\n` +
      'Please run "npm run cli:setup" first to create the configuration.'
    );
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: SyncConfig = JSON.parse(configContent);

    // Expand environment variables
    config.grist.apiToken = expandEnvVar(config.grist.apiToken);
    
    if (config.source.headers) {
      for (const [key, value] of Object.entries(config.source.headers)) {
        config.source.headers[key] = expandEnvVar(value);
      }
    }

    // Validate required fields
    if (!config.grist.docId || !config.grist.tableId) {
      throw new Error('Configuration is missing required fields (docId, tableId)');
    }

    return config;
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Expand environment variable references in a string
 */
function expandEnvVar(value: string | undefined): string | undefined {
  if (!value) return value;
  
  return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    const envValue = process.env[varName];
    if (!envValue) {
      console.warn(`⚠️  Warning: Environment variable ${varName} is not set`);
      return '';
    }
    return envValue;
  });
}

// Run the sync
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
