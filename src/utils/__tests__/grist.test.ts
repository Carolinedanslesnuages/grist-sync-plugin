/**
 * Tests unitaires et d'intégration pour les utilitaires Grist
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseGristUrl,
  isValidGristUrl,
  GristClient
} from '../grist';
import type { GristConfig } from '../../config';

describe('parseGristUrl', () => {
  it('devrait parser une URL Grist simple', () => {
    const url = 'https://docs.getgrist.com/doc/abc123xyz';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('abc123xyz');
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait parser une URL Grist avec organisation', () => {
    const url = 'https://docs.getgrist.com/o/myorg/doc/myDocId';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('myDocId');
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait parser une URL Grist avec page', () => {
    const url = 'https://docs.getgrist.com/doc/abc123/p/5';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('abc123');
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait parser une URL Grist self-hosted', () => {
    const url = 'https://grist.example.com/doc/myDocId';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('myDocId');
    expect(result.gristApiUrl).toBe('https://grist.example.com');
  });

  it('devrait parser une URL avec port', () => {
    const url = 'http://localhost:8484/doc/testDoc';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('testDoc');
    expect(result.gristApiUrl).toBe('http://localhost:8484');
  });

  it('devrait retourner null pour une URL sans docId', () => {
    const url = 'https://docs.getgrist.com';
    const result = parseGristUrl(url);

    expect(result.docId).toBe(null);
    expect(result.gristApiUrl).toBe(null);
  });

  it('devrait retourner null pour une URL invalide', () => {
    const url = 'not-a-valid-url';
    const result = parseGristUrl(url);

    expect(result.docId).toBe(null);
    expect(result.gristApiUrl).toBe(null);
  });

  it('devrait gérer les URLs avec query parameters', () => {
    const url = 'https://docs.getgrist.com/doc/abc123?param=value';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('abc123');
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait gérer les URLs avec hash', () => {
    const url = 'https://docs.getgrist.com/doc/abc123#section';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('abc123');
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });
});

describe('isValidGristUrl', () => {
  it('devrait valider une URL Grist correcte', () => {
    expect(isValidGristUrl('https://docs.getgrist.com/doc/abc123')).toBe(true);
  });

  it('devrait invalider une URL sans docId', () => {
    expect(isValidGristUrl('https://docs.getgrist.com')).toBe(false);
  });

  it('devrait invalider une URL mal formée', () => {
    expect(isValidGristUrl('not-a-url')).toBe(false);
  });

  it('devrait valider une URL self-hosted', () => {
    expect(isValidGristUrl('https://grist.example.com/doc/myDoc')).toBe(true);
  });
});

describe('GristClient', () => {
  let mockFetch: any;
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const mockConfig: GristConfig = {
    docId: 'test-doc-id',
    tableId: 'TestTable',
    apiTokenGrist: 'test-token',
    gristApiUrl: 'https://docs.getgrist.com'
  };

  describe('constructor', () => {
    it('devrait créer une instance avec la configuration', () => {
      const client = new GristClient(mockConfig);
      expect(client).toBeInstanceOf(GristClient);
    });

    it('devrait accepter un callback de log optionnel', () => {
      const logCallback = vi.fn();
      const client = new GristClient(mockConfig, logCallback);
      expect(client).toBeInstanceOf(GristClient);
    });
  });

  describe('addRecords', () => {
    it('devrait envoyer des enregistrements à Grist', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ records: [{ id: 1 }, { id: 2 }] })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      const records = [
        { Name: 'Alice', Email: 'alice@example.com' },
        { Name: 'Bob', Email: 'bob@example.com' }
      ];

      const result = await client.addRecords(records);

      expect(result.records).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/records'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('devrait construire le bon payload pour Grist', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ records: [{ id: 1 }] })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const configWithoutAutoCreate = { ...mockConfig, autoCreateColumns: false };
      const client = new GristClient(configWithoutAutoCreate);
      const records = [{ Name: 'Alice', Email: 'alice@example.com' }];

      await client.addRecords(records);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toEqual({
        records: [
          {
            fields: { Name: 'Alice', Email: 'alice@example.com' }
          }
        ]
      });
    });

    it('devrait lever une erreur si aucun enregistrement n\'est fourni', async () => {
      const client = new GristClient(mockConfig);

      await expect(client.addRecords([])).rejects.toThrow('Aucun enregistrement');
    });

    it('devrait gérer les erreurs HTTP', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: async () => 'Not Found'
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      const records = [{ Name: 'Alice' }];

      await expect(client.addRecords(records)).rejects.toThrow();
    });

    it('devrait construire l\'URL correctement avec le docId et tableId', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ records: [{ id: 1 }] })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      await client.addRecords([{ Name: 'Test' }]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://docs.getgrist.com/api/docs/test-doc-id/tables/TestTable/records',
        expect.any(Object)
      );
    });
  });

  describe('getRecords', () => {
    it('devrait récupérer les enregistrements de Grist', async () => {
      const mockRecords = [
        { id: 1, fields: { Name: 'Alice' } },
        { id: 2, fields: { Name: 'Bob' } }
      ];
      const mockResponse = {
        ok: true,
        json: async () => ({ records: mockRecords })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      const result = await client.getRecords();

      expect(result).toEqual(mockRecords);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/records'),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('devrait accepter un paramètre de limite', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ records: [] })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      await client.getRecords(10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('?limit=10'),
        expect.any(Object)
      );
    });

    it('devrait gérer les erreurs HTTP', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);

      await expect(client.getRecords()).rejects.toThrow();
    });
  });

  describe('getColumns', () => {
    it('devrait récupérer les colonnes de la table', async () => {
      const mockColumns = [
        { id: 'Name', fields: { colId: 'Name', type: 'Text' } },
        { id: 'Email', fields: { colId: 'Email', type: 'Text' } }
      ];
      const mockResponse = {
        ok: true,
        json: async () => ({ columns: mockColumns })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      const result = await client.getColumns();

      expect(result).toEqual(mockColumns);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/columns'),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('devrait gérer les erreurs HTTP', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        text: async () => 'Forbidden'
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);

      await expect(client.getColumns()).rejects.toThrow();
    });
  });

  describe('testConnection', () => {
    it('devrait retourner true si la connexion réussit', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ records: [] })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      const result = await client.testConnection();

      expect(result).toBe(true);
    });

    it('devrait retourner false si la connexion échoue', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: async () => 'Not Found'
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      const result = await client.testConnection();

      expect(result).toBe(false);
    });

    it('devrait retourner false en cas d\'erreur réseau', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = new GristClient(mockConfig);
      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('validateApiToken', () => {
    it('devrait valider un token API correct', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ records: [] })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      const result = await client.validateApiToken();

      expect(result.valid).toBe(true);
      expect(result.message).toContain('valide');
      expect(result.needsAuth).toBe(false);
    });

    it('devrait détecter un document public sans token', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ records: [] })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const configWithoutToken = { ...mockConfig, apiTokenGrist: undefined };
      const client = new GristClient(configWithoutToken);
      const result = await client.validateApiToken();

      expect(result.valid).toBe(true);
      expect(result.message).toContain('public');
      expect(result.needsAuth).toBe(false);
    });

    it('devrait détecter un document privé nécessitant un token (401)', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({})
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      const result = await client.validateApiToken();

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Token');
      expect(result.needsAuth).toBe(true);
    });

    it('devrait détecter un token invalide (403)', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        json: async () => ({})
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      const result = await client.validateApiToken();

      expect(result.valid).toBe(false);
      expect(result.message).toContain('invalide');
      expect(result.needsAuth).toBe(true);
    });

    it('devrait gérer les erreurs réseau', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = new GristClient(mockConfig);
      const result = await client.validateApiToken();

      expect(result.valid).toBe(false);
      expect(result.message).toContain('error');
      expect(result.needsAuth).toBe(false);
    });

    it('devrait gérer les codes d\'erreur HTTP inconnus', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: async () => ({})
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      const result = await client.validateApiToken();

      expect(result.valid).toBe(false);
      expect(result.message).toContain('500');
    });
  });

  describe('Configuration sans token', () => {
    it('ne devrait pas inclure Authorization header si aucun token', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ records: [] })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const configWithoutToken = { ...mockConfig, apiTokenGrist: undefined };
      const client = new GristClient(configWithoutToken);
      await client.getRecords();

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers['Authorization']).toBeUndefined();
    });

    it('devrait utiliser l\'URL par défaut si non spécifiée', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ records: [] })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const configWithoutUrl = { ...mockConfig, gristApiUrl: undefined };
      const client = new GristClient(configWithoutUrl);
      await client.getRecords();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://docs.getgrist.com'),
        expect.any(Object)
      );
    });
  });

  describe('Logging', () => {
    it('devrait appeler le callback de log si fourni', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: async () => 'Not Found'
      };
      mockFetch.mockResolvedValue(mockResponse);

      const logCallback = vi.fn();
      const client = new GristClient(mockConfig, logCallback);

      try {
        await client.addRecords([{ Name: 'Test' }]);
      } catch (e) {
        // Expected to throw
      }

      expect(logCallback).toHaveBeenCalled();
    });

    it('ne devrait pas planter si aucun callback de log n\'est fourni', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'Server Error'
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);

      await expect(client.addRecords([{ Name: 'Test' }])).rejects.toThrow();
    });
  });
});
