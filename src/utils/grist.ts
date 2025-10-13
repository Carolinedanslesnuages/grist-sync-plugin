/**
 * Utilitaire pour interagir avec l'API Grist
 * 
 * Ce module gère l'insertion et la synchronisation des données avec Grist.
 */

import type { GristConfig } from '../config';

/**
 * Interface pour une requête d'ajout d'enregistrements à Grist
 */
export interface GristAddRecordsRequest {
  records: Array<{
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
 * Classe pour gérer les interactions avec l'API Grist
 */
export class GristClient {
  private config: GristConfig;
  
  constructor(config: GristConfig) {
    this.config = config;
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
  async addRecords(records: Record<string, any>[]): Promise<GristAddRecordsResponse> {
    if (!records || records.length === 0) {
      throw new Error('Aucun enregistrement à ajouter');
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
        throw new Error(`Erreur Grist (${response.status}): ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Échec de l'insertion dans Grist: ${error.message}`);
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
  async getRecords(limit?: number): Promise<any[]> {
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
        throw new Error(`Erreur Grist (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      return data.records || [];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Échec de la lecture depuis Grist: ${error.message}`);
      }
      throw error;
    }
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
