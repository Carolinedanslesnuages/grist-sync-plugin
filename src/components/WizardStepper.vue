<script setup lang="ts">
import { ref, computed } from 'vue';
import Step1ApiSource from './wizard/Step1ApiSource.vue';
import Step2DataMapping from './wizard/Step2DataMapping.vue';
import Step3GristConfig from './wizard/Step3GristConfig.vue';
import Step4Sync from './wizard/Step4Sync.vue';
import type { FieldMapping } from '../utils/mapping';
import type { GristConfig } from '../config';
import { defaultConfig } from '../config';

/**
 * Composant WizardStepper - Gestion du wizard multi-étapes
 * 
 * Orchestre les 4 étapes de synchronisation API vers Grist
 */

// État global du wizard
const currentStep = ref(1);
const totalSteps = 4;

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

/**
 * Navigation entre les étapes
 */
function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++;
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

function goToStep(step: number) {
  if (step >= 1 && step <= totalSteps) {
    currentStep.value = step;
  }
}

/**
 * Vérifie si une étape est complétée
 */
const isStep1Complete = computed(() => apiData.value.length > 0);
const isStep2Complete = computed(() => mappings.value.some(m => m.gristColumn && m.apiField));
const isStep3Complete = computed(() => 
  gristConfig.value.docId && 
  gristConfig.value.docId !== 'YOUR_DOC_ID' &&
  gristConfig.value.tableId && 
  gristConfig.value.tableId !== 'YOUR_TABLE_ID'
);

/**
 * Vérifie si on peut naviguer vers l'étape suivante
 */
const canGoNext = computed(() => {
  switch (currentStep.value) {
    case 1:
      return isStep1Complete.value;
    case 2:
      return isStep2Complete.value;
    case 3:
      return isStep3Complete.value;
    case 4:
      return false; // Dernière étape
    default:
      return false;
  }
});

/**
 * Affiche un message de statut
 */
function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info') {
  statusMessage.value = message;
  statusType.value = type;
  setTimeout(() => {
    if (statusMessage.value === message) {
      statusMessage.value = '';
    }
  }, 5000);
}

// Callbacks pour les étapes
function handleStep1Complete(data: any[], url: string) {
  backendUrl.value = url;
  apiData.value = data;
  sampleRecord.value = data.length > 0 ? data[0] : undefined;
  showStatus('✅ Données récupérées avec succès', 'success');
  nextStep();
}

function handleStep2Complete(newMappings: FieldMapping[]) {
  mappings.value = newMappings;
  showStatus('✅ Mapping configuré avec succès', 'success');
  nextStep();
}

function handleStep3Complete(config: GristConfig) {
  gristConfig.value = config;
  showStatus('✅ Configuration Grist validée', 'success');
  nextStep();
}
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
      <nav class="fr-stepper" role="navigation" aria-label="Étapes">
        <h2 class="fr-stepper__title">
          Étape {{ currentStep }} sur {{ totalSteps }}
        </h2>
        <div class="fr-stepper__steps" :data-fr-current-step="currentStep" :data-fr-steps="totalSteps">
          <div 
            v-for="step in totalSteps" 
            :key="step"
            class="fr-stepper__step"
            :class="{
              'fr-stepper__step--active': step === currentStep,
              'fr-stepper__step--complete': step < currentStep
            }"
            @click="step < currentStep ? goToStep(step) : null"
            :style="{ cursor: step < currentStep ? 'pointer' : 'default' }"
          >
            <span class="fr-stepper__step-number">{{ step }}</span>
            <span class="fr-stepper__step-title">
              <template v-if="step === 1">Récupération des données</template>
              <template v-else-if="step === 2">Mapping des champs</template>
              <template v-else-if="step === 3">Configuration Grist</template>
              <template v-else-if="step === 4">Synchronisation</template>
            </span>
          </div>
        </div>
      </nav>
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
          @complete="handleStep2Complete"
          @back="previousStep"
        />
        <Step3GristConfig
          v-else-if="currentStep === 3"
          v-model:config="gristConfig"
          v-model:isLoading="isLoading"
          @complete="handleStep3Complete"
          @back="previousStep"
          @status="showStatus"
        />
        <Step4Sync
          v-else-if="currentStep === 4"
          :apiData="apiData"
          :mappings="mappings"
          :gristConfig="gristConfig"
          v-model:isLoading="isLoading"
          @back="previousStep"
          @status="showStatus"
          @restart="goToStep(1)"
        />
      </Transition>
    </div>

    <!-- Navigation -->
    <div class="fr-container fr-mt-4w fr-pb-6w">
      <div class="wizard-navigation">
        <DsfrButton
          v-if="currentStep > 1 && currentStep < 4"
          @click="previousStep"
          label="Retour"
          secondary
          icon="ri-arrow-left-line"
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
      </div>
    </div>
  </div>
</template>

<style scoped>
.wizard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.wizard-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-height: 400px;
}

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

.fr-stepper__step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e5e5;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 0.5rem;
  transition: all 0.3s ease;
}

.fr-stepper__step--active .fr-stepper__step-number {
  background: #000091;
  color: white;
  transform: scale(1.1);
}

.fr-stepper__step--complete .fr-stepper__step-number {
  background: #18753c;
  color: white;
}

.fr-stepper__step--complete .fr-stepper__step-number::before {
  content: '✓';
}

.fr-stepper__step-title {
  font-size: 0.875rem;
  text-align: center;
  color: #666;
}

.fr-stepper__step--active .fr-stepper__step-title {
  color: #000091;
  font-weight: bold;
}

.fr-stepper__step--complete .fr-stepper__step-title {
  color: #18753c;
}

/* Animations de transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Responsive */
@media (max-width: 768px) {
  .wizard-content {
    padding: 1rem;
  }
  
  .fr-stepper__step-title {
    font-size: 0.75rem;
  }
  
  .fr-stepper__step-number {
    width: 32px;
    height: 32px;
    font-size: 0.875rem;
  }
}
</style>
