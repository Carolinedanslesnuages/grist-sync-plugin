/**
 * Tests unitaires pour le gestionnaire d'erreurs
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeError,
  formatErrorForLog,
  formatErrorShort,
  type ErrorInfo
} from '../errorHandler';

describe('analyzeError', () => {
  describe('Erreurs CORS', () => {
    it('devrait détecter une erreur CORS explicite', () => {
      const error = new Error('CORS policy blocked the request');
      const result = analyzeError(error, 'api_fetch');

      expect(result.type).toBe('cors');
      expect(result.title).toContain('CORS');
      expect(result.message).toContain('bloquée');
      expect(result.solutions.length).toBeGreaterThan(0);
    });

    it('devrait détecter une erreur CORS via TypeError', () => {
      const error = new TypeError('Failed to fetch');
      const result = analyzeError(error, 'api_fetch');

      expect(result.type).toBe('cors');
      expect(result.title).toContain('CORS');
    });

    it('devrait fournir des solutions spécifiques au contexte API', () => {
      const error = new Error('Cross-origin request blocked');
      const result = analyzeError(error, 'api_fetch');

      expect(result.explanation).toContain('backend');
      expect(result.solutions.some(s => s.includes('CORS'))).toBe(true);
    });
  });

  describe('Erreurs réseau', () => {
    it('devrait détecter une erreur réseau', () => {
      const error = new Error('Network request failed');
      const result = analyzeError(error, 'general');

      expect(result.type).toBe('network');
      expect(result.title).toContain('réseau');
      expect(result.message).toContain('serveur');
    });

    it('devrait détecter ECONNREFUSED', () => {
      const error = new Error('ECONNREFUSED connection refused');
      const result = analyzeError(error, 'general');

      expect(result.type).toBe('network');
      expect(result.solutions.some(s => s.includes('connexion'))).toBe(true);
    });

    it('devrait détecter une erreur offline', () => {
      const error = new Error('User is offline');
      const result = analyzeError(error, 'general');

      expect(result.type).toBe('network');
    });
  });

  describe('Erreurs HTTP', () => {
    it('devrait analyser une erreur 401 dans un contexte Grist', () => {
      const error = new Error('Erreur HTTP 401: Unauthorized');
      const result = analyzeError(error, 'grist_sync');

      expect(result.type).toBe('unauthorized');
      expect(result.title).toContain('401');
      expect(result.message).toContain('token');
      expect(result.explanation).toContain('Grist');
      expect(result.solutions.some(s => s.includes('token API'))).toBe(true);
    });

    it('devrait analyser une erreur 401 dans un contexte API général', () => {
      const error = new Error('Erreur HTTP 401: Unauthorized');
      const result = analyzeError(error, 'api_fetch');

      expect(result.type).toBe('unauthorized');
      expect(result.explanation).toContain('backend');
    });

    it('devrait analyser une erreur 403', () => {
      const error = new Error('Erreur HTTP 403: Forbidden');
      const result = analyzeError(error, 'grist_sync');

      expect(result.type).toBe('forbidden');
      expect(result.title).toContain('403');
      expect(result.message).toContain('Permissions');
      expect(result.explanation).toContain('permissions');
    });

    it('devrait analyser une erreur 404 dans un contexte Grist', () => {
      const error = new Error('Erreur HTTP 404: Not Found');
      const result = analyzeError(error, 'grist_sync');

      expect(result.type).toBe('not_found');
      expect(result.title).toContain('404');
      expect(result.explanation).toContain('Document ID');
      expect(result.solutions.some(s => s.includes('Document ID'))).toBe(true);
    });

    it('devrait analyser une erreur 422', () => {
      const error = new Error('Erreur HTTP 422: Unprocessable Entity');
      const result = analyzeError(error, 'general');

      expect(result.type).toBe('unprocessable');
      expect(result.title).toContain('422');
      expect(result.message).toContain('validation');
      expect(result.solutions.some(s => s.includes('types'))).toBe(true);
    });

    it('devrait analyser une erreur 500', () => {
      const error = new Error('Erreur HTTP 500: Internal Server Error');
      const result = analyzeError(error, 'general');

      expect(result.type).toBe('server_error');
      expect(result.title).toContain('500');
      expect(result.message).toContain('serveur');
      expect(result.solutions.some(s => s.includes('Réessayez'))).toBe(true);
    });

    it('devrait analyser une erreur 502', () => {
      const error = new Error('Erreur HTTP 502: Bad Gateway');
      const result = analyzeError(error, 'general');

      expect(result.type).toBe('server_error');
      expect(result.title).toContain('502');
    });

    it('devrait analyser une erreur 503', () => {
      const error = new Error('Erreur HTTP 503: Service Unavailable');
      const result = analyzeError(error, 'general');

      expect(result.type).toBe('server_error');
      expect(result.title).toContain('503');
    });

    it('devrait analyser une erreur HTTP inconnue', () => {
      const error = new Error('Erreur HTTP 418: I\'m a teapot');
      const result = analyzeError(error, 'general');

      expect(result.type).toBe('unknown');
      expect(result.title).toContain('418');
    });
  });

  describe('Erreurs de format JSON', () => {
    it('devrait détecter une erreur de parsing JSON', () => {
      const error = new Error('Unexpected token < in JSON at position 0');
      const result = analyzeError(error, 'general');

      expect(result.type).toBe('invalid_json');
      expect(result.title).toContain('format');
      expect(result.message).toContain('JSON');
      expect(result.solutions.some(s => s.includes('API JSON'))).toBe(true);
    });

    it('devrait détecter une erreur JSON parse', () => {
      const error = new Error('JSON parse error');
      const result = analyzeError(error, 'general');

      expect(result.type).toBe('invalid_json');
    });
  });

  describe('Erreurs de timeout', () => {
    it('devrait détecter une erreur de timeout', () => {
      const error = new Error('Request timeout exceeded');
      const result = analyzeError(error, 'general');

      expect(result.type).toBe('timeout');
      expect(result.title).toContain('attente');
      expect(result.message).toContain('temps');
      expect(result.solutions.some(s => s.includes('Réessayez'))).toBe(true);
    });
  });

  describe('Erreurs inconnues', () => {
    it('devrait gérer une erreur sans message', () => {
      const error = new Error();
      const result = analyzeError(error, 'general');

      expect(result.type).toBe('unknown');
      expect(result.title).toContain('inattendue');
      expect(result.solutions.length).toBeGreaterThan(0);
    });

    it('devrait gérer une erreur avec un message générique', () => {
      const error = new Error('Something went wrong');
      const result = analyzeError(error, 'general');

      expect(result.type).toBe('unknown');
      expect(result.technicalDetails).toContain('Something went wrong');
    });

    it('devrait inclure la stack trace dans les détails techniques', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:123:45';
      const result = analyzeError(error, 'general');

      expect(result.technicalDetails).toContain('test.ts');
    });
  });

  describe('Contexte spécifique', () => {
    it('devrait adapter les messages au contexte grist_sync', () => {
      const error = new Error('Erreur HTTP 404: Not Found');
      const result = analyzeError(error, 'grist_sync');

      expect(result.explanation).toContain('Grist');
      expect(result.explanation).not.toContain('backend');
    });

    it('devrait adapter les messages au contexte api_fetch', () => {
      const error = new Error('CORS error');
      const result = analyzeError(error, 'api_fetch');

      expect(result.explanation).toContain('backend');
    });
  });
});

describe('formatErrorForLog', () => {
  it('devrait formater une erreur pour le log', () => {
    const errorInfo: ErrorInfo = {
      type: 'network',
      title: 'Erreur réseau',
      message: 'Impossible de se connecter',
      explanation: 'Le serveur est injoignable',
      solutions: [
        'Vérifiez votre connexion',
        'Vérifiez l\'URL'
      ],
      technicalDetails: 'Network error'
    };

    const result = formatErrorForLog(errorInfo);

    expect(result).toContain('❌');
    expect(result).toContain('Erreur réseau');
    expect(result).toContain('Le serveur est injoignable');
    expect(result).toContain('💡 Solutions');
    expect(result).toContain('Vérifiez votre connexion');
    expect(result).toContain('Vérifiez l\'URL');
  });

  it('devrait inclure toutes les solutions', () => {
    const errorInfo: ErrorInfo = {
      type: 'cors',
      title: 'CORS Error',
      message: 'Request blocked',
      explanation: 'CORS policy',
      solutions: [
        'Solution 1',
        'Solution 2',
        'Solution 3'
      ]
    };

    const result = formatErrorForLog(errorInfo);

    expect(result).toContain('Solution 1');
    expect(result).toContain('Solution 2');
    expect(result).toContain('Solution 3');
  });
});

describe('formatErrorShort', () => {
  it('devrait formater une erreur en version courte', () => {
    const errorInfo: ErrorInfo = {
      type: 'network',
      title: 'Erreur réseau',
      message: 'Impossible de se connecter',
      explanation: 'Le serveur est injoignable',
      solutions: [
        'Vérifiez votre connexion',
        'Vérifiez l\'URL'
      ]
    };

    const result = formatErrorShort(errorInfo);

    expect(result).toContain('Impossible de se connecter');
    expect(result).toContain('Vérifiez votre connexion');
    expect(result).toContain(' - ');
  });

  it('devrait inclure uniquement le message et la première solution', () => {
    const errorInfo: ErrorInfo = {
      type: 'cors',
      title: 'CORS Error',
      message: 'Request blocked',
      explanation: 'CORS policy',
      solutions: [
        'First solution',
        'Second solution'
      ]
    };

    const result = formatErrorShort(errorInfo);

    expect(result).toContain('Request blocked');
    expect(result).toContain('First solution');
    expect(result).not.toContain('Second solution');
  });

  it('devrait gérer un tableau de solutions vide', () => {
    const errorInfo: ErrorInfo = {
      type: 'unknown',
      title: 'Erreur',
      message: 'Une erreur est survenue',
      explanation: 'Explication',
      solutions: []
    };

    const result = formatErrorShort(errorInfo);

    expect(result).toContain('Une erreur est survenue');
    expect(result).toContain('Consultez les détails de l\'erreur');
  });

  it('devrait gérer un tableau de solutions undefined', () => {
    const errorInfo: ErrorInfo = {
      type: 'unknown',
      title: 'Erreur',
      message: 'Une erreur est survenue',
      explanation: 'Explication',
      solutions: undefined as any
    };

    const result = formatErrorShort(errorInfo);

    expect(result).toContain('Une erreur est survenue');
    expect(result).toContain('Consultez les détails de l\'erreur');
  });
});
