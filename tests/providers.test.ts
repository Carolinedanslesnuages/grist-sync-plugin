/**
 * Unit tests for REST Provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RestProvider, MockProvider } from '../src/sync/providers/restProvider';
import type { SourceConfig } from '../src/sync/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('RestProvider', () => {
  let mockConfig: SourceConfig;

  beforeEach(() => {
    mockConfig = {
      type: 'rest',
      url: 'https://api.example.com/data',
      method: 'GET',
      headers: {},
    };
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('devrait créer une instance avec la configuration fournie', () => {
      const provider = new RestProvider(mockConfig);
      expect(provider).toBeDefined();
    });
  });

  describe('fetchData', () => {
    it('devrait lancer une erreur si URL manquante', async () => {
      const noUrlConfig = { ...mockConfig, url: undefined };
      const provider = new RestProvider(noUrlConfig);

      await expect(provider.fetchData()).rejects.toThrow('REST provider requires a URL');
    });

    it('devrait faire un appel GET par défaut', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const provider = new RestProvider(mockConfig);
      const result = await provider.fetchData();

      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.url,
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual(mockData);
    });

    it('devrait utiliser la méthode HTTP configurée', async () => {
      const postConfig = { ...mockConfig, method: 'POST' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const provider = new RestProvider(postConfig);
      await provider.fetchData();

      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.url,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('devrait inclure les headers configurés', async () => {
      const configWithHeaders = {
        ...mockConfig,
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom': 'value',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const provider = new RestProvider(configWithHeaders);
      await provider.fetchData();

      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.url,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123',
            'X-Custom': 'value',
          }),
        })
      );
    });

    it('devrait gérer les erreurs HTTP', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const provider = new RestProvider(mockConfig);
      await expect(provider.fetchData()).rejects.toThrow('HTTP error! status: 404');
    });

    it('devrait retourner un tableau si la réponse est un tableau', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const provider = new RestProvider(mockConfig);
      const result = await provider.fetchData();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockData);
    });

    it('devrait extraire les données de la propriété "data"', async () => {
      const mockResponse = {
        data: [{ id: 1 }, { id: 2 }],
        meta: { count: 2 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const provider = new RestProvider(mockConfig);
      const result = await provider.fetchData();

      expect(result).toEqual(mockResponse.data);
    });

    it('devrait extraire les données de la propriété "items"', async () => {
      const mockResponse = {
        items: [{ id: 1 }, { id: 2 }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const provider = new RestProvider(mockConfig);
      const result = await provider.fetchData();

      expect(result).toEqual(mockResponse.items);
    });

    it('devrait utiliser dataPath si fourni', async () => {
      const mockResponse = {
        response: {
          users: [{ id: 1 }, { id: 2 }],
        },
      };

      const configWithPath = {
        ...mockConfig,
        dataPath: 'response.users',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const provider = new RestProvider(configWithPath);
      const result = await provider.fetchData();

      expect(result).toEqual(mockResponse.response.users);
    });

    it('devrait lancer une erreur si dataPath invalide', async () => {
      const mockResponse = { data: [] };
      const configWithPath = {
        ...mockConfig,
        dataPath: 'invalid.path',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const provider = new RestProvider(configWithPath);
      await expect(provider.fetchData()).rejects.toThrow("Path 'invalid.path' not found");
    });

    it('devrait lancer une erreur si aucune donnée tableau trouvée', async () => {
      const mockResponse = {
        message: 'success',
        count: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const provider = new RestProvider(mockConfig);
      await expect(provider.fetchData()).rejects.toThrow('Unable to extract array data');
    });

    it('devrait étendre les variables d\'environnement dans les headers', async () => {
      process.env.TEST_TOKEN = 'secret-token';

      const configWithEnv = {
        ...mockConfig,
        headers: {
          'Authorization': 'Bearer ${TEST_TOKEN}',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const provider = new RestProvider(configWithEnv);
      await provider.fetchData();

      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.url,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer secret-token',
          }),
        })
      );

      delete process.env.TEST_TOKEN;
    });
  });

  describe('testConnection', () => {
    it('devrait retourner true si fetchData réussit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const provider = new RestProvider(mockConfig);
      const result = await provider.testConnection();

      expect(result).toBe(true);
    });

    it('devrait retourner false si fetchData échoue', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const provider = new RestProvider(mockConfig);
      const result = await provider.testConnection();

      expect(result).toBe(false);
    });
  });
});

describe('MockProvider', () => {
  describe('Constructor', () => {
    it('devrait créer une instance avec des données vides par défaut', () => {
      const provider = new MockProvider();
      expect(provider).toBeDefined();
    });

    it('devrait créer une instance avec des données fournies', () => {
      const mockData = [{ id: 1, name: 'Test' }];
      const provider = new MockProvider(mockData);
      expect(provider).toBeDefined();
    });
  });

  describe('fetchData', () => {
    it('devrait retourner les données mock', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      const provider = new MockProvider(mockData);
      const result = await provider.fetchData();

      expect(result).toEqual(mockData);
    });

    it('devrait simuler un délai réseau', async () => {
      const provider = new MockProvider([]);
      const startTime = Date.now();
      await provider.fetchData();
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('devrait retourner un tableau vide par défaut', async () => {
      const provider = new MockProvider();
      const result = await provider.fetchData();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('testConnection', () => {
    it('devrait toujours retourner true', async () => {
      const provider = new MockProvider();
      const result = await provider.testConnection();

      expect(result).toBe(true);
    });
  });
});
