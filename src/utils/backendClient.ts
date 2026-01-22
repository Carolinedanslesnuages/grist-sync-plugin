/**
 * Client pour interagir avec l'API backend
 * 
 * Ce module gère l'envoi de données depuis Grist vers une API externe.
 */

import { analyzeError } from './errorHandler';

/**
 * Options d'authentification pour le BackendClient
 */
export interface BackendAuthOptions {
  /** Type d'authentification */
  type: 'none' | 'bearer' | 'api-key' | 'custom';
  
  /** Token pour authentification Bearer */
  bearerToken?: string;
  
  /** Clé API (header name et valeur) */
  apiKey?: {
    headerName: string;
    value: string;
  };
  
  /** Headers personnalisés */
  customHeaders?: Record<string, string>;
}

/**
 * Configuration pour le BackendClient
 */
export interface BackendClientConfig {
  /** URL de base de l'API backend */
  baseUrl: string;
  
  /** Options d'authentification */
  auth?: BackendAuthOptions;
  
  /** Timeout en ms (par défaut: 30000) */
  timeout?: number;
}

/**
 * Résultat d'une requête au backend
 */
export interface BackendResponse<T = any> {
  /** Statut HTTP */
  status: number;
  
  /** Données de la réponse */
  data: T;
  
  /** Message de succès (optionnel) */
  message?: string;
}

/**
 * Classe pour gérer les interactions avec une API backend
 */
export class BackendClient {
  private config: BackendClientConfig;
  private onLog?: (message: string, type: 'info' | 'success' | 'error') => void;
  
  constructor(config: BackendClientConfig, onLog?: (message: string, type: 'info' | 'success' | 'error') => void) {
    this.config = {
      timeout: 30000,
      ...config
    };
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
   * Construit les headers HTTP pour les requêtes au backend
   * 
   * @returns Un objet contenant les headers nécessaires
   */
  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Ajoute l'authentification selon le type configuré
    if (this.config.auth) {
      switch (this.config.auth.type) {
        case 'bearer':
          if (this.config.auth.bearerToken) {
            headers['Authorization'] = `Bearer ${this.config.auth.bearerToken}`;
          }
          break;
        
        case 'api-key':
          if (this.config.auth.apiKey) {
            headers[this.config.auth.apiKey.headerName] = this.config.auth.apiKey.value;
          }
          break;
        
        case 'custom':
          if (this.config.auth.customHeaders) {
            Object.assign(headers, this.config.auth.customHeaders);
          }
          break;
      }
    }
    
    return headers;
  }
  
