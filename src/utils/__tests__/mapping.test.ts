/**
 * Tests unitaires pour les utilitaires de mapping
 */

import { describe, it, expect } from 'vitest';
import {
  serializeValue,
  getNestedValue,
  transformRecord,
  transformRecords,
  isValidMapping,
  getValidMappings,
  extractAllKeys,
  generateMappingsFromApiData,
  type FieldMapping
} from '../mapping';

describe('serializeValue', () => {
  it('devrait retourner null pour null', () => {
    expect(serializeValue(null)).toBe(null);
  });

  it('devrait retourner undefined pour undefined', () => {
    expect(serializeValue(undefined)).toBe(undefined);
  });

  it('devrait convertir une Date en string ISO', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    expect(serializeValue(date)).toBe('2024-01-15T10:30:00.000Z');
  });

  it('devrait sérialiser un tableau avec le séparateur ";"', () => {
    expect(serializeValue(['a', 'b', 'c'])).toBe('a;b;c');
  });

  it('devrait retourner une chaîne vide pour un tableau vide', () => {
    expect(serializeValue([])).toBe('');
  });

  it('devrait sérialiser un tableau d\'objets en JSON séparés par ";"', () => {
    const array = [{ x: 1 }, { y: 2 }];
    expect(serializeValue(array)).toBe('{"x":1};{"y":2}');
  });

  it('devrait sérialiser un objet en JSON', () => {
    const obj = { x: 1, y: 2, z: 'test' };
    expect(serializeValue(obj)).toBe('{"x":1,"y":2,"z":"test"}');
  });

  it('devrait retourner les booléens tels quels', () => {
    expect(serializeValue(true)).toBe(true);
    expect(serializeValue(false)).toBe(false);
  });

  it('devrait retourner les nombres tels quels', () => {
    expect(serializeValue(42)).toBe(42);
    expect(serializeValue(3.14)).toBe(3.14);
    expect(serializeValue(0)).toBe(0);
  });

  it('devrait retourner les strings tels quels', () => {
    expect(serializeValue('hello')).toBe('hello');
    expect(serializeValue('')).toBe('');
  });
});

describe('getNestedValue', () => {
  const testObj = {
    user: {
      name: 'Alice',
      profile: {
        age: 30,
        email: 'alice@example.com'
      }
    },
    id: 123
  };

  it('devrait extraire une valeur de premier niveau', () => {
    expect(getNestedValue(testObj, 'id')).toBe(123);
  });

  it('devrait extraire une valeur imbriquée', () => {
    expect(getNestedValue(testObj, 'user.name')).toBe('Alice');
  });

  it('devrait extraire une valeur profondément imbriquée', () => {
    expect(getNestedValue(testObj, 'user.profile.age')).toBe(30);
    expect(getNestedValue(testObj, 'user.profile.email')).toBe('alice@example.com');
  });

  it('devrait retourner undefined pour un chemin inexistant', () => {
    expect(getNestedValue(testObj, 'nonexistent')).toBe(undefined);
    expect(getNestedValue(testObj, 'user.nonexistent')).toBe(undefined);
    expect(getNestedValue(testObj, 'user.profile.nonexistent')).toBe(undefined);
  });

  it('devrait retourner undefined pour un chemin null', () => {
    expect(getNestedValue(testObj, '')).toBe(undefined);
  });

  it('devrait retourner undefined pour un objet null ou undefined', () => {
    expect(getNestedValue(null, 'test')).toBe(undefined);
    expect(getNestedValue(undefined, 'test')).toBe(undefined);
  });

  it('devrait gérer les valeurs null/undefined dans le chemin', () => {
    const obj = { a: null, b: { c: null } };
    expect(getNestedValue(obj, 'a.b')).toBe(undefined);
    expect(getNestedValue(obj, 'b.c.d')).toBe(undefined);
  });
});

