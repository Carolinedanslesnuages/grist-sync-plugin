/**
 * Utilitaire de mapping pour transformer les données API
 * 
 * Ce module permet de mapper les champs d'une API externe vers les colonnes Grist.
 * Le mapping fonctionne comme une grille Excel où chaque ligne définit une correspondance.
 */

/**
 * Interface pour définir un mapping entre un champ API et une colonne Grist
 */
export interface FieldMapping {
  /** Nom de la colonne dans Grist */
  gristColumn: string;
  
  /** Chemin du champ dans les données API (ex: "user.name" ou "email") */
  apiField: string;
  
  /** Indique si ce mapping est activé (sélectionné) */
  enabled?: boolean;
  
  /** Fonction de transformation optionnelle pour modifier la valeur */
  transform?: (value: any) => any;
}

/**
 * Sérialise une valeur pour l'insertion dans Grist
 * 
 * - Arrays: sérialise avec le séparateur ";"
 * - Objects: sérialise en JSON
 * - Dates: convertit en string ISO
 * - Booleans: retourne tel quel
 * - Autres: retourne tel quel
 * 
 * @param value - La valeur à sérialiser
 * @returns La valeur sérialisée pour Grist
 * 
 * @example
 * serializeValue(['a', 'b', 'c']) // "a;b;c"
 * serializeValue({ x: 1, y: 2 }) // '{"x":1,"y":2}'
 * serializeValue(new Date('2024-01-15')) // "2024-01-15T00:00:00.000Z"
 */
export function serializeValue(value: any): any {
  // Gère null et undefined
  if (value === null || value === undefined) {
    return value;
  }
  
  // Convertit les dates en string ISO
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  // Sérialise les tableaux avec le séparateur ";"
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '';
    }
    // Pour chaque élément, sérialise récursivement si c'est un objet, sinon convertit en string
    return value.map(item => {
      if (item !== null && typeof item === 'object' && !(item instanceof Date)) {
        return JSON.stringify(item);
      }
      return String(item);
    }).join(';');
  }
  
  // Sérialise les objets en JSON (mais pas les dates qui sont déjà gérées)
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  // Retourne les primitives (string, number, boolean) telles quelles
  return value;
}

/**
 * Extrait une valeur d'un objet en utilisant un chemin (supporte la notation pointée)
 * 
 * @param obj - L'objet source
 * @param path - Le chemin vers la propriété (ex: "user.name")
 * @returns La valeur trouvée ou undefined
 * 
 * @example
 * getNestedValue({ user: { name: "Alice" } }, "user.name") // "Alice"
 */
export function getNestedValue(obj: any, path: string): any {
  if (!path || !obj) return undefined;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * Transforme un enregistrement API en enregistrement Grist selon le mapping fourni
 * 
 * @param apiRecord - Un enregistrement provenant de l'API
 * @param mappings - Liste des mappings à appliquer
 * @returns Un objet avec les colonnes Grist et leurs valeurs
 * 
 * @example
 * const apiData = { id: 1, user: { name: "Alice" }, email: "alice@example.com" };
 * const mappings = [
 *   { gristColumn: "Name", apiField: "user.name" },
 *   { gristColumn: "Email", apiField: "email" }
 * ];
 * transformRecord(apiData, mappings)
 * // Résultat: { Name: "Alice", Email: "alice@example.com" }
 */
export function transformRecord(apiRecord: any, mappings: FieldMapping[]): Record<string, any> {
  const gristRecord: Record<string, any> = {};
  
  for (const mapping of mappings) {
    if (!mapping.gristColumn) continue;
    
    // Ignorer les mappings désactivés
    if (mapping.enabled === false) continue;
    
    let value;
    
    // Si apiField est défini, extraire la valeur depuis l'enregistrement API
    if (mapping.apiField) {
      value = getNestedValue(apiRecord, mapping.apiField);
      
      // Applique la transformation personnalisée si définie
      if (mapping.transform && typeof mapping.transform === 'function') {
        value = mapping.transform(value);
      } else {
        // Sinon, applique la sérialisation automatique pour Grist
        value = serializeValue(value);
      }
    } else {
      // Si apiField n'est pas défini, c'est une colonne personnalisée vide
      // On met null pour créer la colonne sans données
      value = null;
    }
    
    gristRecord[mapping.gristColumn] = value;
  }
  
  return gristRecord;
}

/**
 * Transforme un tableau d'enregistrements API en enregistrements Grist
 * 
 * @param apiRecords - Tableau d'enregistrements provenant de l'API
 * @param mappings - Liste des mappings à appliquer
 * @returns Un tableau d'objets prêts à être insérés dans Grist
 * 
 * @example
 * const apiData = [
 *   { id: 1, name: "Alice", score: 85 },
 *   { id: 2, name: "Bob", score: 92 }
 * ];
 * const mappings = [
 *   { gristColumn: "Name", apiField: "name" },
 *   { gristColumn: "Score", apiField: "score" }
 * ];
 * transformRecords(apiData, mappings)
 * // Résultat: [{ Name: "Alice", Score: 85 }, { Name: "Bob", Score: 92 }]
 */
export function transformRecords(apiRecords: any[], mappings: FieldMapping[]): Record<string, any>[] {
  if (!Array.isArray(apiRecords)) {
    return [];
  }
  
  return apiRecords.map(record => transformRecord(record, mappings));
}

/**
 * Valide un mapping pour s'assurer qu'il est correct
 * 
 * Un mapping est valide si:
 * - Il a au moins un gristColumn défini (pour les colonnes personnalisées)
 * - OU il a les deux champs définis (pour les mappings complets)
 * 
 * @param mapping - Le mapping à valider
 * @returns true si le mapping est valide, false sinon
 */
export function isValidMapping(mapping: FieldMapping): boolean {
  // Un mapping est valide s'il a au moins un nom de colonne Grist
  // L'apiField est optionnel pour permettre les colonnes personnalisées vides
  return !!mapping.gristColumn;
}

/**
 * Filtre et retourne uniquement les mappings valides
 * 
 * @param mappings - Liste de mappings à filtrer
 * @returns Liste de mappings valides
 */
export function getValidMappings(mappings: FieldMapping[]): FieldMapping[] {
  return mappings.filter(isValidMapping);
}

/**
 * Extrait toutes les clés d'un objet de manière récursive (y compris imbriquées)
 * 
 * @param obj - L'objet à analyser
 * @param prefix - Préfixe pour les clés imbriquées (utilisation interne)
 * @param maxDepth - Profondeur maximale de récursion (par défaut: 5)
 * @returns Liste de tous les chemins de clés trouvés
 * 
 * @example
 * extractAllKeys({ user: { name: "Alice", profile: { age: 30 } }, email: "alice@example.com" })
 * // Retourne: ["user", "user.name", "user.profile", "user.profile.age", "email"]
 */
export function extractAllKeys(obj: any, prefix = '', maxDepth = 5): string[] {
  if (!obj || typeof obj !== 'object' || maxDepth <= 0) {
    return [];
  }
  
  const keys: string[] = [];
  
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    
    const path = prefix ? `${prefix}.${key}` : key;
    keys.push(path);
    
    // Récursion pour les objets imbriqués (pas les tableaux)
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...extractAllKeys(obj[key], path, maxDepth - 1));
    }
  }
  
  return keys;
}

