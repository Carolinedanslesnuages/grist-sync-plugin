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
    // For steps 2 and 3, trigger validation and update data before moving to next step
    if (currentStep.value === 2) {
      // Step 2: Save mappings and move forward
      showStatus('✅ Mapping configuré avec succès', 'success');
    } else if (currentStep.value === 3) {
      // Step 3: Save grist config and move forward
      showStatus('✅ Configuration Grist validée', 'success');
    }
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
</style>
