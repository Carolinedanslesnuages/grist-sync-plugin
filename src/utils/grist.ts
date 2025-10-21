/**
 * Utilitaire pour interagir avec l'API Grist
 * 
 * Ce module gère l'insertion et la synchronisation des données avec Grist.
 */

import type { GristConfig } from '../config';
import { analyzeError } from './errorHandler';

/**
 * Interface pour une requête d'ajout d'enregistrements à Grist
 */
export interface GristAddRecordsRequest {
  records: Array<{
    fields: Record<string, any>;
  }>;
}

/**
 * Interface pour une requête de mise à jour d'enregistrements à Grist
 */
export interface GristUpdateRecordsRequest {
  records: Array<{
    id: number;
    fields: Record<string, any>;
  }>;
}

/**
 * Interface pour la réponse de Grist lors de l'ajout d'enregistrements
 */
export interface GristAddRecordsResponse {
  records: Array<{
    id: number;
  }>;
}

/**
 * Interface pour un enregistrement Grist complet
 */
export interface GristRecord {
  id: number;
  fields: Record<string, any>;
}

/**
 * Interface pour les résultats d'un dry-run
 */
export interface DryRunResult {
  toInsert: Record<string, any>[];
  toUpdate: Array<{ id: number; fields: Record<string, any> }>;
  summary: {
    totalRecords: number;
    recordsToInsert: number;
    recordsToUpdate: number;
    columnsAffected: string[];
  };
}

/**
 * Interface pour les informations d'une colonne Grist
 */
export interface GristColumn {
  id: string;
  fields: {
    label?: string;
    type?: string;
    colId: string;
  };
}

/**
 * Interface pour la réponse de récupération des colonnes
 */
export interface GristColumnsResponse {
  columns: GristColumn[];
}

/**
 * Interface pour la requête d'ajout de colonnes
 */
export interface GristAddColumnsRequest {
  columns: Array<{
    id: string;
    fields: {
      label?: string;
      type: string;
      colId: string;
    };
  }>;
}

/**
 * Interface pour les informations extraites d'une URL Grist
 */
export interface ParsedGristUrl {
  docId: string | null;
  gristApiUrl: string | null;
}

/**
 * Parse une URL de document Grist pour extraire le docId et l'URL de base
 * 
 * @param url - L'URL complète du document Grist
 * @returns Un objet contenant le docId et l'URL de base de l'API
 * 
 * @example
 * parseGristUrl('https://docs.getgrist.com/doc/abc123xyz')
 * // { docId: 'abc123xyz', gristApiUrl: 'https://docs.getgrist.com' }
 * 
 * parseGristUrl('https://grist.example.com/o/myorg/doc/myDocId/p/5')
 * // { docId: 'myDocId', gristApiUrl: 'https://grist.example.com' }
 */
