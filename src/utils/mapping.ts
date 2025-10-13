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
