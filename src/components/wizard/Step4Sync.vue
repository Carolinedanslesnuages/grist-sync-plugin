<script setup lang="ts">
import { ref, computed } from 'vue';
import type { FieldMapping } from '../../utils/mapping';
import type { GristConfig } from '../../config';
import { transformRecords, getValidMappings } from '../../utils/mapping';
import { GristClient } from '../../utils/grist';
import { analyzeError } from '../../utils/errorHandler';
import type { ErrorInfo } from '../../utils/errorHandler';

/**
 * Step 4: Bouton de synchronisation et log de statut
 */

interface Props {
  apiData: any[];
  mappings: FieldMapping[];
  gristConfig: GristConfig;
  isLoading: boolean;
}

interface Emits {
  (e: 'update:isLoading', value: boolean): void;
  (e: 'status', message: string, type: 'success' | 'error' | 'info'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const syncLogs = ref<Array<{ time: string; message: string; type: 'info' | 'success' | 'error' }>>([]);
const syncCompleted = ref(false);
const syncSuccess = ref(false);
const lastSyncError = ref<ErrorInfo | null>(null);

const recordCount = computed(() => props.apiData.length);
const validMappingsCount = computed(() => getValidMappings(props.mappings).length);

/**
 * Vérifie si la configuration Grist est complète et valide
 */
const isGristConfigValid = computed(() => {
  return (
    props.gristConfig.docId && 
    props.gristConfig.docId !== 'YOUR_DOC_ID' &&
    props.gristConfig.tableId && 
    props.gristConfig.tableId !== 'YOUR_TABLE_ID' &&
    props.gristConfig.gristApiUrl &&
    props.gristConfig.gristApiUrl !== ''
  );
});

/**
 * Vérifie si on peut lancer la synchronisation
 */
const canSync = computed(() => {
  return (
    isGristConfigValid.value &&
    props.apiData.length > 0 &&
    getValidMappings(props.mappings).length > 0
  );
});

/**
 * Ajoute un log
 */
function addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const time = new Date().toLocaleTimeString('fr-FR');
  syncLogs.value.push({ time, message, type });
}

/**
 * Synchronise les données vers Grist
 */
async function syncToGrist() {
  syncLogs.value = [];
  syncCompleted.value = false;
  syncSuccess.value = false;
  lastSyncError.value = null;
  
  addLog('🚀 Démarrage de la synchronisation...', 'info');
  
  if (props.apiData.length === 0) {
    addLog('❌ Aucune donnée à synchroniser', 'error');
    emit('status', '⚠️ Aucune donnée à synchroniser', 'error');
    return;
  }
  
  const validMappings = getValidMappings(props.mappings);
  
  if (validMappings.length === 0) {
    addLog('❌ Aucun mapping valide configuré', 'error');
    emit('status', '⚠️ Veuillez définir au moins un mapping valide', 'error');
    return;
  }
  
  addLog(`📊 ${props.apiData.length} enregistrement(s) à synchroniser`, 'info');
  addLog(`🔗 ${validMappings.length} mapping(s) configuré(s)`, 'info');
  
  emit('update:isLoading', true);
  
  try {
    // Transforme les données selon le mapping
    addLog('🔄 Transformation des données...', 'info');
    const transformedData = transformRecords(props.apiData, validMappings);
    
    if (transformedData.length === 0) {
      addLog('❌ Aucune donnée après transformation', 'error');
      emit('status', '⚠️ Aucune donnée après transformation', 'error');
      return;
    }
    
    addLog(`✓ ${transformedData.length} enregistrement(s) transformé(s)`, 'success');
    
    // Analyse des colonnes nécessaires
    const requiredColumns = new Set<string>();
    for (const record of transformedData) {
      for (const key of Object.keys(record)) {
        requiredColumns.add(key);
      }
    }
    addLog(`📋 ${requiredColumns.size} colonne(s) détectée(s): ${Array.from(requiredColumns).join(', ')}`, 'info');
    
    // Affiche le mode de synchronisation
    const syncMode = props.gristConfig.syncMode || 'upsert';
    const uniqueKeyField = props.gristConfig.uniqueKeyField || 'id';
    addLog(`🔧 Mode: ${syncMode}, Clé unique: ${uniqueKeyField}`, 'info');
    
    if (props.gristConfig.dryRun) {
      addLog('🔍 Mode simulation (dry-run) activé - Aucune modification ne sera appliquée', 'info');
    }
    
    // Insère/met à jour dans Grist selon le mode configuré
    addLog('📤 Synchronisation vers Grist...', 'info');
    
    if (props.gristConfig.autoCreateColumns !== false) {
      addLog('🔧 Vérification et création automatique des colonnes manquantes...', 'info');
    }
    
    const client = new GristClient(props.gristConfig, addLog);
    const result = await client.syncRecords(transformedData);
    
    if (props.gristConfig.dryRun) {
      addLog(`🔍 Simulation terminée:`, 'info');
      addLog(`  ➕ ${result.inserted} enregistrement(s) seraient insérés`, 'info');
      addLog(`  🔄 ${result.updated} enregistrement(s) seraient mis à jour`, 'info');
      addLog(`💡 Désactivez le mode dry-run pour appliquer les changements`, 'info');
    } else {
      addLog(`✅ Synchronisation réussie:`, 'success');
      addLog(`  ➕ ${result.inserted} enregistrement(s) insérés`, 'success');
      addLog(`  🔄 ${result.updated} enregistrement(s) mis à jour`, 'success');
    }
    
    addLog(`📋 Document Grist: ${props.gristConfig.docId}`, 'info');
    addLog(`📊 Table: ${props.gristConfig.tableId}`, 'info');
    
    syncCompleted.value = true;
    syncSuccess.value = true;
    
    if (props.gristConfig.dryRun) {
      emit('status', `🔍 Simulation: ${result.inserted} insertion(s), ${result.updated} mise(s) à jour`, 'info');
    } else {
      emit('status', `✅ ${result.inserted + result.updated} enregistrement(s) synchronisé(s)!`, 'success');
    }
  } catch (error) {
    // Analyse détaillée de l'erreur
    const errorInfo = analyzeError(error, 'grist_sync');
    lastSyncError.value = errorInfo;
    
    addLog(`❌ ${errorInfo.title}`, 'error');
    addLog(`📋 ${errorInfo.explanation}`, 'error');
    addLog(`💡 Solution: ${errorInfo.solutions[0]}`, 'error');
    
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    emit('status', `❌ Erreur lors de la synchronisation: ${message}`, 'error');
    syncCompleted.value = true;
    syncSuccess.value = false;
  } finally {
    emit('update:isLoading', false);
  }
}
</script>

<template>
  <div class="step-container">
    <div class="step-header">
      <h2 class="fr-h2">
        <span class="step-icon">🚀</span>
        Étape 4 : Synchronisation
      </h2>
      <p class="fr-text">
        Lancez la synchronisation de vos données vers Grist.
      </p>
    </div>

