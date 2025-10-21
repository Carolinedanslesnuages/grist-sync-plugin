/**
 * Exemple d'utilisation de la fonctionnalité upsert
 * 
 * Cet exemple montre comment synchroniser des données API vers Grist
 * tout en préservant les colonnes personnalisées existantes.
 */

import { GristClient } from '../src/utils/grist';
import type { GristConfig } from '../src/config';

// Configuration de base
const config: GristConfig = {
  docId: 'your-doc-id-here',
  tableId: 'Users',
  apiTokenGrist: 'your-api-token-here', // Optionnel si document public
  gristApiUrl: 'https://docs.getgrist.com',
  
  // Configuration de la synchronisation
  syncMode: 'upsert',          // Insère ou met à jour selon la clé unique
  uniqueKeyField: 'email',     // Utilise 'email' comme clé unique
  autoCreateColumns: true,     // Crée automatiquement les colonnes manquantes
  dryRun: false                // false pour appliquer les changements, true pour simuler
};

// Données à synchroniser depuis votre API
const usersFromApi = [
  {
    email: 'alice@example.com',
    name: 'Alice Dupont',
    department: 'Engineering',
    role: 'Senior Developer'
  },
  {
    email: 'bob@example.com',
    name: 'Bob Martin',
    department: 'Marketing',
    role: 'Marketing Manager'
  },
  {
    email: 'charlie@example.com',
    name: 'Charlie Bernard',
    department: 'Engineering',
    role: 'DevOps Engineer'
  }
];

async function syncUsers() {
  const client = new GristClient(config, (message, type) => {
    console.log(`[${type.toUpperCase()}] ${message}`);
  });

  try {
    console.log('🚀 Début de la synchronisation...');
    
    // Synchronisation avec upsert
    const result = await client.syncRecords(usersFromApi);
    
    console.log('\n✅ Synchronisation réussie!');
    console.log(`   📥 ${result.inserted} nouvel/nouveaux enregistrement(s) inséré(s)`);
    console.log(`   🔄 ${result.updated} enregistrement(s) mis à jour`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
  }
}

// Exemple de dry-run (simulation)
async function previewChanges() {
  // Active le mode dry-run
  const dryRunConfig: GristConfig = {
    ...config,
    dryRun: true
  };
  
  const client = new GristClient(dryRunConfig, (message, type) => {
    console.log(`[DRY-RUN ${type.toUpperCase()}] ${message}`);
  });

  try {
    console.log('🔍 Aperçu des changements (mode simulation)...\n');
    
    const result = await client.syncRecords(usersFromApi);
    
    console.log('\n📊 Résumé de la simulation:');
    console.log(`   ${result.inserted} enregistrement(s) seraient insérés`);
    console.log(`   ${result.updated} enregistrement(s) seraient mis à jour`);
    console.log('\n💡 Aucune modification appliquée (mode dry-run activé)');
    
  } catch (error) {
    console.error('❌ Erreur lors de la simulation:', error);
  }
}

// Exemple avec différents modes de synchronisation
async function syncWithMode(mode: 'insert' | 'update' | 'upsert') {
  const modeConfig: GristConfig = {
    ...config,
    syncMode: mode
  };
  
  const client = new GristClient(modeConfig);

  try {
    console.log(`\n🔄 Synchronisation en mode "${mode}"...`);
    const result = await client.syncRecords(usersFromApi);
    console.log(`✅ Terminé: ${result.inserted} insertions, ${result.updated} mises à jour`);
  } catch (error) {
    console.error(`❌ Erreur en mode ${mode}:`, error);
  }
}

// Démonstration complète
async function main() {
  console.log('='.repeat(60));
  console.log('Démonstration de la synchronisation Grist avec upsert');
  console.log('='.repeat(60));
  
  // 1. Aperçu des changements (dry-run)
  await previewChanges();
  
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // 2. Synchronisation réelle
  await syncUsers();
  
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // 3. Exemples avec différents modes
  await syncWithMode('insert');
  await syncWithMode('update');
  await syncWithMode('upsert');
}

// Décommenter pour exécuter
// main().catch(console.error);

export { syncUsers, previewChanges, syncWithMode };
