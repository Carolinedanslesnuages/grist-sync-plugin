/**
 * Configuration centralisée pour le plugin Grist Sync
 * 
 * Ce fichier contient les paramètres de connexion à votre document Grist.
 * Personnalisez ces valeurs selon votre environnement.
 */

export type SyncMode = 'insert' | 'update' | 'upsert';

export interface GristConfig {
  /** ID du document Grist (visible dans l'URL de votre document) */
  docId: string;
  
  /** ID de la table Grist où insérer les données */
  tableId: string;
  
  /** Token d'API Grist pour l'authentification (optionnel si public) */
  apiTokenGrist?: string;
  
  /** URL de base de l'API Grist (par défaut: https://docs.getgrist.com) */
  gristApiUrl?: string;
  
  /** Créer automatiquement les colonnes manquantes (par défaut: true) */
  autoCreateColumns?: boolean;
  
  /** Mode de synchronisation: 'insert' (ajout uniquement), 'update' (mise à jour uniquement), 'upsert' (ajout ou mise à jour) */
  syncMode?: SyncMode;
  
  /** Nom du champ utilisé comme clé unique pour identifier les enregistrements (ex: 'id', 'email') */
  uniqueKeyField?: string;
  
  /** Mode simulation (dry-run): affiche les changements sans les appliquer */
  dryRun?: boolean;
}

/**
 * Configuration par défaut
 * ⚠️ Modifiez ces valeurs selon votre document Grist
 */
export const defaultConfig: GristConfig = {
  docId: 'YOUR_DOC_ID',
  tableId: 'YOUR_TABLE_ID',
  apiTokenGrist: undefined, // Optionnel: ajoutez votre token ici
  gristApiUrl: 'https://docs.getgrist.com',
  autoCreateColumns: true, // Par défaut, créer automatiquement les colonnes manquantes
  syncMode: 'upsert', // Par défaut, insérer ou mettre à jour
  uniqueKeyField: 'id', // Par défaut, utiliser 'id' comme clé unique
  dryRun: false // Par défaut, appliquer les changements
};
