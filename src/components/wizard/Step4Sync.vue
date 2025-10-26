<script setup lang="ts">
import { ref, computed } from 'vue';
import type { FieldMapping } from '../../utils/mapping';
import type { GristConfig } from '../../config';
import { transformRecords, getValidMappings } from '../../utils/mapping';
import { GristClient, type DryRunResult } from '../../utils/grist';
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
const dryRunResult = ref<DryRunResult | null>(null);
const showDryRunDetails = ref(false);
const componentId = ref(`sync-${Math.random().toString(36).substring(2, 9)}`);

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
 * Exécute un dry-run pour prévisualiser les changements
 */
async function runDryRun() {
  syncLogs.value = [];
  dryRunResult.value = null;
  showDryRunDetails.value = false;
  lastSyncError.value = null;
  
  addLog('🔍 Démarrage du dry-run (simulation)...', 'info');
  
  if (props.apiData.length === 0) {
    addLog('❌ Aucune donnée à analyser', 'error');
    emit('status', '⚠️ Aucune donnée à analyser', 'error');
    return;
  }
  
  const validMappings = getValidMappings(props.mappings);
  
  if (validMappings.length === 0) {
    addLog('❌ Aucun mapping valide configuré', 'error');
    emit('status', '⚠️ Veuillez définir au moins un mapping valide', 'error');
    return;
  }
  
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
    
    // Exécute le dry-run
    addLog('📊 Analyse des changements...', 'info');
    
    const client = new GristClient(props.gristConfig, addLog);
    const result = await client.syncRecords(transformedData, { dryRun: true });
    
    if ('toAdd' in result) {
      dryRunResult.value = result;
      showDryRunDetails.value = true;
      
      addLog(`📊 Résultat du dry-run:`, 'success');
      addLog(`  ➕ ${result.summary.recordsToAdd} enregistrement(s) à ajouter`, 'info');
      addLog(`  🔄 ${result.summary.recordsToUpdate} enregistrement(s) à mettre à jour`, 'info');
      addLog(`  ✓ ${result.summary.recordsUnchanged} enregistrement(s) inchangé(s)`, 'info');
      
      emit('status', `✅ Dry-run terminé: ${result.summary.recordsToAdd} à ajouter, ${result.summary.recordsToUpdate} à mettre à jour`, 'success');
    }
  } catch (error) {
    const errorInfo = analyzeError(error, 'grist_sync');
    lastSyncError.value = errorInfo;
    
    addLog(`❌ ${errorInfo.title}`, 'error');
    addLog(`📋 ${errorInfo.explanation}`, 'error');
    addLog(`💡 Solution: ${errorInfo.solutions[0]}`, 'error');
    
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    emit('status', `❌ Erreur lors du dry-run: ${message}`, 'error');
  } finally {
    emit('update:isLoading', false);
  }
}

/**
 * Synchronise les données vers Grist
 */
