<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Step1ApiSource from './wizard/Step1ApiSource.vue';
import Step2DataMapping from './wizard/Step2DataMapping.vue';
import Step3GristConfig from './wizard/Step3GristConfig.vue';
import Step4Sync from './wizard/Step4Sync.vue';
import type { FieldMapping } from '../utils/mapping';
import type { GristConfig } from '../config';
import { defaultConfig } from '../config';
import { getValidMappings } from '../utils/mapping';

/**
 * Composant WizardStepper - Gestion du wizard multi-étapes
 * 
 * Orchestre les 4 étapes de synchronisation API vers Grist
 */

// État global du wizard
const currentStep = ref(1);
const totalSteps = 4;

// Debug mode - Active l'affichage des logs et du debug panel
const debugMode = ref(true); // Mettre à false pour désactiver en production

// Données partagées entre les étapes
const backendUrl = ref('');
const apiData = ref<any[]>([]);
const sampleRecord = ref<Record<string, any> | undefined>(undefined);
const mappings = ref<FieldMapping[]>([{ gristColumn: '', apiField: '' }]);
const gristConfig = ref<GristConfig>({ ...defaultConfig });

// État de chargement et messages
const isLoading = ref(false);
const statusMessage = ref('');
const statusType = ref<'success' | 'error' | 'info'>('info');

const steps = [
  { title: 'Récupération des données' },
  { title: 'Mapping des champs' },
  { title: 'Configuration Grist' },
  { title: 'Synchronisation' }
]

// Logs de debug
const debugLogs = ref<Array<{ timestamp: string; type: string; message: string; data?: any }>>([]);

/**
 * Ajoute un log de debug avec timestamp
 */
function addDebugLog(type: string, message: string, data?: any) {
  const timestamp = new Date().toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit'
  });
  
  debugLogs.value.push({ timestamp, type, message, data });
  
  // Log aussi dans la console pour faciliter le debug
  console.log(`[${timestamp}] [${type}] ${message}`, data || '');
  
  // Limite à 50 derniers logs pour éviter la surcharge mémoire
  if (debugLogs.value.length > 50) {
    debugLogs.value.shift();
  }
}

// Navigation
function goToStep(step: number) {
  if (step >= 1 && step <= totalSteps) {
    addDebugLog('NAVIGATION', `Navigation manuelle vers l'étape ${step} depuis l'étape ${currentStep.value}`);
    currentStep.value = step
  } else {
    addDebugLog('NAVIGATION', `Tentative de navigation invalide vers l'étape ${step}`, { currentStep: currentStep.value });
  }
}
/**
 * Navigation entre les étapes
 */
function nextStep() {
  addDebugLog('NAVIGATION', `Tentative d'avancer à l'étape suivante depuis l'étape ${currentStep.value}`, {
    canGoNext: canGoNext.value,
    currentStep: currentStep.value
  });
  
  if (currentStep.value < totalSteps) {
    // For steps 2 and 3, trigger validation and update data before moving to next step
    if (currentStep.value === 2) {
      // Step 2: Save mappings and move forward
      addDebugLog('VALIDATION', 'Validation de l\'étape 2 (Mapping)', {
        mappingsCount: mappings.value.length,
        validMappingsCount: getValidMappings(mappings.value).length
      });
      showStatus('✅ Mapping configuré avec succès', 'success');
    } else if (currentStep.value === 3) {
      // Step 3: Save grist config and move forward
      addDebugLog('VALIDATION', 'Validation de l\'étape 3 (Config Grist)', {
        docId: gristConfig.value.docId,
        tableId: gristConfig.value.tableId,
        hasApiToken: !!gristConfig.value.apiTokenGrist
      });
      showStatus('✅ Configuration Grist validée', 'success');
    }
    currentStep.value++;
    addDebugLog('NAVIGATION', `Navigation réussie vers l'étape ${currentStep.value}`);
  } else {
    addDebugLog('NAVIGATION', `Impossible d'avancer : déjà à la dernière étape`);
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    addDebugLog('NAVIGATION', `Retour à l'étape précédente depuis l'étape ${currentStep.value}`);
    currentStep.value--;
    addDebugLog('NAVIGATION', `Navigation retour réussie vers l'étape ${currentStep.value}`);
  } else {
    addDebugLog('NAVIGATION', `Impossible de revenir en arrière : déjà à la première étape`);
  }
}