/**
 * Génère automatiquement des mappings à partir d'un objet API
 * 
 * @param sampleData - Exemple de données API
 * @param defaultEnabled - Si les mappings doivent être activés par défaut
 * @returns Liste de mappings générés automatiquement
 * 
 * @example
 * generateMappingsFromApiData({ id: 1, name: "Alice", user: { email: "alice@example.com" } })
 * // Retourne: [
 * //   { apiField: "id", gristColumn: "id", enabled: true },
 * //   { apiField: "name", gristColumn: "name", enabled: true },
 * //   { apiField: "user", gristColumn: "user", enabled: true },
 * //   { apiField: "user.email", gristColumn: "user_email", enabled: true }
 * // ]
 */
export function generateMappingsFromApiData(sampleData: any, defaultEnabled = true): FieldMapping[] {
  if (!sampleData || typeof sampleData !== 'object') {
    return [];
  }

  const apiFields = extractAllKeys(sampleData);

  const criticalColumns = new Map<string, string>([
    ['id', 'api_id'], 
    ['createdAt', 'createdAt'],
    ['updatedAt', 'updatedAt']
  ]);

  return apiFields.map(apiField => {
    const gristColumn = criticalColumns.get(apiField) || apiField.replace(/\./g, '_');

    return {
      apiField,
      gristColumn,
      enabled: defaultEnabled
    };
  });
}

/**
 * Désérialise une valeur provenant de Grist pour la transformer en type JSON
 * Deserializes a value from Grist to transform it into a JSON type
 * 
 * - Strings contenant ";" : convertit en tableau / Strings containing ";": converts to array
 * - Strings JSON : parse en objet/tableau / JSON strings: parses to object/array
 * - Strings de dates ISO : convertit en Date / ISO date strings: converts to Date
 * - Autres : retourne tel quel / Others: returns as is
 * 
 * @param value - La valeur à désérialiser / The value to deserialize
 * @returns La valeur désérialisée / The deserialized value
 * 
 * @example
 * deserializeValue("a;b;c") // ["a", "b", "c"]
 * deserializeValue('{"x":1,"y":2}') // { x: 1, y: 2 }
 * deserializeValue("2024-01-15T00:00:00.000Z") // Date object
 */