describe('transformRecord', () => {
  const apiRecord = {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    user: {
      profile: {
        age: 30
      }
    },
    tags: ['javascript', 'vue', 'typescript'],
    metadata: { role: 'admin', active: true }
  };

  it('devrait transformer un enregistrement simple', () => {
    const mappings: FieldMapping[] = [
      { gristColumn: 'ID', apiField: 'id' },
      { gristColumn: 'Name', apiField: 'name' },
      { gristColumn: 'Email', apiField: 'email' }
    ];

    const result = transformRecord(apiRecord, mappings);
    expect(result).toEqual({
      ID: 1,
      Name: 'Alice',
      Email: 'alice@example.com'
    });
  });

  it('devrait gérer les chemins imbriqués', () => {
    const mappings: FieldMapping[] = [
      { gristColumn: 'Age', apiField: 'user.profile.age' }
    ];

    const result = transformRecord(apiRecord, mappings);
    expect(result).toEqual({
      Age: 30
    });
  });

  it('devrait sérialiser les tableaux', () => {
    const mappings: FieldMapping[] = [
      { gristColumn: 'Tags', apiField: 'tags' }
    ];

    const result = transformRecord(apiRecord, mappings);
    expect(result).toEqual({
      Tags: 'javascript;vue;typescript'
    });
  });

  it('devrait sérialiser les objets en JSON', () => {
    const mappings: FieldMapping[] = [
      { gristColumn: 'Metadata', apiField: 'metadata' }
    ];

    const result = transformRecord(apiRecord, mappings);
    expect(result).toEqual({
      Metadata: '{"role":"admin","active":true}'
    });
  });

  it('devrait ignorer les mappings désactivés', () => {
    const mappings: FieldMapping[] = [
      { gristColumn: 'Name', apiField: 'name', enabled: true },
      { gristColumn: 'Email', apiField: 'email', enabled: false }
    ];

    const result = transformRecord(apiRecord, mappings);
    expect(result).toEqual({
      Name: 'Alice'
    });
  });

  it('devrait ignorer les mappings avec des champs manquants', () => {
    const mappings: FieldMapping[] = [
      { gristColumn: '', apiField: 'name' },
      { gristColumn: 'Name', apiField: '' },
      { gristColumn: 'Email', apiField: 'email' }
    ];

    const result = transformRecord(apiRecord, mappings);
    expect(result).toEqual({
      Email: 'alice@example.com'
    });
  });

  it('devrait appliquer une transformation personnalisée', () => {
    const mappings: FieldMapping[] = [
      {
        gristColumn: 'NameUpper',
        apiField: 'name',
        transform: (value: any) => value.toUpperCase()
      }
    ];

    const result = transformRecord(apiRecord, mappings);
    expect(result).toEqual({
      NameUpper: 'ALICE'
    });
  });

  it('devrait gérer les valeurs undefined gracieusement', () => {
    const mappings: FieldMapping[] = [
      { gristColumn: 'Missing', apiField: 'nonexistent' }
    ];

    const result = transformRecord(apiRecord, mappings);
    expect(result).toEqual({
      Missing: undefined
    });
  });
});

describe('transformRecords', () => {
  it('devrait transformer un tableau d\'enregistrements', () => {
    const apiRecords = [
      { id: 1, name: 'Alice', score: 85 },
      { id: 2, name: 'Bob', score: 92 }
    ];

    const mappings: FieldMapping[] = [
      { gristColumn: 'Name', apiField: 'name' },
      { gristColumn: 'Score', apiField: 'score' }
    ];

    const result = transformRecords(apiRecords, mappings);
    expect(result).toEqual([
      { Name: 'Alice', Score: 85 },
      { Name: 'Bob', Score: 92 }
    ]);
  });

  it('devrait retourner un tableau vide pour une entrée non-tableau', () => {
    const notArray = { id: 1, name: 'Alice' } as any;
    const mappings: FieldMapping[] = [
      { gristColumn: 'Name', apiField: 'name' }
    ];

    const result = transformRecords(notArray, mappings);
    expect(result).toEqual([]);
  });

  it('devrait retourner un tableau vide pour un tableau vide', () => {
    const result = transformRecords([], []);
    expect(result).toEqual([]);
  });
});

describe('isValidMapping', () => {
  it('devrait valider un mapping correct', () => {
    const mapping: FieldMapping = {
      gristColumn: 'Name',
      apiField: 'name'
    };
    expect(isValidMapping(mapping)).toBe(true);
  });

  it('devrait invalider un mapping sans gristColumn', () => {
    const mapping: FieldMapping = {
      gristColumn: '',
      apiField: 'name'
    };
    expect(isValidMapping(mapping)).toBe(false);
  });

  it('devrait invalider un mapping sans apiField', () => {
    const mapping: FieldMapping = {
      gristColumn: 'Name',
      apiField: ''
    };
    expect(isValidMapping(mapping)).toBe(false);
  });

  it('devrait invalider un mapping sans les deux champs', () => {
    const mapping: FieldMapping = {
      gristColumn: '',
      apiField: ''
    };
    expect(isValidMapping(mapping)).toBe(false);
  });
});