    <div class="step-content">
      <!-- Résumé de la synchronisation -->
      <div class="fr-mb-4w">
        <h3 class="fr-h6">📋 Résumé de la synchronisation</h3>
        <div class="summary-card">
          <div class="summary-item">
            <span class="summary-label">Enregistrements à synchroniser:</span>
            <DsfrBadge type="info">{{ recordCount }}</DsfrBadge>
          </div>
          <div class="summary-item">
            <span class="summary-label">Mappings configurés:</span>
            <DsfrBadge type="success">{{ validMappingsCount }}</DsfrBadge>
          </div>
          <div class="summary-item">
            <span class="summary-label">Document Grist:</span>
            <code class="fr-code">{{ gristConfig.docId }}</code>
          </div>
          <div class="summary-item">
            <span class="summary-label">Table Grist:</span>
            <code class="fr-code">{{ gristConfig.tableId }}</code>
          </div>
        </div>
      </div>

      <!-- Bouton de synchronisation -->
      <div class="fr-mb-4w" v-if="!syncCompleted">
        <DsfrButton
          label="Lancer la synchronisation"
          icon="ri-upload-cloud-line"
          size="lg"
          :loading="isLoading"
          :disabled="!canSync"
          @click="syncToGrist"
        />
        <div v-if="!canSync" class="fr-mt-2w">
          <DsfrCallout 
            type="warning"
            title="⚠️ Configuration incomplète"
          >
            <p class="fr-text--sm">
              Pour lancer la synchronisation, veuillez vous assurer que :
            </p>
            <ul class="fr-text--sm">
              <li v-if="!isGristConfigValid">✗ La configuration Grist est complète (Document ID, Table ID, URL API)</li>
              <li v-else>✓ Configuration Grist valide</li>
              <li v-if="recordCount === 0">✗ Des données API sont chargées</li>
              <li v-else>✓ {{ recordCount }} enregistrement(s) chargé(s)</li>
              <li v-if="validMappingsCount === 0">✗ Au moins un mapping est configuré</li>
              <li v-else>✓ {{ validMappingsCount }} mapping(s) configuré(s)</li>
            </ul>
          </DsfrCallout>
        </div>
      </div>

