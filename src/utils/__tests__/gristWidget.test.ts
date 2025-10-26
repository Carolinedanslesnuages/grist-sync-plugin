import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isRunningInGrist, initializeGristWidget, applyGristInfoToConfig } from '../gristWidget';
import type { GristConfig } from '../../config';

// Mock the global grist object
const mockGrist = {
  ready: vi.fn().mockResolvedValue(undefined),
  getTable: vi.fn(),
  docApi: {
    getAccessInfo: vi.fn(),
  },
  onRecords: vi.fn(),
};

describe('gristWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up window.grist
    if (typeof (window as any).grist !== 'undefined') {
      delete (window as any).grist;
    }
    // Also clean up global.grist for backwards compatibility
    if (typeof (global as any).grist !== 'undefined') {
      delete (global as any).grist;
    }
    // Clean up document.referrer
    Object.defineProperty(document, 'referrer', {
      value: '',
      writable: true,
      configurable: true,
    });
    // Clean up window.parent
    Object.defineProperty(window, 'parent', {
      value: window,
      writable: true,
      configurable: true,
    });
  });

  describe('isRunningInGrist', () => {
    it('devrait retourner false quand grist n\'est pas défini', () => {
      expect(isRunningInGrist()).toBe(false);
    });

    it('devrait retourner true quand grist est défini avec ready', () => {
      (window as any).grist = mockGrist;
      expect(isRunningInGrist()).toBe(true);
    });

    it('devrait retourner false quand grist n\'a pas de méthode ready', () => {
      (window as any).grist = { something: 'else' };
      expect(isRunningInGrist()).toBe(false);
    });
  });

  describe('initializeGristWidget', () => {
    it('devrait retourner isInGrist=false quand pas dans Grist', async () => {
      const result = await initializeGristWidget();
      expect(result.isInGrist).toBe(false);
      expect(result.docId).toBeUndefined();
      expect(result.gristApiUrl).toBeUndefined();
      expect(result.accessToken).toBeUndefined();
    });

    it('devrait initialiser et extraire les informations quand dans Grist', async () => {
      (window as any).grist = mockGrist;
      
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'http://localhost:8484',
          pathname: '/doc/test-doc-id/p/MyTable',
        },
        writable: true,
      });

      const result = await initializeGristWidget();
      
      expect(result.isInGrist).toBe(true);
      expect(result.docId).toBe('test-doc-id');
      expect(result.gristApiUrl).toBe('http://localhost:8484');
      expect(mockGrist.ready).toHaveBeenCalled();
    });

    it('devrait gérer les erreurs lors de l\'initialisation', async () => {
      (window as any).grist = {
        ready: vi.fn().mockRejectedValue(new Error('Init failed')),
      };

      const result = await initializeGristWidget();
      
      expect(result.isInGrist).toBe(false);
    });

    it('devrait extraire le token d\'accès si disponible', async () => {
      const mockToken = 'test-access-token-123';
      (window as any).grist = {
        ...mockGrist,
        docApi: {
          getAccessInfo: vi.fn().mockResolvedValue({ token: mockToken }),
        },
      };

      Object.defineProperty(window, 'location', {
        value: {
          origin: 'https://docs.getgrist.com',
          pathname: '/doc/abc123',
        },
        writable: true,
      });

      const result = await initializeGristWidget();
      
      expect(result.accessToken).toBe(mockToken);
    });

    it('devrait détecter le docId depuis le referrer quand dans une iframe', async () => {
      (window as any).grist = mockGrist;
      
      // Mock current window location (widget URL, no docId)
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'https://widget.example.com',
          pathname: '/widget',
        },
        writable: true,
      });
      
      // Mock document.referrer with parent document URL
      Object.defineProperty(document, 'referrer', {
        value: 'http://localhost:8484/doc/parent-doc-id',
        writable: true,
        configurable: true,
      });

      const result = await initializeGristWidget();
      
      expect(result.isInGrist).toBe(true);
      expect(result.docId).toBe('parent-doc-id');
      expect(result.gristApiUrl).toBe('http://localhost:8484');
    });

    it('devrait supporter les URLs avec organisation /o/ORG/doc/DOC_ID', async () => {
      (window as any).grist = mockGrist;
      
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'https://docs.getgrist.com',
          pathname: '/o/my-org/doc/org-doc-id',
        },
        writable: true,
      });

      const result = await initializeGristWidget();
      
      expect(result.isInGrist).toBe(true);
      expect(result.docId).toBe('org-doc-id');
      expect(result.gristApiUrl).toBe('https://docs.getgrist.com');
    });

    it('devrait détecter depuis parent window quand accessible', async () => {
      (window as any).grist = mockGrist;
      
      // Mock current window location (widget URL)
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'https://widget.example.com',
          pathname: '/widget',
        },
        writable: true,
      });
      
      // Mock parent window location
      const mockParent = {
        location: {
          origin: 'http://localhost:8484',
          pathname: '/doc/from-parent-window',
        }
      };
      Object.defineProperty(window, 'parent', {
        value: mockParent,
        writable: true,
        configurable: true,
      });

      const result = await initializeGristWidget();
      
      expect(result.isInGrist).toBe(true);
      expect(result.docId).toBe('from-parent-window');
      expect(result.gristApiUrl).toBe('http://localhost:8484');
    });
  });

  describe('applyGristInfoToConfig', () => {
    it('devrait appliquer les informations détectées à la configuration', () => {
      const config: GristConfig = {
        docId: 'OLD_DOC_ID',
        tableId: 'Table1',
        gristApiUrl: 'https://old.getgrist.com',
      };

      const gristInfo = {
        isInGrist: true,
        docId: 'NEW_DOC_ID',
        gristApiUrl: 'https://new.getgrist.com',
        accessToken: 'test-token',
      };

      const result = applyGristInfoToConfig(config, gristInfo);

      expect(result.docId).toBe('NEW_DOC_ID');
      expect(result.gristApiUrl).toBe('https://new.getgrist.com');
      expect(result.apiTokenGrist).toBe('test-token');
      expect(result.tableId).toBe('Table1'); // Should preserve original tableId
    });

    it('ne devrait pas modifier la config si aucune info n\'est fournie', () => {
      const config: GristConfig = {
        docId: 'DOC_ID',
        tableId: 'Table1',
        gristApiUrl: 'https://docs.getgrist.com',
      };

      const gristInfo = {
        isInGrist: false,
      };

      const result = applyGristInfoToConfig(config, gristInfo);

      expect(result).toEqual(config);
    });

    it('devrait appliquer partiellement les informations disponibles', () => {
      const config: GristConfig = {
        docId: 'OLD_DOC_ID',
        tableId: 'Table1',
      };

      const gristInfo = {
        isInGrist: true,
        docId: 'NEW_DOC_ID',
        // gristApiUrl and accessToken are undefined
      };

      const result = applyGristInfoToConfig(config, gristInfo);

      expect(result.docId).toBe('NEW_DOC_ID');
      expect(result.tableId).toBe('Table1');
      expect(result.gristApiUrl).toBeUndefined();
      expect(result.apiTokenGrist).toBeUndefined();
    });
  });
});