describe('getValidMappings', () => {
  it('devrait filtrer et retourner uniquement les mappings valides', () => {
    const mappings: FieldMapping[] = [
      { gristColumn: 'Name', apiField: 'name' },
      { gristColumn: '', apiField: 'email' },
      { gristColumn: 'Age', apiField: '' },
      { gristColumn: 'Score', apiField: 'score' }
    ];

    const result = getValidMappings(mappings);
    expect(result).toEqual([
      { gristColumn: 'Name', apiField: 'name' },
      { gristColumn: 'Score', apiField: 'score' }
    ]);
  });

  it('devrait retourner un tableau vide si aucun mapping n\'est valide', () => {
    const mappings: FieldMapping[] = [
      { gristColumn: '', apiField: 'name' },
      { gristColumn: 'Age', apiField: '' }
    ];

    const result = getValidMappings(mappings);
    expect(result).toEqual([]);
  });
});

describe('extractAllKeys', () => {
  it('devrait extraire les clés d\'un objet simple', () => {
    const obj = { id: 1, name: 'Alice', email: 'alice@example.com' };
    const result = extractAllKeys(obj);
    expect(result).toEqual(['id', 'name', 'email']);
  });

  it('devrait extraire les clés imbriquées', () => {
    const obj = {
      user: {
        name: 'Alice',
        profile: {
          age: 30
        }
      },
      id: 123
    };

    const result = extractAllKeys(obj);
    expect(result).toContain('user');
    expect(result).toContain('user.name');
    expect(result).toContain('user.profile');
    expect(result).toContain('user.profile.age');
    expect(result).toContain('id');
  });

  it('ne devrait pas récurser dans les tableaux', () => {
    const obj = {
      tags: ['a', 'b', 'c'],
      name: 'test'
    };

    const result = extractAllKeys(obj);
    expect(result).toEqual(['tags', 'name']);
  });

  it('devrait gérer les objets vides', () => {
    expect(extractAllKeys({})).toEqual([]);
  });

  it('devrait retourner un tableau vide pour null/undefined', () => {
    expect(extractAllKeys(null)).toEqual([]);
    expect(extractAllKeys(undefined)).toEqual([]);
  });

  it('devrait respecter la profondeur maximale', () => {
    const deepObj = {
      a: {
        b: {
          c: {
            d: {
              e: {
                f: 'too deep'
              }
            }
          }
        }
      }
    };

    const result = extractAllKeys(deepObj, '', 3);
    expect(result).toContain('a');
    expect(result).toContain('a.b');
    expect(result).toContain('a.b.c');
    // Devrait s'arrêter à la profondeur 3
    expect(result).not.toContain('a.b.c.d');
  });
});

describe('generateMappingsFromApiData', () => {
  it('devrait générer des mappings à partir de données simples', () => {
    const sampleData = { id: 1, name: 'Alice', email: 'alice@example.com' };
    const result = generateMappingsFromApiData(sampleData);

    expect(result).toEqual([
      { apiField: 'id', gristColumn: 'api_id', enabled: true },
      { apiField: 'name', gristColumn: 'name', enabled: true },
      { apiField: 'email', gristColumn: 'email', enabled: true }
    ]);
  });

  it('devrait convertir les chemins imbriqués en noms de colonnes avec underscores', () => {
    const sampleData = {
      user: {
        profile: {
          name: 'Alice'
        }
      }
    };

    const result = generateMappingsFromApiData(sampleData);
    
    const nameMapping = result.find(m => m.apiField === 'user.profile.name');
    expect(nameMapping).toBeDefined();
    expect(nameMapping?.gristColumn).toBe('user_profile_name');
  });

  it('devrait retourner un tableau vide pour null/undefined', () => {
    expect(generateMappingsFromApiData(null)).toEqual([]);
    expect(generateMappingsFromApiData(undefined)).toEqual([]);
  });

  it('devrait permettre de désactiver les mappings par défaut', () => {
    const sampleData = { id: 1, name: 'Alice' };
    const result = generateMappingsFromApiData(sampleData, false);

    expect(result.every(m => m.enabled === false)).toBe(true);
  });

  it('devrait gérer les objets avec des tableaux', () => {
    const sampleData = {
      id: 1,
      tags: ['a', 'b'],
      user: {
        name: 'Alice'
      }
    };

    const result = generateMappingsFromApiData(sampleData);
    
    // Les tableaux ne sont pas récursés, donc seule la clé 'tags' devrait être présente
    const tagMapping = result.find(m => m.apiField === 'tags');
    expect(tagMapping).toBeDefined();
    expect(tagMapping?.gristColumn).toBe('tags');
  });
});
