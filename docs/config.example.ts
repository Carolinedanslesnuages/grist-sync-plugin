/**
 * Exemple de configuration pour tester le plugin avec Grist local
 * 
 * Ce fichier sert de référence. Pour l'utiliser:
 * 1. Copiez le contenu souhaité
 * 2. Collez-le dans src/config.ts
 * 3. Adaptez les valeurs à votre environnement
 */

// Note: L'import ci-dessous suppose que ce code est dans src/config.ts
// Si vous utilisez ce fichier comme référence, adaptez le chemin d'import si nécessaire
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