      <!-- Logs de synchronisation -->
      <div v-if="syncLogs.length > 0" class="fr-mb-4w">
        <h3 class="fr-h6">📝 Journal de synchronisation</h3>
        <div class="sync-logs">
          <div 
            v-for="(log, index) in syncLogs" 
            :key="index"
            class="log-entry"
            :class="`log-${log.type}`"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>

      <!-- Résultat de la synchronisation -->
      <div v-if="syncCompleted" class="fr-mb-4w">
        <DsfrAlert
          v-if="syncSuccess"
          type="success"
          title="Synchronisation réussie"
          description="Vos données ont été synchronisées avec succès vers Grist!"
        />
        <DsfrAlert
          v-else
          type="error"
          title="Échec de la synchronisation"
          description="Une erreur s'est produite lors de la synchronisation. Consultez le journal ci-dessus pour plus de détails."
        />
      </div>

      <!-- Detailed Error Display -->
      <div v-if="lastSyncError && !syncSuccess" class="fr-mb-4w">
        <DsfrAlert
          type="error"
          :title="lastSyncError.title"
          :description="lastSyncError.message"
        >
          <template #default>
            <div class="error-details">
              <p class="fr-text--sm"><strong>📋 Explication :</strong></p>
              <p class="fr-text--sm">{{ lastSyncError.explanation }}</p>
              
              <p class="fr-text--sm fr-mt-2w"><strong>💡 Solutions recommandées :</strong></p>
              <ul class="fr-text--sm">
                <li v-for="(solution, idx) in lastSyncError.solutions" :key="idx">{{ solution }}</li>
              </ul>
              
              <DsfrAccordion
                v-if="lastSyncError.technicalDetails"
                title="🔧 Détails techniques"
                :id="`technical-details-sync-${Date.now()}`"
                class="fr-mt-2w"
              >
                <pre class="fr-text--xs fr-mt-1w fr-code" style="overflow-x: auto;">{{ lastSyncError.technicalDetails }}</pre>
              </DsfrAccordion>
            </div>
          </template>
        </DsfrAlert>
      </div>

      <!-- Actions finales -->
      <div v-if="syncCompleted" class="fr-mb-4w">
        <DsfrCallout
          title="✅ Et maintenant ?"
          content="Vous pouvez consulter vos données dans votre document Grist, effectuer une nouvelle synchronisation, ou revenir au début pour synchroniser d'autres données."
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-container {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.step-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e5e5;
}

.step-icon {
  font-size: 1.5rem;
  margin-right: 0.5rem;
}

.summary-card {
  background: #f5f7fa;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e5e5;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-label {
  font-weight: 600;
  color: #333;
}

.sync-logs {
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 8px;
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.log-entry {
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  border-radius: 4px;
  display: flex;
  gap: 1rem;
}

.log-time {
  color: #858585;
  font-weight: bold;
  min-width: 80px;
}

.log-message {
  flex: 1;
}

.log-info {
  background: rgba(100, 150, 255, 0.1);
}

.log-success {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.log-error {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

@media (max-width: 768px) {
  .summary-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .sync-logs {
    font-size: 0.8em;
  }
}
</style>
