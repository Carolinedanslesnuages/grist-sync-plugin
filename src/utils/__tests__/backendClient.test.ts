/**
 * Tests unitaires pour le BackendClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackendClient } from '../backendClient';
import type { BackendClientConfig } from '../backendClient';

describe('BackendClient', () => {
  let fetchMock: any;
  
  beforeEach(() => {
    // Mock de fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('constructor', () => {
    it('devrait créer une instance avec config minimale', () => {
      const config: BackendClientConfig = {
        baseUrl: 'https://api.example.com'
      };
      
      const client = new BackendClient(config);
      expect(client).toBeInstanceOf(BackendClient);
    });
    
    it('devrait créer une instance avec config complète', () => {
      const config: BackendClientConfig = {
        baseUrl: 'https://api.example.com',
        auth: {
          type: 'bearer',
          bearerToken: 'test-token'
        },
        timeout: 10000
      };
      
      const client = new BackendClient(config);
      expect(client).toBeInstanceOf(BackendClient);
    });
  });
  
  describe('postRecords', () => {
    it('devrait envoyer des enregistrements avec succès', async () => {
      const config: BackendClientConfig = {
        baseUrl: 'https://api.example.com'
      };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true, count: 2 })
      });
      
      const client = new BackendClient(config);
      const records = [
        { name: 'Alice', email: 'alice@example.com' },
        { name: 'Bob', email: 'bob@example.com' }
      ];
      
      const response = await client.postRecords('/users', records);
      
      expect(response.status).toBe(201);
      expect(response.data).toEqual({ success: true, count: 2 });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ records })
        })
      );
    });
    
    it('devrait ajouter le header Authorization Bearer', async () => {
      const config: BackendClientConfig = {
        baseUrl: 'https://api.example.com',
        auth: {
          type: 'bearer',
          bearerToken: 'test-token-123'
        }
      };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true })
      });
      
      const client = new BackendClient(config);
      await client.postRecords('/users', [{ name: 'Alice' }]);
      
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123'
          })
        })
      );
    });
    
    it('devrait ajouter le header API key personnalisé', async () => {
      const config: BackendClientConfig = {
        baseUrl: 'https://api.example.com',
        auth: {
          type: 'api-key',
          apiKey: {
            headerName: 'x-api-key',
            value: 'my-api-key-123'
          }
        }
      };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true })
      });
      
      const client = new BackendClient(config);
      await client.postRecords('/users', [{ name: 'Alice' }]);
      
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'my-api-key-123'
          })
        })
      );
    });
    
    it('devrait lancer une erreur si aucun enregistrement', async () => {
      const config: BackendClientConfig = {
        baseUrl: 'https://api.example.com'
      };
      
      const client = new BackendClient(config);
      
      await expect(client.postRecords('/users', [])).rejects.toThrow('Aucun enregistrement à envoyer');
    });
    
    it('devrait gérer les erreurs HTTP', async () => {
      const config: BackendClientConfig = {
        baseUrl: 'https://api.example.com'
      };
      
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      });
      
      const client = new BackendClient(config);
      
      await expect(client.postRecords('/users', [{ name: 'Alice' }])).rejects.toThrow();
    });
  });
  
  describe('putRecord', () => {
    it('devrait mettre à jour un enregistrement avec succès', async () => {
      const config: BackendClientConfig = {
        baseUrl: 'https://api.example.com'
      };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true, id: 123 })
      });
      
      const client = new BackendClient(config);
      const record = { name: 'Alice Updated' };
      
      const response = await client.putRecord('/users/123', record);
      
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true, id: 123 });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(record)
        })
      );
    });
  });
  
  describe('patchRecord', () => {
    it('devrait mettre à jour partiellement un enregistrement', async () => {
      const config: BackendClientConfig = {
        baseUrl: 'https://api.example.com'
      };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true })
      });
      
      const client = new BackendClient(config);
      const record = { name: 'Alice' };
      
      const response = await client.patchRecord('/users/123', record);
      
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(record)
        })
      );
    });
  });
  
  describe('get', () => {
    it('devrait récupérer des données avec succès', async () => {
      const config: BackendClientConfig = {
        baseUrl: 'https://api.example.com'
      };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ users: [{ name: 'Alice' }] })
      });
      
      const client = new BackendClient(config);
      const response = await client.get('/users');
      
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ users: [{ name: 'Alice' }] });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });
  });
  
  describe('delete', () => {
    it('devrait supprimer un enregistrement avec succès', async () => {
      const config: BackendClientConfig = {
        baseUrl: 'https://api.example.com'
      };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({})
      });
      
      const client = new BackendClient(config);
      const response = await client.delete('/users/123');
      
      expect(response.status).toBe(204);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });
  
  describe('testConnection', () => {
    it('devrait retourner true si la connexion réussit', async () => {
      const config: BackendClientConfig = {
        baseUrl: 'https://api.example.com'
      };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({})
      });
      
      const client = new BackendClient(config);
      const result = await client.testConnection();
      
      expect(result).toBe(true);
    });
    
    it('devrait retourner false si la connexion échoue', async () => {
      const config: BackendClientConfig = {
        baseUrl: 'https://api.example.com'
      };
      
      fetchMock.mockRejectedValueOnce(new Error('Network error'));
      
      const client = new BackendClient(config);
      const result = await client.testConnection();
      
      expect(result).toBe(false);
    });
  });
});
