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
    expect(result.tableId).toBe(null);
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait parser une URL Grist avec organisation', () => {
    const url = 'https://docs.getgrist.com/o/myorg/doc/myDocId';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('myDocId');
    expect(result.tableId).toBe(null);
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait parser une URL Grist avec page', () => {
    const url = 'https://docs.getgrist.com/doc/abc123/p/5';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('abc123');
    expect(result.tableId).toBe('5');
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait parser une URL Grist self-hosted', () => {
    const url = 'https://grist.example.com/doc/myDocId';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('myDocId');
    expect(result.tableId).toBe(null);
    expect(result.gristApiUrl).toBe('https://grist.example.com');
  });

  it('devrait parser une URL avec port', () => {
    const url = 'http://localhost:8484/doc/testDoc';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('testDoc');
    expect(result.tableId).toBe(null);
    expect(result.gristApiUrl).toBe('http://localhost:8484');
  });

  it('devrait retourner null pour une URL sans docId', () => {
    const url = 'https://docs.getgrist.com';
    const result = parseGristUrl(url);

    expect(result.docId).toBe(null);
    expect(result.tableId).toBe(null);
    expect(result.gristApiUrl).toBe(null);
  });

  it('devrait retourner null pour une URL invalide', () => {
    const url = 'not-a-valid-url';
    const result = parseGristUrl(url);

    expect(result.docId).toBe(null);
    expect(result.tableId).toBe(null);
    expect(result.gristApiUrl).toBe(null);
  });

  it('devrait gérer les URLs avec query parameters', () => {
    const url = 'https://docs.getgrist.com/doc/abc123?param=value';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('abc123');
    expect(result.tableId).toBe(null);
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait gérer les URLs avec hash', () => {
    const url = 'https://docs.getgrist.com/doc/abc123#section';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('abc123');
    expect(result.tableId).toBe(null);
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  // New tests for short path format /d/
  it('devrait parser une URL avec format court /d/', () => {
    const url = 'https://docs.getgrist.com/d/shortDocId';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('shortDocId');
    expect(result.tableId).toBe(null);
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait parser une URL avec format court /d/ et organisation', () => {
    const url = 'https://docs.getgrist.com/o/myorg/d/shortDocId';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('shortDocId');
    expect(result.tableId).toBe(null);
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait parser une URL avec format court /d/ et page', () => {
    const url = 'https://docs.getgrist.com/d/shortDoc/p/MyTable';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('shortDoc');
    expect(result.tableId).toBe('MyTable');
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  // New tests for tableId extraction from query params
  it('devrait extraire tableId du paramètre de requête ?tableId=', () => {
    const url = 'https://docs.getgrist.com/doc/abc123?tableId=MyTable';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('abc123');
    expect(result.tableId).toBe('MyTable');
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait extraire tableId du paramètre de requête ?table=', () => {
    const url = 'https://docs.getgrist.com/doc/abc123?table=AnotherTable';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('abc123');
    expect(result.tableId).toBe('AnotherTable');
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait donner priorité au paramètre de requête ?tableId= sur le chemin /p/', () => {
    const url = 'https://docs.getgrist.com/doc/abc123/p/PathTable?tableId=QueryTable';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('abc123');
    expect(result.tableId).toBe('QueryTable'); // Query param has priority
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait donner priorité au paramètre de requête ?table= sur le chemin /p/', () => {
    const url = 'https://docs.getgrist.com/doc/abc123/p/PathTable?table=QueryTable';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('abc123');
    expect(result.tableId).toBe('QueryTable'); // Query param has priority
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait extraire tableId avec format court /d/ et query param', () => {
    const url = 'https://docs.getgrist.com/d/shortDoc?tableId=MyTable';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('shortDoc');
    expect(result.tableId).toBe('MyTable');
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait gérer une URL complète avec organisation, page et query param', () => {
    const url = 'https://grist.example.com/o/myorg/doc/complexDoc/p/Table1?tableId=Table2&other=param';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('complexDoc');
    expect(result.tableId).toBe('Table2'); // Query param overrides path
    expect(result.gristApiUrl).toBe('https://grist.example.com');
  });

  it('devrait extraire tableId uniquement du chemin si pas de query param', () => {
    const url = 'https://docs.getgrist.com/doc/abc123/p/TableName';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('abc123');
    expect(result.tableId).toBe('TableName');
    expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
  });

  it('devrait gérer des tableIds avec underscores et chiffres', () => {
    const url = 'https://docs.getgrist.com/doc/abc123?tableId=My_Table_123';
    const result = parseGristUrl(url);

    expect(result.docId).toBe('abc123');
    expect(result.tableId).toBe('My_Table_123');
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

  describe('addColumns', () => {
    it('devrait créer de nouvelles colonnes qui n\'existent pas', async () => {
      // Mock getColumns pour retourner les colonnes existantes
      const mockGetColumnsResponse = {
        ok: true,
        json: async () => ({
          columns: [
            { id: 'Name', fields: { colId: 'Name', type: 'Text' } }
          ]
        })
      };
      
      // Mock addColumns pour la création
      const mockAddColumnsResponse = {
        ok: true,
        json: async () => ({
          columns: [
            { id: 'Email', fields: { colId: 'Email', type: 'Text' } }
          ]
        })
      };

      mockFetch
        .mockResolvedValueOnce(mockGetColumnsResponse) // getColumns
        .mockResolvedValueOnce(mockAddColumnsResponse); // POST columns

      const client = new GristClient(mockConfig);
      const columnsToAdd = [
        { id: 'Name', label: 'Name', type: 'Text' }, // Existe déjà
        { id: 'Email', label: 'Email', type: 'Text' } // Nouvelle colonne
      ];

      const result = await client.addColumns(columnsToAdd);

      expect(result.columns).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Vérifie que seule la colonne Email est créée
      const postCall = mockFetch.mock.calls[1];
      const body = JSON.parse(postCall[1].body);
      expect(body.columns).toHaveLength(1);
      expect(body.columns[0].id).toBe('Email');
    });

    it('ne devrait pas créer de colonnes si toutes existent déjà', async () => {
      const mockGetColumnsResponse = {
        ok: true,
        json: async () => ({
          columns: [
            { id: 'Name', fields: { colId: 'Name', type: 'Text' } },
            { id: 'Email', fields: { colId: 'Email', type: 'Text' } }
          ]
        })
      };

      mockFetch.mockResolvedValueOnce(mockGetColumnsResponse);

      const client = new GristClient(mockConfig);
      const columnsToAdd = [
        { id: 'Name', label: 'Name', type: 'Text' },
        { id: 'Email', label: 'Email', type: 'Text' }
      ];

      const result = await client.addColumns(columnsToAdd);

      expect(result.columns).toHaveLength(0);
      // Ne devrait appeler que getColumns, pas POST
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][1].method).toBe('GET');
    });

    it('devrait créer toutes les colonnes si aucune n\'existe', async () => {
      const mockGetColumnsResponse = {
        ok: true,
        json: async () => ({ columns: [] })
      };
      
      const mockAddColumnsResponse = {
        ok: true,
        json: async () => ({
          columns: [
            { id: 'Name', fields: { colId: 'Name', type: 'Text' } },
            { id: 'Email', fields: { colId: 'Email', type: 'Text' } }
          ]
        })
      };

      mockFetch
        .mockResolvedValueOnce(mockGetColumnsResponse)
        .mockResolvedValueOnce(mockAddColumnsResponse);

      const client = new GristClient(mockConfig);
      const columnsToAdd = [
        { id: 'Name', label: 'Name', type: 'Text' },
        { id: 'Email', label: 'Email', type: 'Text' }
      ];

      const result = await client.addColumns(columnsToAdd);

      expect(result.columns).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('devrait retourner un tableau vide si aucune colonne à créer', async () => {
      const client = new GristClient(mockConfig);
      const result = await client.addColumns([]);

      expect(result.columns).toHaveLength(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('devrait gérer les erreurs lors de la récupération des colonnes', async () => {
      const mockGetColumnsResponse = {
        ok: false,
        status: 403,
        text: async () => 'Forbidden'
      };

      mockFetch.mockResolvedValueOnce(mockGetColumnsResponse);

      const client = new GristClient(mockConfig);
      const columnsToAdd = [{ id: 'Name', type: 'Text' }];

      await expect(client.addColumns(columnsToAdd)).rejects.toThrow();
    });

    it('devrait gérer les erreurs lors de la création des colonnes', async () => {
      const mockGetColumnsResponse = {
        ok: true,
        json: async () => ({ columns: [] })
      };
      
      const mockAddColumnsResponse = {
        ok: false,
        status: 500,
        text: async () => 'Server Error'
      };

      mockFetch
        .mockResolvedValueOnce(mockGetColumnsResponse)
        .mockResolvedValueOnce(mockAddColumnsResponse);

      const client = new GristClient(mockConfig);
      const columnsToAdd = [{ id: 'Name', type: 'Text' }];

      await expect(client.addColumns(columnsToAdd)).rejects.toThrow();
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

  describe('updateRecords', () => {
    it('devrait mettre à jour des enregistrements existants', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({})
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      const updates = [
        { id: 1, fields: { Name: 'Alice Updated', Email: 'alice@example.com' } },
        { id: 2, fields: { Name: 'Bob Updated', Email: 'bob@example.com' } }
      ];

      const result = await client.updateRecords(updates);

      expect(result).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/records'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('devrait construire le bon payload pour la mise à jour', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({})
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      const updates = [
        { id: 1, fields: { Name: 'Alice Updated' } }
      ];

      await client.updateRecords(updates);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toEqual({
        records: [
          {
            id: 1,
            fields: { Name: 'Alice Updated' }
          }
        ]
      });
    });

    it('devrait retourner 0 si aucun enregistrement à mettre à jour', async () => {
      const client = new GristClient(mockConfig);

      const result = await client.updateRecords([]);

      expect(result).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('devrait gérer les erreurs HTTP', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: async () => 'Not Found'
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new GristClient(mockConfig);
      const updates = [{ id: 1, fields: { Name: 'Test' } }];

      await expect(client.updateRecords(updates)).rejects.toThrow();
    });
  });

  describe('syncRecords - mode add', () => {
    it('devrait ajouter tous les enregistrements en mode add', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ records: [{ id: 1 }, { id: 2 }] })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const configAddMode = { ...mockConfig, syncMode: 'add' as const, autoCreateColumns: false };
      const client = new GristClient(configAddMode);
      const records = [
        { Name: 'Alice', Email: 'alice@example.com' },
        { Name: 'Bob', Email: 'bob@example.com' }
      ];

      const result = await client.syncRecords(records);

      expect('added' in result).toBe(true);
      if ('added' in result) {
        expect(result.added).toBe(2);
        expect(result.updated).toBe(0);
        expect(result.unchanged).toBe(0);
      }
    });

    it('devrait supporter le dry-run en mode add', async () => {
      const client = new GristClient({ ...mockConfig, syncMode: 'add' as const });
      const records = [
        { Name: 'Alice', Email: 'alice@example.com' },
        { Name: 'Bob', Email: 'bob@example.com' }
      ];

      const result = await client.syncRecords(records, { dryRun: true });

      expect('toAdd' in result).toBe(true);
      if ('toAdd' in result) {
        expect(result.toAdd.length).toBe(2);
        expect(result.toUpdate.length).toBe(0);
        expect(result.summary.recordsToAdd).toBe(2);
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('syncRecords - mode upsert', () => {
    it('devrait ajouter de nouveaux enregistrements et mettre à jour les existants', async () => {
      // Mock getRecords pour retourner des enregistrements existants
      const mockGetResponse = {
        ok: true,
        json: async () => ({
          records: [
            { id: 1, fields: { api_id: 'user1', Name: 'Alice', Email: 'alice@old.com' } },
            { id: 2, fields: { api_id: 'user2', Name: 'Bob', Email: 'bob@example.com' } }
          ]
        })
      };
      
      // Mock addRecords pour les nouveaux enregistrements
      const mockAddResponse = {
        ok: true,
        json: async () => ({ records: [{ id: 3 }] })
      };
      
      // Mock updateRecords
      const mockUpdateResponse = {
        ok: true,
        json: async () => ({})
      };

      mockFetch
        .mockResolvedValueOnce(mockGetResponse)  // getRecords
        .mockResolvedValueOnce(mockAddResponse)  // addRecords
        .mockResolvedValueOnce(mockUpdateResponse); // updateRecords

      const configUpsertMode = {
        ...mockConfig,
        syncMode: 'upsert' as const,
        uniqueKey: 'api_id',
        autoCreateColumns: false
      };
      const client = new GristClient(configUpsertMode);
      const records = [
        { api_id: 'user1', Name: 'Alice', Email: 'alice@new.com' }, // Update
        { api_id: 'user2', Name: 'Bob', Email: 'bob@example.com' }, // Unchanged
        { api_id: 'user3', Name: 'Charlie', Email: 'charlie@example.com' } // Add
      ];

      const result = await client.syncRecords(records);

      expect('added' in result).toBe(true);
      if ('added' in result) {
        expect(result.added).toBe(1);
        expect(result.updated).toBe(1);
        expect(result.unchanged).toBe(1);
      }
    });

    it('devrait échouer si uniqueKey n\'est pas fourni en mode upsert', async () => {
      const configWithoutKey = { ...mockConfig, syncMode: 'upsert' as const };
      const client = new GristClient(configWithoutKey);
      const records = [{ Name: 'Alice' }];

      await expect(client.syncRecords(records)).rejects.toThrow('clé unique');
    });

    it('devrait supporter le dry-run en mode upsert', async () => {
      const mockGetResponse = {
        ok: true,
        json: async () => ({
          records: [
            { id: 1, fields: { api_id: 'user1', Name: 'Alice', Email: 'alice@old.com' } }
          ]
        })
      };

      mockFetch.mockResolvedValueOnce(mockGetResponse);

      const configUpsertMode = {
        ...mockConfig,
        syncMode: 'upsert' as const,
        uniqueKey: 'api_id'
      };
      const client = new GristClient(configUpsertMode);
      const records = [
        { api_id: 'user1', Name: 'Alice', Email: 'alice@new.com' }, // Update
        { api_id: 'user2', Name: 'Bob', Email: 'bob@example.com' } // Add
      ];

      const result = await client.syncRecords(records, { dryRun: true });

      expect('toAdd' in result).toBe(true);
      if ('toAdd' in result) {
        expect(result.toAdd.length).toBe(1);
        expect(result.toUpdate.length).toBe(1);
        expect(result.summary.recordsToAdd).toBe(1);
        expect(result.summary.recordsToUpdate).toBe(1);
      }
      
      // Doit avoir appelé seulement getRecords, pas addRecords ou updateRecords
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('devrait détecter les changements correctement', async () => {
      const mockGetResponse = {
        ok: true,
        json: async () => ({
          records: [
            { id: 1, fields: { api_id: 'user1', Name: 'Alice', Email: 'alice@example.com' } }
          ]
        })
      };

      mockFetch.mockResolvedValueOnce(mockGetResponse);

      const configUpsertMode = {
        ...mockConfig,
        syncMode: 'upsert' as const,
        uniqueKey: 'api_id'
      };
      const client = new GristClient(configUpsertMode);
      const records = [
        { api_id: 'user1', Name: 'Alice', Email: 'alice@example.com' } // Identique, pas de changement
      ];

      const result = await client.syncRecords(records, { dryRun: true });

      expect('toAdd' in result).toBe(true);
      if ('toAdd' in result) {
        expect(result.toAdd.length).toBe(0);
        expect(result.toUpdate.length).toBe(0);
        expect(result.unchanged.length).toBe(1);
      }
    });

    it('devrait gérer les enregistrements sans clé unique', async () => {
      const mockGetResponse = {
        ok: true,
        json: async () => ({
          records: [
            { id: 1, fields: { api_id: 'user1', Name: 'Alice' } }
          ]
        })
      };

      mockFetch.mockResolvedValueOnce(mockGetResponse);

      const configUpsertMode = {
        ...mockConfig,
        syncMode: 'upsert' as const,
        uniqueKey: 'api_id'
      };
      const client = new GristClient(configUpsertMode);
      const records = [
        { Name: 'Bob' } // Pas de api_id
      ];

      const result = await client.syncRecords(records, { dryRun: true });

      expect('toAdd' in result).toBe(true);
      if ('toAdd' in result) {
        // L'enregistrement sans clé unique est ajouté
        expect(result.toAdd.length).toBe(1);
      }
    });
  });

  describe('syncRecords - mode update', () => {
    it('devrait uniquement mettre à jour les enregistrements existants', async () => {
      const mockGetResponse = {
        ok: true,
        json: async () => ({
          records: [
            { id: 1, fields: { api_id: 'user1', Name: 'Alice', Email: 'alice@old.com' } }
          ]
        })
      };
      
      const mockUpdateResponse = {
        ok: true,
        json: async () => ({})
      };

      mockFetch
        .mockResolvedValueOnce(mockGetResponse)
        .mockResolvedValueOnce(mockUpdateResponse);

      const configUpdateMode = {
        ...mockConfig,
        syncMode: 'update' as const,
        uniqueKey: 'api_id',
        autoCreateColumns: false
      };
      const client = new GristClient(configUpdateMode);
      const records = [
        { api_id: 'user1', Name: 'Alice', Email: 'alice@new.com' }, // Update
        { api_id: 'user3', Name: 'Charlie', Email: 'charlie@example.com' } // Ne sera pas ajouté
      ];

      const result = await client.syncRecords(records);

      expect('added' in result).toBe(true);
      if ('added' in result) {
        expect(result.added).toBe(0); // Aucun ajout en mode update
        expect(result.updated).toBe(1);
      }
    });

    it('devrait échouer si uniqueKey n\'est pas fourni en mode update', async () => {
      const configWithoutKey = { ...mockConfig, syncMode: 'update' as const };
      const client = new GristClient(configWithoutKey);
      const records = [{ Name: 'Alice' }];

      await expect(client.syncRecords(records)).rejects.toThrow('clé unique');
    });
  });
});
