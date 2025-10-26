/**
 * Configuration centralisée pour le plugin Grist Sync
 * 
 * Ce fichier contient les paramètres de connexion à votre document Grist.
 * Personnalisez ces valeurs selon votre environnement.
 */

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
  
  /** Colonne unique pour identifier les enregistrements existants (ex: 'api_id', 'Email') */
  uniqueKey?: string;
  
  /** Mode de synchronisation: 'add' (ajouter uniquement), 'update' (mettre à jour), 'upsert' (ajouter ou mettre à jour) */
  syncMode?: 'add' | 'update' | 'upsert';
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
  uniqueKey: undefined, // Optionnel: colonne unique pour identifier les enregistrements existants
  syncMode: 'add' // Par défaut, mode 'add' (ajouter uniquement les nouveaux enregistrements)
};