export function deserializeValue(value: any): any {
  // Gère null et undefined
  if (value === null || value === undefined) {
    return value;
  }
  
  // Les non-strings sont retournés tels quels
  if (typeof value !== 'string') {
    return value;
  }
  
  // Chaîne vide reste chaîne vide
  if (value === '') {
    return value;
  }
  
  // Essaie de parser comme JSON
  const parsedJson = tryParseJson(value);
  if (parsedJson !== null) {
    return parsedJson;
  }
  
  // Détecte les listes séparées par ";"
  if (value.includes(';')) {
    const parts = value.split(';');
    // Essaie de désérialiser récursivement chaque élément
    return parts.map(part => {
      const trimmed = part.trim();
      // Si l'élément ressemble à du JSON, essaie de le parser
      const parsed = tryParseJson(trimmed);
      return parsed !== null ? parsed : trimmed;
    });
  }
  
  // Détecte les dates ISO
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (isoDateRegex.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Retourne la valeur telle quelle
  return value;
}

/**
 * Essaie de parser une chaîne JSON
 * Tries to parse a JSON string
 * 
 * @param value - La valeur à parser / The value to parse
 * @returns L'objet parsé ou null si le parsing échoue / The parsed object or null if parsing fails
 */
function tryParseJson(value: string): any | null {
  if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Définit une valeur dans un objet en utilisant un chemin (supporte la notation pointée)
 * Crée les objets intermédiaires si nécessaire
 * Sets a value in an object using a path (supports dot notation)
 * Creates intermediate objects if necessary
 * 
 * @param obj - L'objet cible / The target object
 * @param path - Le chemin vers la propriété (ex: "user.name") / The path to the property (e.g., "user.name")
 * @param value - La valeur à définir / The value to set
 * 
 * @example
 * const obj = {};
 * setNestedValue(obj, "user.name", "Alice");
 * // obj devient: { user: { name: "Alice" } }
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  if (!path || !obj) return;
  
  const keys = path.split('.');
  let current = obj;
  
  // Parcourt tous les keys sauf le dernier
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!key) continue; // Skip empty keys
    
    // Protection contre la pollution de prototype
    // Guard against prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      console.warn(`⚠️ Attempted to set dangerous property: ${key}`);
      return;
    }
    
    // Crée l'objet intermédiaire si nécessaire
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    
    current = current[key];
  }
  
  // Définit la valeur finale
  const lastKey = keys[keys.length - 1];
  if (lastKey) {
    // Protection contre la pollution de prototype
    // Guard against prototype pollution
    if (lastKey === '__proto__' || lastKey === 'constructor' || lastKey === 'prototype') {
      console.warn(`⚠️ Attempted to set dangerous property: ${lastKey}`);
      return;
    }
    
    current[lastKey] = value;
  }
}

/**
 * Transforme un enregistrement Grist en enregistrement API selon le mapping fourni
 * 
 * @param gristRecord - Un enregistrement provenant de Grist
 * @param mappings - Liste des mappings à appliquer
 * @returns Un objet JSON formaté pour l'API
 * 
 * @example
 * const gristData = { Name: "Alice", user_email: "alice@example.com", tags: "tag1;tag2" };
 * const mappings = [
 *   { gristColumn: "Name", apiField: "user.name" },
 *   { gristColumn: "user_email", apiField: "user.email" },
 *   { gristColumn: "tags", apiField: "tags" }
 * ];
 * transformGristToApi(gristData, mappings)
 * // Résultat: { user: { name: "Alice", email: "alice@example.com" }, tags: ["tag1", "tag2"] }
 */
export function transformGristToApi(gristRecord: Record<string, any>, mappings: FieldMapping[]): Record<string, any> {
  const apiRecord: Record<string, any> = {};
  
  for (const mapping of mappings) {
    if (!mapping.gristColumn || !mapping.apiField) continue;
    
    // Ignorer les mappings désactivés
    if (mapping.enabled === false) continue;
    
    // Récupère la valeur depuis Grist
    let value = gristRecord[mapping.gristColumn];
    
    // Applique la transformation personnalisée si définie
    if (mapping.transform && typeof mapping.transform === 'function') {
      value = mapping.transform(value);
    } else {
      // Sinon, applique la désérialisation automatique
      value = deserializeValue(value);
    }
    
    // Définit la valeur dans l'objet API (supporte la notation pointée)
    setNestedValue(apiRecord, mapping.apiField, value);
  }
  
  return apiRecord;
}

/**
 * Transforme un tableau d'enregistrements Grist en enregistrements API
 * 
 * @param gristRecords - Tableau d'enregistrements provenant de Grist
 * @param mappings - Liste des mappings à appliquer
 * @returns Un tableau d'objets prêts à être envoyés à l'API
 * 
 * @example
 * const gristData = [
 *   { Name: "Alice", Score: 85 },
 *   { Name: "Bob", Score: 92 }
 * ];
 * const mappings = [
 *   { gristColumn: "Name", apiField: "name" },
 *   { gristColumn: "Score", apiField: "score" }
 * ];
 * transformGristRecordsToApi(gristData, mappings)
 * // Résultat: [{ name: "Alice", score: 85 }, { name: "Bob", score: 92 }]
 */
export function transformGristRecordsToApi(gristRecords: Record<string, any>[], mappings: FieldMapping[]): Record<string, any>[] {
  if (!Array.isArray(gristRecords)) {
    return [];
  }
  
  return gristRecords.map(record => transformGristToApi(record, mappings));
}