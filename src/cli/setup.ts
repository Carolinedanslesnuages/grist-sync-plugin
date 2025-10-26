#!/usr/bin/env node

/**
 * CLI Setup Script for Grist Sync Plugin
 * 
 * This script allows automatic configuration and setup of the Grist sync integration.
 * It checks Grist accessibility, creates/updates integrations, and saves configuration.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SyncConfig, GristConnectionConfig } from '../sync/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CLI setup main function
 */
async function main(): Promise<void> {
  console.log('🚀 Grist Sync Plugin - Setup Wizard\n');

  try {
    // Step 1: Check environment variables
    const config = await checkEnvironmentVariables();

    // Step 2: Test Grist connection
    await testGristConnection(config);

    // Step 3: Load or create sync configuration
    const syncConfig = await setupConfiguration(config);

    // Step 4: Save configuration
    await saveConfiguration(syncConfig);

    // Step 5: Test sync (optional)
    if (process.argv.includes('--test-sync')) {
      await testSync(syncConfig);
    }

    console.log('\n✅ Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Review config/grist-sync.json');
    console.log('  2. Run: npm run sync');
    console.log('  3. Or use the UI to configure mapping\n');
  } catch (error) {
    console.error('\n❌ Setup failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Check required environment variables
 */
async function checkEnvironmentVariables(): Promise<GristConnectionConfig> {
  console.log('📋 Checking environment variables...\n');

  const gristApiUrl = process.env.GRIST_API_URL || 'https://docs.getgrist.com';
  const docId = process.env.GRIST_DOC_ID;
  const tableId = process.env.GRIST_TABLE_ID;
  const apiToken = process.env.GRIST_API_TOKEN;

  if (!docId) {
    throw new Error('GRIST_DOC_ID environment variable is required');
  }

  if (!tableId) {
    throw new Error('GRIST_TABLE_ID environment variable is required');
  }

  if (!apiToken) {
    console.warn('⚠️  Warning: GRIST_API_TOKEN not set. Some operations may fail.\n');
  }

  console.log(`✓ Grist API URL: ${gristApiUrl}`);
  console.log(`✓ Document ID: ${docId}`);
  console.log(`✓ Table ID: ${tableId}`);
  console.log(`✓ API Token: ${apiToken ? '***' + apiToken.slice(-4) : '(not set)'}\n`);

  return {
    gristApiUrl,
    docId,
    tableId,
    apiToken,
  };
}

/**
 * Test Grist connection
 */
async function testGristConnection(config: GristConnectionConfig): Promise<void> {
  console.log('🔗 Testing Grist connection...\n');

  const url = `${config.gristApiUrl}/api/docs/${config.docId}/tables/${config.tableId}/columns`;
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (config.apiToken) {
      headers['Authorization'] = `Bearer ${config.apiToken}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✓ Connection successful! Found ${data.columns?.length || 0} columns\n`);
  } catch (error) {
    throw new Error(`Failed to connect to Grist: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Setup configuration (interactive or from env)
 */
async function setupConfiguration(gristConfig: GristConnectionConfig): Promise<SyncConfig> {
  console.log('⚙️  Setting up configuration...\n');

  // Load example configuration
  const examplePath = path.join(__dirname, '../../config/mapping.example.json');
  let exampleConfig: any = {};
  
  try {
    if (fs.existsSync(examplePath)) {
      exampleConfig = JSON.parse(fs.readFileSync(examplePath, 'utf-8'));
    }
  } catch (error) {
    console.warn('⚠️  Could not load example configuration\n');
  }

  // Build configuration
  const syncConfig: SyncConfig = {
    grist: gristConfig,
    source: {
      type: process.env.SOURCE_TYPE as any || exampleConfig.source?.type || 'rest',
      url: process.env.SOURCE_URL || exampleConfig.source?.url,
      method: process.env.SOURCE_METHOD || exampleConfig.source?.method || 'GET',
      headers: exampleConfig.source?.headers || {},
    },
    mapping: exampleConfig.mapping || {
      id: 'id',
      name: 'name',
      email: 'email',
    },
    sync: {
      mode: (process.env.SYNC_MODE as any) || exampleConfig.sync?.mode || 'upsert',
      uniqueKey: process.env.SYNC_UNIQUE_KEY || exampleConfig.sync?.uniqueKey || 'id',
      schedule: process.env.SYNC_SCHEDULE || exampleConfig.sync?.schedule,
      autoCreateColumns: process.env.AUTO_CREATE_COLUMNS !== 'false',
      batchSize: 100,
      retryAttempts: 3,
      retryDelay: 1000,
    },
  };

  console.log('✓ Configuration created\n');
  return syncConfig;
}

/**
 * Save configuration to file
 */
async function saveConfiguration(config: SyncConfig): Promise<void> {
  console.log('💾 Saving configuration...\n');

  const configDir = path.join(__dirname, '../../config');
  const configPath = path.join(configDir, 'grist-sync.json');

  // Ensure config directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Check if file already exists
  let existingConfig: any = null;
  if (fs.existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      console.log('ℹ️  Existing configuration found, will be updated\n');
    } catch (error) {
      console.warn('⚠️  Could not read existing configuration, creating new file\n');
    }
  }

  // Merge with existing config (idempotent)
  const finalConfig = existingConfig ? { ...existingConfig, ...config } : config;

  // Remove sensitive data before saving (keep only references to env vars)
  const safeConfig = JSON.parse(JSON.stringify(finalConfig));
  if (safeConfig.grist.apiToken) {
    safeConfig.grist.apiToken = '${GRIST_API_TOKEN}';
  }
  if (safeConfig.source.headers?.Authorization) {
    safeConfig.source.headers.Authorization = '${API_TOKEN}';
  }

  // Write configuration
  fs.writeFileSync(configPath, JSON.stringify(safeConfig, null, 2), 'utf-8');
  console.log(`✓ Configuration saved to: ${configPath}\n`);
}

/**
 * Test synchronization
 */
async function testSync(config: SyncConfig): Promise<void> {
  console.log('🧪 Testing synchronization...\n');

  try {
    const { SyncService } = await import('../sync/syncService.js');
    const syncService = new SyncService(config);

    // Test connections
    const connectionTest = await syncService.testConnections();
    console.log(`Grist connection: ${connectionTest.grist ? '✓' : '✗'}`);
    console.log(`Source connection: ${connectionTest.source ? '✓' : '✗'}\n`);

    if (!connectionTest.grist || !connectionTest.source) {
      throw new Error('Connection test failed');
    }

    console.log('✓ Test sync completed\n');
  } catch (error) {
    console.error('✗ Test sync failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Run the CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
