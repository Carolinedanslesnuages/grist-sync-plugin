/**
 * Tests unitaires pour le parseur d'URL Grist
 */

import { describe, it, expect } from 'vitest';
import { parseGristUrl } from '../parseGristUrl';

describe('parseGristUrl', () => {
  describe('URLs valides avec docName', () => {
    it('devrait parser une URL localhost avec port et docName', () => {
      const url = 'http://localhost:8484/tdBmr4kcvczT/Untitled-document/p/8';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('tdBmr4kcvczT');
      expect(result?.docName).toBe('Untitled-document');
      expect(result?.tableId).toBe(8);
    });

    it('devrait parser une URL HTTPS avec docName', () => {
      const url = 'https://docs.getgrist.com/abc123xyz/MyDocument/p/5';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('abc123xyz');
      expect(result?.docName).toBe('MyDocument');
      expect(result?.tableId).toBe(5);
    });

    it('devrait parser une URL avec docName contenant des tirets', () => {
      const url = 'http://localhost:8484/docId123/my-document-name/p/10';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('docId123');
      expect(result?.docName).toBe('my-document-name');
      expect(result?.tableId).toBe(10);
    });

    it('devrait parser une URL avec docName contenant des underscores', () => {
      const url = 'https://grist.example.com/xyz789/my_doc_name/p/42';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('xyz789');
      expect(result?.docName).toBe('my_doc_name');
      expect(result?.tableId).toBe(42);
    });

    it('devrait parser une URL avec un tableId à plusieurs chiffres', () => {
      const url = 'http://localhost:8484/doc123/Document/p/999';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('doc123');
      expect(result?.docName).toBe('Document');
      expect(result?.tableId).toBe(999);
    });

    it('devrait parser une URL avec docName contenant plusieurs segments', () => {
      const url = 'http://localhost:8484/docId/part1/part2/p/7';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('docId');
      expect(result?.docName).toBe('part1/part2');
      expect(result?.tableId).toBe(7);
    });
  });

  describe('URLs valides sans docName', () => {
    it('devrait parser une URL sans docName', () => {
      const url = 'http://localhost:8484/xyz789/p/3';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('xyz789');
      expect(result?.docName).toBeUndefined();
      expect(result?.tableId).toBe(3);
    });

    it('devrait parser une URL HTTPS sans docName', () => {
      const url = 'https://docs.getgrist.com/doc456/p/1';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('doc456');
      expect(result?.docName).toBeUndefined();
      expect(result?.tableId).toBe(1);
    });

    it('devrait parser une URL avec tableId = 0', () => {
      const url = 'http://localhost:8484/abc/p/0';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('abc');
      expect(result?.docName).toBeUndefined();
      expect(result?.tableId).toBe(0);
    });
  });

  describe('URLs avec query parameters et fragments', () => {
    it('devrait parser une URL avec query parameters', () => {
      const url = 'http://localhost:8484/docId/Document/p/8?param=value';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('docId');
      expect(result?.docName).toBe('Document');
      expect(result?.tableId).toBe(8);
    });

    it('devrait parser une URL avec fragment', () => {
      const url = 'http://localhost:8484/docId/Doc/p/5#section';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('docId');
      expect(result?.docName).toBe('Doc');
      expect(result?.tableId).toBe(5);
    });

    it('devrait parser une URL avec query parameters et fragment', () => {
      const url = 'http://localhost:8484/docId/Document/p/8?param=value#section';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('docId');
      expect(result?.docName).toBe('Document');
      expect(result?.tableId).toBe(8);
    });
  });

  describe('URLs invalides', () => {
    it('devrait retourner null pour une URL sans tableId', () => {
      const url = 'http://localhost:8484/docId/Document/p/';
      const result = parseGristUrl(url);

      expect(result).toBeNull();
    });

    it('devrait retourner null pour une URL sans /p/', () => {
      const url = 'http://localhost:8484/docId/Document/8';
      const result = parseGristUrl(url);

      expect(result).toBeNull();
    });

    it('devrait retourner null pour une URL avec tableId non numérique', () => {
      const url = 'http://localhost:8484/docId/Document/p/notanumber';
      const result = parseGristUrl(url);

      expect(result).toBeNull();
    });

    it('devrait retourner null pour une URL trop courte', () => {
      const url = 'http://localhost:8484/docId';
      const result = parseGristUrl(url);

      expect(result).toBeNull();
    });

    it('devrait retourner null pour une URL avec seulement /p/', () => {
      const url = 'http://localhost:8484/p/8';
      const result = parseGristUrl(url);

      expect(result).toBeNull();
    });

    it('devrait retourner null pour une chaîne invalide', () => {
      const url = 'not-a-valid-url';
      const result = parseGristUrl(url);

      expect(result).toBeNull();
    });

    it('devrait retourner null pour une URL vide', () => {
      const url = '';
      const result = parseGristUrl(url);

      expect(result).toBeNull();
    });

    it('devrait retourner null pour une URL avec /p/ en première position', () => {
      const url = 'http://localhost:8484/p/docId/8';
      const result = parseGristUrl(url);

      expect(result).toBeNull();
    });

    it('devrait retourner null pour une URL avec tableId décimal', () => {
      const url = 'http://localhost:8484/docId/Document/p/8.5';
      const result = parseGristUrl(url);

      expect(result).toBeNull();
    });
  });

  describe('Cas limites', () => {
    it('devrait gérer un docId alphanumérique complexe', () => {
      const url = 'http://localhost:8484/aB3-cD_4eF/Doc/p/12';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('aB3-cD_4eF');
      expect(result?.tableId).toBe(12);
    });

    it('devrait gérer un domaine avec sous-domaines', () => {
      const url = 'https://grist.sub.example.com/docId/Document/p/8';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('docId');
      expect(result?.docName).toBe('Document');
      expect(result?.tableId).toBe(8);
    });

    it('devrait gérer un port non standard', () => {
      const url = 'http://localhost:9999/docId/Doc/p/8';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('docId');
      expect(result?.docName).toBe('Doc');
      expect(result?.tableId).toBe(8);
    });

    it('devrait gérer un très grand tableId', () => {
      const url = 'http://localhost:8484/docId/Doc/p/2147483647';
      const result = parseGristUrl(url);

      expect(result).not.toBeNull();
      expect(result?.docId).toBe('docId');
      expect(result?.tableId).toBe(2147483647);
    });
  });
});