async function syncToGrist() {
  syncLogs.value = [];
  syncCompleted.value = false;
  syncSuccess.value = false;
  lastSyncError.value = null;
  dryRunResult.value = null;
  showDryRunDetails.value = false;
  
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
  addLog(`⚙️ Mode: ${props.gristConfig.syncMode || 'add'}`, 'info');
  
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
    
    // Synchronise avec Grist
    addLog('📤 Synchronisation vers Grist...', 'info');
    
    const client = new GristClient(props.gristConfig, addLog);
    const result = await client.syncRecords(transformedData);
    
    if ('added' in result) {
      // Affiche les résultats détaillés
      result.details.forEach(detail => {
        addLog(`✓ ${detail}`, 'success');
      });
      
      const totalChanges = result.added + result.updated;
      addLog(`✅ Synchronisation terminée: ${totalChanges} enregistrement(s) affecté(s)`, 'success');
      addLog(`📋 Document Grist: ${props.gristConfig.docId}`, 'info');
      addLog(`📊 Table: ${props.gristConfig.tableId}`, 'info');
      
      syncCompleted.value = true;
      syncSuccess.value = true;
      emit('status', `✅ Synchronisation réussie: ${result.added} ajouté(s), ${result.updated} mis à jour`, 'success');
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
        <div class="button-group">
          <DsfrButton
            label="Simulation (Dry-run)"
            icon="ri-eye-line"
            :loading="isLoading"
            :disabled="!canSync"
            secondary
            @click="runDryRun"
          />
          <DsfrButton
            label="Lancer la synchronisation"
            icon="ri-upload-cloud-line"
            size="lg"
            :loading="isLoading"
            :disabled="!canSync"
            @click="syncToGrist"
          />
        </div>
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

      <!-- Résultats du dry-run -->
      <div v-if="dryRunResult && showDryRunDetails" class="fr-mb-4w">
        <DsfrAlert
          type="info"
          title="📊 Résultats de la simulation (Dry-run)"
          description="Voici ce qui se passerait si vous lanciez la synchronisation maintenant"
        >
          <template #default>
            <div class="dry-run-summary">
              <div class="summary-stats">
                <DsfrBadge type="new" class="fr-mr-2w">
                  ➕ {{ dryRunResult.summary.recordsToAdd }} à ajouter
                </DsfrBadge>
                <DsfrBadge type="warning" class="fr-mr-2w">
                  🔄 {{ dryRunResult.summary.recordsToUpdate }} à mettre à jour
                </DsfrBadge>
                <DsfrBadge type="success">
                  ✓ {{ dryRunResult.summary.recordsUnchanged }} inchangé(s)
                </DsfrBadge>
              </div>

              <!-- Détails des enregistrements à ajouter -->
              <div v-if="dryRunResult.toAdd.length > 0" class="fr-mt-2w">
                <DsfrAccordion
                  title="➕ Enregistrements à ajouter"
                  :id="`${componentId}-add`"
                >
                  <div class="records-list">
                    <div v-for="(record, idx) in dryRunResult.toAdd.slice(0, 5)" :key="idx" class="record-item">
                      <pre class="fr-code fr-text--xs">{{ JSON.stringify(record, null, 2) }}</pre>
                    </div>
                    <p v-if="dryRunResult.toAdd.length > 5" class="fr-text--xs fr-mt-1w">
                      ... et {{ dryRunResult.toAdd.length - 5 }} autre(s) enregistrement(s)
                    </p>
                  </div>
                </DsfrAccordion>
              </div>

              <!-- Détails des enregistrements à mettre à jour -->
              <div v-if="dryRunResult.toUpdate.length > 0" class="fr-mt-2w">
                <DsfrAccordion
                  title="🔄 Enregistrements à mettre à jour"
                  :id="`${componentId}-update`"
                >
                  <div class="records-list">
                    <div v-for="(record, idx) in dryRunResult.toUpdate.slice(0, 5)" :key="idx" class="record-item">
                      <p class="fr-text--sm"><strong>ID Grist: {{ record.id }}</strong></p>
                      <pre class="fr-code fr-text--xs">{{ JSON.stringify(record.fields, null, 2) }}</pre>
                      <div v-if="record.changes" class="fr-mt-1w">
                        <p class="fr-text--xs"><em>Changements détectés:</em></p>
                        <ul class="fr-text--xs">
                          <li v-for="(change, key) in record.changes" :key="key">
                            <strong>{{ key }}:</strong> "{{ change.old }}" → "{{ change.new }}"
                          </li>
                        </ul>
                      </div>
                    </div>
                    <p v-if="dryRunResult.toUpdate.length > 5" class="fr-text--xs fr-mt-1w">
                      ... et {{ dryRunResult.toUpdate.length - 5 }} autre(s) enregistrement(s)
                    </p>
                  </div>
                </DsfrAccordion>
              </div>
            </div>
          </template>
        </DsfrAlert>
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

.button-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.dry-run-summary {
  margin-top: 1rem;
}

.summary-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.records-list {
  max-height: 400px;
  overflow-y: auto;
}

.record-item {
  background: #f5f7fa;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.record-item pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
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

  .button-group {
    flex-direction: column;
  }

  .button-group button {
    width: 100%;
  }
}
</style>
