/**
 * Unit tests for SyncService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from '../src/sync/syncService';
import type { SyncConfig } from '../src/sync/types';

// Mock the GristClient
vi.mock('../src/utils/grist', () => ({
  GristClient: vi.fn().mockImplementation(() => ({
    getColumns: vi.fn().mockResolvedValue({ columns: [] }),
    ensureColumns: vi.fn().mockResolvedValue(undefined),
    syncRecords: vi.fn().mockResolvedValue({
      added: 2,
      updated: 1,
      unchanged: 0,
      errors: 0,
      details: ['Sync completed'],
    }),
  })),
}));

describe('SyncService', () => {
  let mockConfig: SyncConfig;

  beforeEach(() => {
    mockConfig = {
      grist: {
        docId: 'test-doc',
        tableId: 'test-table',
        gristApiUrl: 'https://docs.getgrist.com',
        apiToken: 'test-token',
      },
      source: {
        type: 'mock',
      },
      mapping: {
        id: 'id',
        name: 'name',
        email: 'email',
      },
      sync: {
        mode: 'upsert',
        uniqueKey: 'id',
        autoCreateColumns: true,
        batchSize: 100,
        retryAttempts: 3,
        retryDelay: 1000,
      },
    };
  });

  describe('Constructor', () => {
    it('devrait créer une instance avec la configuration fournie', () => {
      const service = new SyncService(mockConfig);
      expect(service).toBeDefined();
      expect(service.getStatus).toBeDefined();
    });

    it('devrait initialiser le statut avec les valeurs par défaut', () => {
      const service = new SyncService(mockConfig);
      const status = service.getStatus();
      
      expect(status.running).toBe(false);
      expect(status.totalSynced).toBe(0);
      expect(status.totalErrors).toBe(0);
    });
  });

  describe('testConnections', () => {
    it('devrait tester les connexions Grist et source', async () => {
      const service = new SyncService(mockConfig);
      const result = await service.testConnections();
      
      expect(result).toHaveProperty('grist');
      expect(result).toHaveProperty('source');
    });

    it('devrait retourner true pour les deux connexions avec mock', async () => {
      const service = new SyncService(mockConfig);
      const result = await service.testConnections();
      
      expect(result.grist).toBe(true);
      expect(result.source).toBe(true);
    });
  });

  describe('sync', () => {
    it('devrait exécuter une synchronisation complète', async () => {
      const service = new SyncService(mockConfig);
      const result = await service.sync();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('added');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('duration');
    });

    it('devrait retourner success true en cas de réussite', async () => {
      const service = new SyncService(mockConfig);
      const result = await service.sync();
      
      expect(result.success).toBe(true);
    });

    it('devrait mettre à jour le statut après la synchronisation', async () => {
      const service = new SyncService(mockConfig);
      await service.sync();
      
      const status = service.getStatus();
      expect(status.lastRun).toBeDefined();
      expect(status.lastSuccess).toBeDefined();
    });

    it('devrait appliquer le mapping aux données source', async () => {
      const service = new SyncService(mockConfig);
      const result = await service.sync();
      
      expect(result.details.some(d => d.includes('Applying field mapping'))).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('devrait retourner le statut actuel', () => {
      const service = new SyncService(mockConfig);
      const status = service.getStatus();
      
      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('totalSynced');
      expect(status).toHaveProperty('totalErrors');
    });

    it('devrait retourner une copie du statut', () => {
      const service = new SyncService(mockConfig);
      const status1 = service.getStatus();
      const status2 = service.getStatus();
      
      expect(status1).not.toBe(status2);
      expect(status1).toEqual(status2);
    });
  });

  describe('REST Provider', () => {
    it('devrait supporter la configuration REST', () => {
      const restConfig = {
        ...mockConfig,
        source: {
          type: 'rest' as const,
          url: 'https://api.example.com/data',
          method: 'GET',
          headers: {},
        },
      };

      const service = new SyncService(restConfig);
      expect(service).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('devrait gérer les erreurs lors de la synchronisation', async () => {
      const invalidConfig = {
        ...mockConfig,
        source: {
          type: 'invalid' as any,
        },
      };

      expect(() => new SyncService(invalidConfig)).toThrow();
    });
  });

  describe('Field Mapping', () => {
    it('devrait mapper les champs selon la configuration', async () => {
      const service = new SyncService(mockConfig);
      const result = await service.sync();
      
      expect(result.details.some(d => d.includes('Mapped'))).toBe(true);
    });

    it('devrait supporter les champs imbriqués avec notation point', () => {
      const nestedConfig = {
        ...mockConfig,
        mapping: {
          id: 'data.id',
          name: 'data.user.name',
          email: 'contact.email',
        },
      };

      const service = new SyncService(nestedConfig);
      expect(service).toBeDefined();
    });
  });

  describe('Auto-create Columns', () => {
    it('devrait créer automatiquement les colonnes si configuré', async () => {
      const service = new SyncService(mockConfig);
      const result = await service.sync();
      
      expect(result.details.some(d => d.includes('Ensuring columns'))).toBe(true);
    });

    it('ne devrait pas créer de colonnes si désactivé', async () => {
      const noAutoCreateConfig = {
        ...mockConfig,
        sync: {
          ...mockConfig.sync,
          autoCreateColumns: false,
        },
      };

      const service = new SyncService(noAutoCreateConfig);
      const result = await service.sync();
      
      expect(result.details.some(d => d.includes('Ensuring columns'))).toBe(false);
    });
  });

  describe('Sync Modes', () => {
    it('devrait supporter le mode add', () => {
      const addConfig = {
        ...mockConfig,
        sync: {
          ...mockConfig.sync,
          mode: 'add' as const,
        },
      };

      const service = new SyncService(addConfig);
      expect(service).toBeDefined();
    });

    it('devrait supporter le mode update', () => {
      const updateConfig = {
        ...mockConfig,
        sync: {
          ...mockConfig.sync,
          mode: 'update' as const,
        },
      };

      const service = new SyncService(updateConfig);
      expect(service).toBeDefined();
    });

    it('devrait supporter le mode upsert', () => {
      const upsertConfig = {
        ...mockConfig,
        sync: {
          ...mockConfig.sync,
          mode: 'upsert' as const,
        },
      };

      const service = new SyncService(upsertConfig);
      expect(service).toBeDefined();
    });
  });
});
