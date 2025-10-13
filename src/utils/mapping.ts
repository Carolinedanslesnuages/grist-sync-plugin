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
    if (!mapping.gristColumn || !mapping.apiField) continue;
    
    // Ignorer les mappings désactivés
    if (mapping.enabled === false) continue;
    
    let value = getNestedValue(apiRecord, mapping.apiField);
    
    // Applique la transformation si définie
    if (mapping.transform && typeof mapping.transform === 'function') {
      value = mapping.transform(value);
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
 * @param mapping - Le mapping à valider
 * @returns true si le mapping est valide, false sinon
 */
export function isValidMapping(mapping: FieldMapping): boolean {
  return !!(mapping.gristColumn && mapping.apiField);
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
    if (!obj.hasOwnProperty(key)) continue;
    
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
  
  return apiFields.map(apiField => {
    // Convertir le chemin API en nom de colonne Grist
    // Ex: "user.profile.name" -> "user_profile_name"
    const gristColumn = apiField.replace(/\./g, '_');
    
    return {
      apiField,
      gristColumn,
      enabled: defaultEnabled
    };
  });
}
