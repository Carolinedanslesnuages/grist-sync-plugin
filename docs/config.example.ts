/**
 * Exemple de configuration pour tester le plugin avec Grist local
 * 
 * Copiez ce fichier dans src/config.ts et adaptez-le à votre environnement.
 */

import type { GristConfig } from './config';

/**
 * Configuration pour une instance Grist locale (Docker)
 */
export const localGristConfig: GristConfig = {
  // Remplacez par l'ID de votre document Grist
  // Vous le trouverez dans l'URL: http://localhost:8484/doc/YOUR_DOC_ID
  docId: 'YOUR_DOC_ID',
  
  // Remplacez par le nom de votre table (ex: "Table1", "Contacts", etc.)
  tableId: 'YOUR_TABLE_ID',
  
  // Token API optionnel - laissez undefined pour un document public
  // Pour générer un token: Profile Settings > API > Create
  apiTokenGrist: undefined,
  
  // URL de votre instance Grist locale
  gristApiUrl: 'http://localhost:8484',
  
  // Créer automatiquement les colonnes manquantes
  autoCreateColumns: true
};

/**
 * Configuration pour l'instance Grist officielle (production)
 */
export const productionGristConfig: GristConfig = {
  docId: 'YOUR_DOC_ID',
  tableId: 'YOUR_TABLE_ID',
  apiTokenGrist: 'YOUR_API_TOKEN', // Token requis pour docs.getgrist.com
  gristApiUrl: 'https://docs.getgrist.com',
  autoCreateColumns: true
};

/**
 * Exemple complet avec toutes les options
 */
export const fullExampleConfig: GristConfig = {
  docId: 'sampleDoc123abc',
  tableId: 'Contacts',
  apiTokenGrist: 'your-secret-token-here',
  gristApiUrl: 'http://localhost:8484',
  autoCreateColumns: true
};