export function parseGristUrl(url: string): ParsedGristUrl {
  try {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    
    // Recherche du docId dans le chemin de l'URL
    // Format typique: /doc/{docId} ou /o/{org}/doc/{docId}
    const docMatch = urlObj.pathname.match(/\/doc\/([^\/\?#]+)/);
    
    if (docMatch && docMatch[1]) {
      return {
        docId: docMatch[1],
        gristApiUrl: baseUrl
      };
    }
    
    return { docId: null, gristApiUrl: null };
  } catch (error) {
    // URL invalide
    return { docId: null, gristApiUrl: null };
  }
}

/**
 * Valide si une chaîne de caractères est une URL Grist valide
 * 
 * @param url - L'URL à valider
 * @returns true si l'URL est valide et contient un docId
 */
export function isValidGristUrl(url: string): boolean {
  const parsed = parseGristUrl(url);
  return parsed.docId !== null && parsed.gristApiUrl !== null;
}

/**
 * Classe pour gérer les interactions avec l'API Grist
 */
export class GristClient {
  private config: GristConfig;
  private onLog?: (message: string, type: 'info' | 'success' | 'error') => void;
  
  constructor(config: GristConfig, onLog?: (message: string, type: 'info' | 'success' | 'error') => void) {
    this.config = config;
    this.onLog = onLog;
  }
  
  /**
   * Log un message si un callback est fourni
   */
  private log(message: string, type: 'info' | 'success' | 'error' = 'info') {
    if (this.onLog) {
      this.onLog(message, type);
    }
  }
  
  /**
   * Construit l'URL de l'API pour une requête donnée
   * 
   * @param endpoint - Le endpoint de l'API (ex: "/records")
   * @returns L'URL complète de l'API
   */
  private buildApiUrl(endpoint: string): string {
    const baseUrl = this.config.gristApiUrl || 'https://docs.getgrist.com';
    return `${baseUrl}/api/docs/${this.config.docId}/tables/${this.config.tableId}${endpoint}`;
  }
  
  /**
   * Construit les headers HTTP pour les requêtes à l'API Grist
   * 
   * @returns Un objet contenant les headers nécessaires
   */
  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.config.apiTokenGrist) {
      headers['Authorization'] = `Bearer ${this.config.apiTokenGrist}`;
    }
    
    return headers;
  }
  
  /**
   * Ajoute des enregistrements à la table Grist
   * 
   * @param records - Tableau d'enregistrements à insérer (objets avec les colonnes Grist)
   * @param skipColumnCheck - Si true, ne vérifie pas les colonnes (utilisé en interne)
   * @returns Promesse résolue avec la réponse de Grist
   * @throws Error si la requête échoue
   * 
   * @example
   * const client = new GristClient(config);
   * await client.addRecords([
   *   { Name: "Alice", Email: "alice@example.com" },
   *   { Name: "Bob", Email: "bob@example.com" }
   * ]);
   */
  async addRecords(records: Record<string, any>[], skipColumnCheck = false): Promise<GristAddRecordsResponse> {
    if (!records || records.length === 0) {
      throw new Error('Aucun enregistrement à ajouter');
    }
    
    // Si l'option autoCreateColumns est activée, créer les colonnes manquantes
    if (!skipColumnCheck && this.config.autoCreateColumns !== false) {
      await this.ensureColumnsExist(records);
    }
    
    const url = this.buildApiUrl('/records');
    const body: GristAddRecordsRequest = {
      records: records.map(fields => ({ fields }))
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      // Analyse l'erreur avec notre gestionnaire d'erreurs
      const errorInfo = analyzeError(error, 'grist_sync');
      this.log(`${errorInfo.title}: ${errorInfo.message}`, 'error');
      this.log(`💡 ${errorInfo.solutions[0]}`, 'error');
      
      if (error instanceof Error) {
        throw new Error(`${errorInfo.message} - ${errorInfo.solutions[0]}`);
      }
      throw error;
    }
  }
  
  /**
   * Met à jour des enregistrements existants dans la table Grist
   * 
   * @param records - Tableau d'enregistrements à mettre à jour (avec l'ID Grist et les champs)
   * @returns Promesse résolue lorsque la mise à jour est terminée
   * @throws Error si la requête échoue
   * 
   * @example
   * const client = new GristClient(config);
   * await client.updateRecords([
   *   { id: 1, fields: { Name: "Alice Updated" } },
   *   { id: 2, fields: { Name: "Bob Updated" } }
   * ]);
   */
  async updateRecords(records: Array<{ id: number; fields: Record<string, any> }>): Promise<void> {
    if (!records || records.length === 0) {
      throw new Error('Aucun enregistrement à mettre à jour');
    }
    
    const url = this.buildApiUrl('/records');
    const body: GristUpdateRecordsRequest = {
      records: records
    };
    
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.buildHeaders(),
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      // Analyse l'erreur avec notre gestionnaire d'erreurs
      const errorInfo = analyzeError(error, 'grist_sync');
      this.log(`${errorInfo.title}: ${errorInfo.message}`, 'error');
      this.log(`💡 ${errorInfo.solutions[0]}`, 'error');
      
      if (error instanceof Error) {
        throw new Error(`${errorInfo.message} - ${errorInfo.solutions[0]}`);
      }
      throw error;
    }
  }
  
  /**
   * Récupère les enregistrements existants dans la table Grist
   * 
   * @param limit - Nombre maximum d'enregistrements à récupérer (optionnel)
   * @returns Promesse résolue avec les enregistrements
   * @throws Error si la requête échoue
   */
  async getRecords(limit?: number): Promise<GristRecord[]> {
    let url = this.buildApiUrl('/records');
    if (limit) {
      url += `?limit=${limit}`;
    }
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders()
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      return data.records || [];
    } catch (error) {
      // Analyse l'erreur avec notre gestionnaire d'erreurs
      const errorInfo = analyzeError(error, 'grist_sync');
      
      if (error instanceof Error) {
        throw new Error(`${errorInfo.message} - ${errorInfo.solutions[0]}`);
      }
      throw error;
    }
  }
  
  /**
   * Insère ou met à jour des enregistrements dans Grist (upsert)
   * 
   * @param records - Tableau d'enregistrements à synchroniser
   * @returns Promesse résolue avec les résultats de la synchronisation
   * @throws Error si la requête échoue
   * 
   * @example
   * const client = new GristClient(config);
   * await client.upsertRecords([
   *   { id: 1, Name: "Alice", Email: "alice@example.com" },
   *   { id: 2, Name: "Bob", Email: "bob@example.com" }
   * ]);
   */
  async upsertRecords(records: Record<string, any>[]): Promise<{ inserted: number; updated: number }> {
    if (!records || records.length === 0) {
      throw new Error('Aucun enregistrement à synchroniser');
    }
    
    const uniqueKeyField = this.config.uniqueKeyField || 'id';
    
    this.log(`🔍 Récupération des enregistrements existants...`, 'info');
    
    // Récupère tous les enregistrements existants
    const existingRecords = await this.getRecords();
    
    // Crée un index des enregistrements existants par la clé unique
    const existingRecordsMap = new Map<any, GristRecord>();
    for (const record of existingRecords) {
      const keyValue = record.fields[uniqueKeyField];
      if (keyValue !== undefined && keyValue !== null) {
        existingRecordsMap.set(keyValue, record);
      }
    }
    
    this.log(`✓ ${existingRecords.length} enregistrement(s) existant(s) trouvé(s)`, 'success');
    
    // Sépare les enregistrements à insérer et à mettre à jour
    const recordsToInsert: Record<string, any>[] = [];
    const recordsToUpdate: Array<{ id: number; fields: Record<string, any> }> = [];
    
    for (const record of records) {
      const keyValue = record[uniqueKeyField];
      
      if (keyValue === undefined || keyValue === null) {
        // Pas de clé unique, toujours insérer
        recordsToInsert.push(record);
      } else {
        const existingRecord = existingRecordsMap.get(keyValue);
        
        if (existingRecord) {
          // L'enregistrement existe, préparer la mise à jour
          // Ne mettre à jour que les champs présents dans les données sources
          recordsToUpdate.push({
            id: existingRecord.id,
            fields: record
          });
        } else {
          // Nouveau enregistrement, insérer
          recordsToInsert.push(record);
        }
      }
    }
    
    this.log(`➕ ${recordsToInsert.length} enregistrement(s) à insérer`, 'info');
    this.log(`🔄 ${recordsToUpdate.length} enregistrement(s) à mettre à jour`, 'info');
    
    let insertedCount = 0;
    let updatedCount = 0;
    
    // Si mode dry-run, ne pas effectuer les opérations
    if (this.config.dryRun) {
      this.log(`🔍 Mode simulation (dry-run) - Aucune modification appliquée`, 'info');
      return { inserted: recordsToInsert.length, updated: recordsToUpdate.length };
    }
    
    // Si l'option autoCreateColumns est activée, créer les colonnes manquantes
    if (this.config.autoCreateColumns !== false) {
      await this.ensureColumnsExist(records);
    }
    
    // Insère les nouveaux enregistrements
    if (recordsToInsert.length > 0) {
      this.log(`📤 Insertion de ${recordsToInsert.length} nouvel/nouveaux enregistrement(s)...`, 'info');
      const insertResult = await this.addRecords(recordsToInsert, true); // Skip column check since we already did it
      insertedCount = insertResult.records.length;
      this.log(`✅ ${insertedCount} enregistrement(s) inséré(s)`, 'success');
    }
    
    // Met à jour les enregistrements existants
    if (recordsToUpdate.length > 0) {
      this.log(`🔄 Mise à jour de ${recordsToUpdate.length} enregistrement(s)...`, 'info');
      await this.updateRecords(recordsToUpdate);
      updatedCount = recordsToUpdate.length;
      this.log(`✅ ${updatedCount} enregistrement(s) mis à jour`, 'success');
    }
    
    return { inserted: insertedCount, updated: updatedCount };
  }
  
  /**
   * Prépare un aperçu des changements sans les appliquer (dry-run)
   * 
   * @param records - Tableau d'enregistrements à synchroniser
   * @returns Promesse résolue avec les détails des changements prévus
   */
  async prepareDryRun(records: Record<string, any>[]): Promise<DryRunResult> {
    if (!records || records.length === 0) {
      throw new Error('Aucun enregistrement à analyser');
    }
    
    const uniqueKeyField = this.config.uniqueKeyField || 'id';
    
    // Récupère tous les enregistrements existants
    const existingRecords = await this.getRecords();
    
    // Crée un index des enregistrements existants par la clé unique
    const existingRecordsMap = new Map<any, GristRecord>();
    for (const record of existingRecords) {
      const keyValue = record.fields[uniqueKeyField];
      if (keyValue !== undefined && keyValue !== null) {
        existingRecordsMap.set(keyValue, record);
      }
    }
    
    // Sépare les enregistrements à insérer et à mettre à jour
    const toInsert: Record<string, any>[] = [];
    const toUpdate: Array<{ id: number; fields: Record<string, any> }> = [];
    
    // Détermine les colonnes affectées
    const columnsAffected = new Set<string>();
    
    for (const record of records) {
      const keyValue = record[uniqueKeyField];
      
      // Ajoute toutes les colonnes de cet enregistrement
      for (const key of Object.keys(record)) {
        columnsAffected.add(key);
      }
      
      if (keyValue === undefined || keyValue === null) {
        toInsert.push(record);
      } else {
        const existingRecord = existingRecordsMap.get(keyValue);
        
        if (existingRecord) {
          toUpdate.push({
            id: existingRecord.id,
            fields: record
          });
        } else {
          toInsert.push(record);
        }
      }
    }
    
    return {
      toInsert,
      toUpdate,
      summary: {
        totalRecords: records.length,
        recordsToInsert: toInsert.length,
        recordsToUpdate: toUpdate.length,
        columnsAffected: Array.from(columnsAffected)
      }
    };
  }
  
  /**
   * Synchronise des enregistrements vers Grist selon le mode configuré
   * 
   * @param records - Tableau d'enregistrements à synchroniser
   * @returns Promesse résolue avec les résultats de la synchronisation
   * @throws Error si la requête échoue
   */
  async syncRecords(records: Record<string, any>[]): Promise<{ inserted: number; updated: number }> {
    const syncMode = this.config.syncMode || 'upsert';
    
    this.log(`🔄 Mode de synchronisation: ${syncMode}`, 'info');
    
    switch (syncMode) {
      case 'insert':
        this.log(`📤 Insertion de ${records.length} enregistrement(s)...`, 'info');
        if (this.config.dryRun) {
          this.log(`🔍 Mode simulation (dry-run) - Aucune modification appliquée`, 'info');
          return { inserted: records.length, updated: 0 };
        }
        const insertResult = await this.addRecords(records);
        return { inserted: insertResult.records.length, updated: 0 };
      
      case 'update':
        this.log(`🔄 Mise à jour des enregistrements existants...`, 'info');
        // Pour update, on doit d'abord récupérer les enregistrements existants
        const uniqueKeyField = this.config.uniqueKeyField || 'id';
        const existingRecords = await this.getRecords();
        const existingRecordsMap = new Map<any, GristRecord>();
        
        for (const record of existingRecords) {
          const keyValue = record.fields[uniqueKeyField];
          if (keyValue !== undefined && keyValue !== null) {
            existingRecordsMap.set(keyValue, record);
          }
        }
        
        const recordsToUpdate: Array<{ id: number; fields: Record<string, any> }> = [];
        for (const record of records) {
          const keyValue = record[uniqueKeyField];
          const existingRecord = existingRecordsMap.get(keyValue);
          
          if (existingRecord) {
            recordsToUpdate.push({
              id: existingRecord.id,
              fields: record
            });
          }
        }
        
        if (recordsToUpdate.length === 0) {
          this.log(`⚠️ Aucun enregistrement existant à mettre à jour`, 'error');
          return { inserted: 0, updated: 0 };
        }
        
        if (this.config.dryRun) {
          this.log(`🔍 Mode simulation (dry-run) - Aucune modification appliquée`, 'info');
          return { inserted: 0, updated: recordsToUpdate.length };
        }
        
        await this.updateRecords(recordsToUpdate);
        return { inserted: 0, updated: recordsToUpdate.length };
      
      case 'upsert':
      default:
        return await this.upsertRecords(records);
    }
  }
  
  /**
   * Récupère les colonnes existantes de la table Grist
   * 
   * @returns Promesse résolue avec la liste des colonnes
   * @throws Error si la requête échoue
   */
  async getColumns(): Promise<GristColumn[]> {
    const baseUrl = this.config.gristApiUrl || 'https://docs.getgrist.com';
    const url = `${baseUrl}/api/docs/${this.config.docId}/tables/${this.config.tableId}/columns`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders()
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }
      
      const data: GristColumnsResponse = await response.json();
      return data.columns || [];
    } catch (error) {
      // Analyse l'erreur avec notre gestionnaire d'erreurs
      const errorInfo = analyzeError(error, 'grist_sync');
      
      if (error instanceof Error) {
        throw new Error(`${errorInfo.message} - ${errorInfo.solutions[0]}`);
      }
      throw error;
    }
  }
  
  /**
   * Crée de nouvelles colonnes dans la table Grist
   * 
   * @param columns - Liste des colonnes à créer
   * @returns Promesse résolue avec la réponse de Grist
   * @throws Error si la requête échoue
   */
  async addColumns(columns: Array<{ id: string; label?: string; type?: string }>): Promise<any> {
    if (!columns || columns.length === 0) {
      return { columns: [] };
    }
    
    const baseUrl = this.config.gristApiUrl || 'https://docs.getgrist.com';
    const url = `${baseUrl}/api/docs/${this.config.docId}/tables/${this.config.tableId}/columns`;
    
    const body: GristAddColumnsRequest = {
      columns: columns.map(col => ({
        id: col.id,
        fields: {
          colId: col.id,
          label: col.label || col.id,
          type: col.type || 'Text'
        }
      }))
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      // Analyse l'erreur avec notre gestionnaire d'erreurs
      const errorInfo = analyzeError(error, 'grist_sync');
      this.log(`${errorInfo.title}: ${errorInfo.message}`, 'error');
      this.log(`💡 ${errorInfo.solutions[0]}`, 'error');
      
      if (error instanceof Error) {
        throw new Error(`${errorInfo.message} - ${errorInfo.solutions[0]}`);
      }
      throw error;
    }
  }
  
  /**
   * Vérifie et crée les colonnes manquantes avant l'insertion
   * 
   * @param records - Enregistrements à insérer
   */
  async ensureColumnsExist(records: Record<string, any>[]): Promise<void> {
    if (!records || records.length === 0) {
      return;
    }
    
    try {
      // Récupère les colonnes existantes
      this.log('🔍 Vérification des colonnes existantes...', 'info');
      const existingColumns = await this.getColumns();
      const existingColumnIds = new Set(
        existingColumns.map(col => col.fields.colId)
      );
      
      this.log(`✓ ${existingColumns.length} colonne(s) existante(s) détectée(s)`, 'success');
      
      // Extrait toutes les colonnes nécessaires depuis les enregistrements
      const requiredColumns = new Set<string>();
      for (const record of records) {
        for (const key of Object.keys(record)) {
          requiredColumns.add(key);
        }
      }
      
      // Détermine les colonnes manquantes
      const missingColumns = Array.from(requiredColumns).filter(
        col => !existingColumnIds.has(col)
      );
      
      // Crée les colonnes manquantes si nécessaire
      if (missingColumns.length > 0) {
        this.log(`➕ Création de ${missingColumns.length} colonne(s) manquante(s): ${missingColumns.join(', ')}`, 'info');
        
        const columnsToCreate = missingColumns.map(id => ({
          id,
          label: id,
          type: this.inferColumnType(records, id)
        }));
        
        await this.addColumns(columnsToCreate);
        this.log(`✅ Colonnes créées avec succès!`, 'success');
      } else {
        this.log('✓ Toutes les colonnes nécessaires existent déjà', 'success');
      }
    } catch (error) {
      // En cas d'erreur, on log mais on ne bloque pas l'insertion
      // (les colonnes peuvent déjà exister ou l'utilisateur n'a peut-être pas les permissions)
      if (error instanceof Error) {
        this.log(`⚠️ Avertissement lors de la création automatique des colonnes: ${error.message}`, 'error');
        console.warn(`Avertissement lors de la création automatique des colonnes: ${error.message}`);
      }
    }
  }
  
  /**
   * Infère le type de colonne approprié basé sur les données
   * 
   * @param records - Enregistrements à analyser
   * @param columnName - Nom de la colonne
   * @returns Le type de colonne Grist approprié
   */
  private inferColumnType(records: Record<string, any>[], columnName: string): string {
    // Examine les premières valeurs pour déterminer le type
    for (const record of records.slice(0, 10)) {
      const value = record[columnName];
      
      if (value === null || value === undefined) {
        continue;
      }
      
      if (typeof value === 'number') {
        return Number.isInteger(value) ? 'Int' : 'Numeric';
      }
      
      if (typeof value === 'boolean') {
        return 'Bool';
      }
      
      // Essaie de détecter les dates
      if (typeof value === 'string') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}/;
        if (dateRegex.test(value)) {
          return 'DateTime';
        }
      }
      
      // Par défaut, utilise Text
      return 'Text';
    }
    
    // Si aucune valeur n'est trouvée, utilise Text par défaut
    return 'Text';
  }
  
  /**
   * Teste la connexion à Grist
   * 
   * @returns true si la connexion réussit, false sinon
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getRecords(1);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Vérifie si le token API est valide en testant une requête simple
   * 
   * @returns Un objet avec le statut de validation et un message
   */
  async validateApiToken(): Promise<{ valid: boolean; message: string; needsAuth: boolean }> {
    try {
      const response = await fetch(this.buildApiUrl('/records?limit=1'), {
        method: 'GET',
        headers: this.buildHeaders()
      });
      
      if (response.status === 401) {
        return {
          valid: false,
          message: 'Document privé - Token API requis',
          needsAuth: true
        };
      }
      
      if (response.status === 403) {
        return {
          valid: false,
          message: 'Token API invalide ou permissions insuffisantes',
          needsAuth: true
        };
      }
      
      if (response.ok) {
        if (this.config.apiTokenGrist) {
          return {
            valid: true,
            message: 'Token API valide et authentifié',
            needsAuth: false
          };
        } else {
          return {
            valid: true,
            message: 'Document public - Aucune authentification requise',
            needsAuth: false
          };
        }
      }
      
      return {
        valid: false,
        message: `Erreur HTTP ${response.status}`,
        needsAuth: response.status === 401 || response.status === 403
      };
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Erreur de connexion',
        needsAuth: false
      };
    }
  }
}

/**
 * Fonction helper pour insérer des enregistrements dans Grist
 * 
 * @param records - Tableau d'enregistrements à insérer
 * @param config - Configuration Grist
 * @returns Promesse résolue avec la réponse de Grist
 * 
 * @example
 * await insertRecordsToGrist(
 *   [{ Name: "Alice", Email: "alice@example.com" }],
 *   { docId: "abc123", tableId: "Users" }
 * );
 */
export async function insertRecordsToGrist(
  records: Record<string, any>[],
  config: GristConfig
): Promise<GristAddRecordsResponse> {
  const client = new GristClient(config);
  return await client.addRecords(records);
}