/**
 * Vérifie si une étape est complétée
 */
const isStep1Complete = computed(() => {
  const complete = apiData.value.length > 0;
  return complete;
});

const isStep2Complete = computed(() => {
  const validMappings = getValidMappings(mappings.value);
  const complete = validMappings.length > 0;
  return complete;
});

const isStep3Complete = computed(() => {
  const complete = !!(
    gristConfig.value.docId && 
    gristConfig.value.docId !== 'YOUR_DOC_ID' &&
    gristConfig.value.tableId && 
    gristConfig.value.tableId !== 'YOUR_TABLE_ID'
  );
  return complete;
});

/**
 * Messages d'aide UX pour débloquer chaque étape
 */
const helpMessage = computed(() => {
  switch (currentStep.value) {
    case 1:
      if (!isStep1Complete.value) {
        return '💡 Pour continuer, récupérez les données depuis votre backend en cliquant sur le bouton "Récupérer les données"';
      }
      return '';
    case 2:
      if (!isStep2Complete.value) {
        return '💡 Pour continuer, configurez au moins un mapping entre un champ API et une colonne Grist';
      }
      return '';
    case 3:
      if (!isStep3Complete.value) {
        return '💡 Pour continuer, saisissez l\'URL de votre document Grist et votre clé API';
      }
      return '';
    case 4:
      return '🚀 Vous pouvez maintenant lancer la synchronisation !';
    default:
      return '';
  }
});

/**
 * Vérifie si on peut naviguer vers l'étape suivante
 */
const canGoNext = computed(() => {
  let canGo = false;
  switch (currentStep.value) {
    case 1:
      canGo = isStep1Complete.value;
      break;
    case 2:
      canGo = isStep2Complete.value;
      break;
    case 3:
      canGo = isStep3Complete.value;
      break;
    case 4:
      canGo = false; // Dernière étape
      break;
    default:
      canGo = false;
  }
  return canGo;
});

/**
 * Affiche un message de statut
 */
function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info') {
  addDebugLog('STATUS', `Affichage d'un message de statut: ${type}`, { message });
  statusMessage.value = message;
  statusType.value = type;
  setTimeout(() => {
    if (statusMessage.value === message) {
      statusMessage.value = '';
      addDebugLog('STATUS', 'Message de statut effacé automatiquement');
    }
  }, 5000);
}

// Callbacks pour les étapes
function handleStep1Complete(data: any[], url: string) {
  addDebugLog('EVENT', 'Événement @complete reçu de Step1ApiSource', {
    dataCount: data.length,
    url,
    sampleRecord: data.length > 0 ? Object.keys(data[0]) : []
  });
  
  backendUrl.value = url;
  apiData.value = data;
  sampleRecord.value = data.length > 0 ? data[0] : undefined;
  
  addDebugLog('STATE', 'État mis à jour après Step1', {
    backendUrl: backendUrl.value,
    apiDataCount: apiData.value.length,
    hasSampleRecord: !!sampleRecord.value,
    isStep1Complete: isStep1Complete.value
  });
  
  showStatus('✅ Données récupérées avec succès', 'success');
  nextStep();
}

// Watchers pour logger les changements d'état importants
watch(currentStep, (newStep, oldStep) => {
  addDebugLog('STATE', 'Changement d\'étape', { from: oldStep, to: newStep });
});

watch(apiData, (newData) => {
  addDebugLog('STATE', 'apiData modifié', {
    count: newData.length,
    isStep1Complete: isStep1Complete.value
  });
}, { deep: true });

watch(mappings, (newMappings) => {
  const validCount = getValidMappings(newMappings).length;
  addDebugLog('STATE', 'Mappings modifiés', {
    totalCount: newMappings.length,
    validCount,
    isStep2Complete: isStep2Complete.value
  });
}, { deep: true });