  /**
   * Effectue une requête HTTP vers le backend avec timeout
   * 
   * @param endpoint - Le endpoint de l'API (ex: "/users")
   * @param method - La méthode HTTP
   * @param body - Le corps de la requête (pour POST/PUT/PATCH)
   * @returns Promesse résolue avec la réponse
   */
  private async request<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: any
  ): Promise<BackendResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(url, {
        method,
        headers: this.buildHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }
      
      // Tente de parser la réponse comme JSON
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Si ce n'est pas du JSON, retourne le texte brut
        data = await response.text() as any;
      }
      
      return {
        status: response.status,
        data
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Analyse l'erreur avec notre gestionnaire d'erreurs
      const errorInfo = analyzeError(error, 'api_send');
      this.log(`${errorInfo.title}: ${errorInfo.message}`, 'error');
      
      // Affiche la première solution si disponible
      if (errorInfo.solutions && errorInfo.solutions.length > 0) {
        this.log(`💡 ${errorInfo.solutions[0]}`, 'error');
      }
      
      if (error instanceof Error) {
        const solution = errorInfo.solutions && errorInfo.solutions.length > 0 
          ? ` - ${errorInfo.solutions[0]}` 
          : '';
        throw new Error(`${errorInfo.message}${solution}`);
      }
      throw error;
    }
  }
  
  /**
   * Teste la connexion au backend
   * 
   * @returns true si la connexion réussit, false sinon
   */
  async testConnection(): Promise<boolean> {
    try {
      // Effectue une requête GET simple pour tester la connexion
      await this.request('/', 'GET');
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Envoie des enregistrements au backend via POST
   * 
   * @param endpoint - Le endpoint de l'API (ex: "/users")
   * @param records - Tableau d'enregistrements à envoyer
   * @returns Promesse résolue avec la réponse du backend
   * @throws Error si la requête échoue
   * 
   * @example
   * const client = new BackendClient({ baseUrl: 'https://api.example.com' });
   * await client.postRecords('/users', [
   *   { name: "Alice", email: "alice@example.com" },
   *   { name: "Bob", email: "bob@example.com" }
   * ]);
   */
  async postRecords<T = any>(endpoint: string, records: Record<string, any>[]): Promise<BackendResponse<T>> {
    if (!records || records.length === 0) {
      throw new Error('Aucun enregistrement à envoyer');
    }
    
    this.log(`📤 Envoi de ${records.length} enregistrement(s) vers ${endpoint}`, 'info');
    
    const response = await this.request<T>(endpoint, 'POST', { records });
    
    this.log(`✅ Enregistrements envoyés avec succès`, 'success');
    
    return response;
  }
  
  /**
   * Met à jour un enregistrement via PUT
   * 
   * @param endpoint - Le endpoint de l'API (ex: "/users/123")
   * @param record - Enregistrement à mettre à jour
   * @returns Promesse résolue avec la réponse du backend
   * @throws Error si la requête échoue
   * 
   * @example
   * const client = new BackendClient({ baseUrl: 'https://api.example.com' });
   * await client.putRecord('/users/123', { name: "Alice Updated" });
   */
  async putRecord<T = any>(endpoint: string, record: Record<string, any>): Promise<BackendResponse<T>> {
    if (!record) {
      throw new Error('Aucun enregistrement à mettre à jour');
    }
    
    this.log(`📤 Mise à jour de l'enregistrement vers ${endpoint}`, 'info');
    
    const response = await this.request<T>(endpoint, 'PUT', record);
    
    this.log(`✅ Enregistrement mis à jour avec succès`, 'success');
    
    return response;
  }
  
  /**
   * Met à jour partiellement un enregistrement via PATCH
   * 
   * @param endpoint - Le endpoint de l'API (ex: "/users/123")
   * @param record - Champs à mettre à jour
   * @returns Promesse résolue avec la réponse du backend
   * @throws Error si la requête échoue
   * 
   * @example
   * const client = new BackendClient({ baseUrl: 'https://api.example.com' });
   * await client.patchRecord('/users/123', { name: "Alice" });
   */
  async patchRecord<T = any>(endpoint: string, record: Record<string, any>): Promise<BackendResponse<T>> {
    if (!record) {
      throw new Error('Aucun enregistrement à mettre à jour');
    }
    
    this.log(`📤 Mise à jour partielle de l'enregistrement vers ${endpoint}`, 'info');
    
    const response = await this.request<T>(endpoint, 'PATCH', record);
    
    this.log(`✅ Enregistrement mis à jour avec succès`, 'success');
    
    return response;
  }
  
  /**
   * Récupère des données depuis le backend via GET
   * 
   * @param endpoint - Le endpoint de l'API (ex: "/users")
   * @returns Promesse résolue avec les données
   * @throws Error si la requête échoue
   * 
   * @example
   * const client = new BackendClient({ baseUrl: 'https://api.example.com' });
   * const users = await client.get('/users');
   */
  async get<T = any>(endpoint: string): Promise<BackendResponse<T>> {
    this.log(`📥 Récupération des données depuis ${endpoint}`, 'info');
    
    const response = await this.request<T>(endpoint, 'GET');
    
    this.log(`✅ Données récupérées avec succès`, 'success');
    
    return response;
  }
  
  /**
   * Supprime un enregistrement via DELETE
   * 
   * @param endpoint - Le endpoint de l'API (ex: "/users/123")
   * @returns Promesse résolue avec la réponse du backend
   * @throws Error si la requête échoue
   * 
   * @example
   * const client = new BackendClient({ baseUrl: 'https://api.example.com' });
   * await client.delete('/users/123');
   */
  async delete<T = any>(endpoint: string): Promise<BackendResponse<T>> {
    this.log(`🗑️ Suppression de l'enregistrement ${endpoint}`, 'info');
    
    const response = await this.request<T>(endpoint, 'DELETE');
    
    this.log(`✅ Enregistrement supprimé avec succès`, 'success');
    
    return response;
  }
}