watch(gristConfig, (newConfig) => {
  addDebugLog('STATE', 'Config Grist modifiée', {
    docId: newConfig.docId,
    tableId: newConfig.tableId,
    hasApiToken: !!newConfig.apiTokenGrist,
    isStep3Complete: isStep3Complete.value
  });
}, { deep: true });

// Log initial au montage
addDebugLog('INIT', 'WizardStepper initialisé', {
  currentStep: currentStep.value,
  totalSteps,
  debugMode: debugMode.value
});
</script>

<template>
  <div class="wizard-container">
    <!-- En-tête du wizard -->
    <div class="fr-container fr-py-4w">
      <h1 class="fr-h1">🔄 Assistant de Synchronisation Grist</h1>
      <p class="fr-text--lead">
        Synchronisez facilement vos données API vers Grist en 4 étapes
      </p>
    </div>

    <!-- Indicateur de progression -->
    <div class="fr-container">
      <DsfrStepper
  :steps="steps"
  :current-step="currentStep"
  :onStepClick="goToStep"
  :total-steps="totalSteps"
/>
    </div>

    <!-- Message de statut global -->
    <div class="fr-container fr-mt-2w" v-if="statusMessage">
      <DsfrAlert
        :type="statusType"
        :title="statusType === 'success' ? 'Succès' : statusType === 'error' ? 'Erreur' : 'Info'"
        :description="statusMessage"
        :small="false"
      />
    </div>

    <!-- Message d'aide UX pour débloquer l'étape -->
    <div class="fr-container fr-mt-2w" v-if="helpMessage && !canGoNext">
      <DsfrAlert
        type="info"
        title="Aide"
        :description="helpMessage"
        :small="false"
      />
    </div>

    <!-- Debug Panel (visible en mode debug uniquement) -->
    <div v-if="debugMode" class="fr-container fr-mt-4w">
      <DsfrAccordion
        title="🔍 Debug Panel - État du Wizard"
        id="debug-panel"
      >
        <div class="debug-panel">
          <!-- État des variables clés -->
          <div class="debug-section">
            <h4 class="fr-h6">📊 État actuel</h4>
            <div class="debug-grid">
              <div class="debug-item">
                <strong>Étape courante:</strong>
                <DsfrBadge :type="currentStep === 1 ? 'info' : currentStep === 4 ? 'success' : 'warning'">
                  {{ currentStep }} / {{ totalSteps }}
                </DsfrBadge>
              </div>
              <div class="debug-item">
                <strong>Backend URL:</strong>
                <code>{{ backendUrl || '(vide)' }}</code>
              </div>
              <div class="debug-item">
                <strong>Données API:</strong>
                <DsfrBadge :type="apiData.length > 0 ? 'success' : 'error'">
                  {{ apiData.length }} enregistrement(s)
                </DsfrBadge>
              </div>
              <div class="debug-item">
                <strong>Mappings:</strong>
                <DsfrBadge :type="getValidMappings(mappings).length > 0 ? 'success' : 'error'">
                  {{ getValidMappings(mappings).length }} valide(s) / {{ mappings.length }} total
                </DsfrBadge>
              </div>
              <div class="debug-item">
                <strong>Config Grist - Doc ID:</strong>
                <code>{{ gristConfig.docId || '(vide)' }}</code>
              </div>
              <div class="debug-item">
                <strong>Config Grist - Table ID:</strong>
                <code>{{ gristConfig.tableId || '(vide)' }}</code>
              </div>
            </div>
          </div>

          <!-- État de validation des étapes -->
          <div class="debug-section fr-mt-3w">
            <h4 class="fr-h6">✅ Validation des étapes</h4>
            <div class="debug-grid">
              <div class="debug-item">
                <strong>Étape 1 complète:</strong>
                <DsfrBadge :type="isStep1Complete ? 'success' : 'error'">
                  {{ isStep1Complete ? 'OUI ✓' : 'NON ✗' }}
                </DsfrBadge>
              </div>
              <div class="debug-item">
                <strong>Étape 2 complète:</strong>
                <DsfrBadge :type="isStep2Complete ? 'success' : 'error'">
                  {{ isStep2Complete ? 'OUI ✓' : 'NON ✗' }}
                </DsfrBadge>
              </div>
              <div class="debug-item">
                <strong>Étape 3 complète:</strong>
                <DsfrBadge :type="isStep3Complete ? 'success' : 'error'">
                  {{ isStep3Complete ? 'OUI ✓' : 'NON ✗' }}
                </DsfrBadge>
              </div>
              <div class="debug-item">
                <strong>Peut avancer:</strong>
                <DsfrBadge :type="canGoNext ? 'success' : 'error'">
                  {{ canGoNext ? 'OUI ✓' : 'NON ✗' }}
                </DsfrBadge>
              </div>
            </div>
          </div>

          <!-- Logs de debug -->
          <div class="debug-section fr-mt-3w">
            <h4 class="fr-h6">📝 Logs de debug ({{ debugLogs.length }}/50)</h4>
            <div class="debug-logs">
              <div 
                v-for="(log, index) in debugLogs.slice().reverse()" 
                :key="index"
                :class="['debug-log-entry', `debug-log-${log.type.toLowerCase()}`]"
              >
                <span class="log-timestamp">{{ log.timestamp }}</span>
                <span class="log-type">{{ log.type }}</span>
                <span class="log-message">{{ log.message }}</span>
                <pre v-if="log.data" class="log-data">{{ JSON.stringify(log.data, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </DsfrAccordion>
    </div>

    <!-- Contenu des étapes -->
    <div class="fr-container fr-mt-4w wizard-content">
      <Transition name="fade" mode="out-in">
        <Step1ApiSource
          v-if="currentStep === 1"
          v-model:backendUrl="backendUrl"
          v-model:isLoading="isLoading"
          @complete="handleStep1Complete"
          @status="showStatus"
        />
        <Step2DataMapping
          v-else-if="currentStep === 2"
          :apiData="apiData"
          :sampleRecord="sampleRecord"
          v-model:mappings="mappings"
        />
        <Step3GristConfig
          v-else-if="currentStep === 3"
          v-model:config="gristConfig"
          v-model:isLoading="isLoading"
          @status="showStatus"
        />
        <Step4Sync
          v-else-if="currentStep === 4"
          :apiData="apiData"
          :mappings="mappings"
          :gristConfig="gristConfig"
          v-model:isLoading="isLoading"
          @status="showStatus"
        />
      </Transition>
    </div>

    <!-- Navigation -->
    <div class="fr-container fr-mt-4w fr-pb-6w">
      <div class="wizard-navigation">
        <DsfrButton
          v-if="currentStep > 1"
          @click="previousStep"
          label="Retour"
          secondary
          icon="ri-arrow-left-line"
          :disabled="isLoading"
        />
        <div class="spacer"></div>
        <DsfrButton
          v-if="currentStep < 4"
          @click="nextStep"
          :disabled="!canGoNext"
          label="Suivant"
          icon="ri-arrow-right-line"
          icon-right
        />
        <DsfrButton
          v-if="currentStep === 4"
          @click="goToStep(1)"
          label="Nouvelle synchronisation"
          icon="ri-restart-line"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Container principal avec fond DSFR */
.wizard-container {
  min-height: 100vh;
  background: var(--background-default-grey);
}

/* Contenu des étapes avec styles DSFR */
.wizard-content {
  background: var(--background-default-grey-hover);
  border-radius: 0.5rem;
  padding: 2rem;
  box-shadow: var(--raised-shadow);
  min-height: 400px;
}

/* Navigation entre les étapes */
.wizard-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.spacer {
  flex: 1;
}

/* Styles pour le stepper DSFR personnalisé */
.fr-stepper__steps {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
  position: relative;
}

.fr-stepper__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  z-index: 1;
}

/* Numéro de l'étape avec couleurs DSFR officielles */
.fr-stepper__step-number {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--background-disabled-grey);
  color: var(--text-disabled-grey);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  margin-bottom: 0.5rem;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

/* Étape active - Bleu France */
.fr-stepper__step--active .fr-stepper__step-number {
  background: var(--background-action-high-blue-france);
  color: var(--text-inverted-blue-france);
  transform: scale(1.1);
  border-color: var(--border-action-high-blue-france);
}

/* Étape complétée - Vert succès */
.fr-stepper__step--complete .fr-stepper__step-number {
  background: var(--background-flat-success);
  color: var(--text-inverted-green-tilleul-verveine);
  border-color: var(--border-plain-success);
}

.fr-stepper__step--complete .fr-stepper__step-number::before {
  content: '✓';
}

/* Titre de l'étape avec typographie DSFR */
.fr-stepper__step-title {
  font-size: 0.875rem;
  text-align: center;
  color: var(--text-mention-grey);
  line-height: 1.5;
}

.fr-stepper__step--active .fr-stepper__step-title {
  color: var(--text-action-high-blue-france);
  font-weight: 700;
}

.fr-stepper__step--complete .fr-stepper__step-title {
  color: var(--text-default-success);
}

/* Étape cliquable - amélioration de l'accessibilité */
.fr-stepper__step:hover:not(.fr-stepper__step--active) {
  cursor: pointer;
}

.fr-stepper__step:focus-visible {
  outline: 2px solid var(--border-plain-blue-france);
  outline-offset: 2px;
  border-radius: 0.5rem;
}

/* Animations de transition DSFR */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(1.875rem);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(-1.875rem);
}

/* Responsive - Breakpoints DSFR */
@media (max-width: 48rem) {
  .wizard-content {
    padding: 1rem;
    border-radius: 0.25rem;
  }
  
  .fr-stepper__step-title {
    font-size: 0.75rem;
  }
  
  .fr-stepper__step-number {
    width: 2rem;
    height: 2rem;
    font-size: 0.875rem;
  }
}

/* Styles du Debug Panel */
.debug-panel {
  background: var(--background-contrast-grey);
  padding: 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.debug-section {
  padding: 1rem;
  background: var(--background-default-grey);
  border-radius: 0.25rem;
  margin-bottom: 1rem;
}

.debug-section:last-child {
  margin-bottom: 0;
}

.debug-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 0.5rem;
}

.debug-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.debug-item strong {
  color: var(--text-mention-grey);
  font-size: 0.75rem;
  text-transform: uppercase;
}

.debug-item code {
  background: var(--background-contrast-grey);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  word-break: break-all;
}

.debug-logs {
  max-height: 400px;
  overflow-y: auto;
  background: var(--background-default-grey);
  padding: 0.5rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.75rem;
}

.debug-log-entry {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-left: 3px solid var(--border-default-grey);
  background: white;
  border-radius: 0.25rem;
}

.debug-log-entry:last-child {
  margin-bottom: 0;
}

.debug-log-init {
  border-left-color: var(--border-plain-info);
  background: var(--background-contrast-info);
}

.debug-log-navigation {
  border-left-color: var(--border-plain-blue-france);
  background: var(--background-contrast-blue-france);
}

.debug-log-event {
  border-left-color: var(--border-plain-success);
  background: var(--background-contrast-success);
}

.debug-log-state {
  border-left-color: var(--border-plain-warning);
  background: var(--background-contrast-warning);
}

.debug-log-validation {
  border-left-color: var(--border-action-high-blue-france);
  background: var(--background-alt-blue-france);
}

.debug-log-status {
  border-left-color: var(--border-default-info);
  background: var(--background-alt-blue-ecume);
}

.log-timestamp {
  color: var(--text-mention-grey);
  margin-right: 0.5rem;
  font-weight: bold;
}

.log-type {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: var(--background-contrast-grey);
  border-radius: 0.25rem;
  margin-right: 0.5rem;
  font-weight: bold;
  font-size: 0.7rem;
}

.log-message {
  color: var(--text-default-grey);
}

.log-data {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--background-contrast-grey);
  border-radius: 0.25rem;
  font-size: 0.7rem;
  overflow-x: auto;
  color: var(--text-default-grey);
}

</style>
