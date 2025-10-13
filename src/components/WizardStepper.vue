<script setup lang="ts">
import { ref, computed } from 'vue'
import Step1ApiSource from './wizard/Step1ApiSource.vue'
import Step2DataMapping from './wizard/Step2DataMapping.vue'
import Step3GristConfig from './wizard/Step3GristConfig.vue'
import Step4Sync from './wizard/Step4Sync.vue'
import type { FieldMapping } from '../utils/mapping'
import type { GristConfig } from '../config'
import { defaultConfig } from '../config'

const steps = [
  'Récupération des données',
  'Mapping des champs',
  'Configuration Grist',
  'Synchronisation',
]
const totalSteps = steps.length
const currentStep = ref(1)

// Données partagées entre les étapes
const backendUrl = ref('')
const apiData = ref<any[]>([])
const sampleRecord = ref<Record<string, any> | undefined>(undefined)
const mappings = ref<FieldMapping[]>([{ gristColumn: '', apiField: '' }])
const gristConfig = ref<GristConfig>({ ...defaultConfig })

const isLoading = ref(false)
const statusMessage = ref('')
const statusType = ref<'success' | 'error' | 'info'>('info')

const isStep1Complete = computed(() => apiData.value.length > 0)
const isStep2Complete = computed(() => mappings.value.some(m => m.gristColumn && m.apiField))
const isStep3Complete = computed(() =>
  gristConfig.value.docId &&
  gristConfig.value.docId !== 'YOUR_DOC_ID' &&
  gristConfig.value.tableId &&
  gristConfig.value.tableId !== 'YOUR_TABLE_ID'
)

const canGoNext = computed(() => {
  switch (currentStep.value) {
    case 1:
      return isStep1Complete.value
    case 2:
      return isStep2Complete.value
    case 3:
      return isStep3Complete.value
    case 4:
      return false // Dernière étape
    default:
      return false
  }
})

const isFirstStep = computed(() => currentStep.value === 1)
const isLastStep = computed(() => currentStep.value === totalSteps)

function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info') {
  statusMessage.value = message
  statusType.value = type
  setTimeout(() => {
    if (statusMessage.value === message) {
      statusMessage.value = ''
    }
  }, 5000)
}

function handleStep1Complete(data: any[], url: string) {
  backendUrl.value = url
  apiData.value = data
  sampleRecord.value = data.length > 0 ? data[0] : undefined
  showStatus('✅ Données récupérées avec succès', 'success')
  goToStep('next')
}

function goToStep(direction: 'next' | 'prev') {
  if (isLoading.value) return
  // Efface le message de statut à chaque navigation
  statusMessage.value = ''
  if (direction === 'next' && currentStep.value < totalSteps) {
    if (!canGoNext.value) return
    // Message custom par étape
    if (currentStep.value === 2) showStatus('✅ Mapping configuré avec succès', 'success')
    else if (currentStep.value === 3) showStatus('✅ Configuration Grist validée', 'success')
    currentStep.value++
  } else if (direction === 'prev' && currentStep.value > 1) {
    currentStep.value--
  }
}

function restartWizard() {
  currentStep.value = 1
  backendUrl.value = ''
  apiData.value = []
  sampleRecord.value = undefined
  mappings.value = [{ gristColumn: '', apiField: '' }]
  gristConfig.value = { ...defaultConfig }
  statusMessage.value = ''
  statusType.value = 'info'
}
</script>

<template>
  <div class="wizard-container">
    <div class="fr-container fr-py-4w">
      <h1 class="fr-h1">🔄 Assistant de Synchronisation Grist</h1>
      <p class="fr-text--lead">
        Synchronisez facilement vos données API vers Grist en 4 étapes
      </p>
    </div>

    <!-- Stepper DSFR natif -->
    <div class="fr-container">
      <DsfrStepper
        :steps="steps"
        :current-step="currentStep"
      />
    </div>

    <div class="fr-container fr-mt-2w" v-if="statusMessage">
      <DsfrAlert
        :type="statusType"
        :title="statusType === 'success' ? 'Succès' : statusType === 'error' ? 'Erreur' : 'Info'"
        :description="statusMessage"
        :small="false"
      />
    </div>

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
      <div class="wizard-navigation flex gap-2">
        <DsfrButton
          type="button"
          label="Retour"
          icon="ri-arrow-left-line"
          :disabled="isLoading || isFirstStep"
          @click="goToStep('prev')"
        />
        <DsfrButton
          v-if="!isLastStep"
          type="button"
          label="Suivant"
          icon="ri-arrow-right-line"
          icon-right
          :disabled="!canGoNext"
          @click="goToStep('next')"
        />
        <DsfrButton
          v-if="isLastStep"
          type="button"
          label="Nouvelle synchronisation"
          icon="ri-restart-line"
          @click="restartWizard"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.wizard-container {
  min-height: 100vh;
  background: var(--background-default-grey);
}
.wizard-content {
  background: var(--background-default-grey-hover);
  border-radius: 0.5rem;
  padding: 2rem;
  box-shadow: var(--raised-shadow);
  min-height: 400px;
}
.wizard-navigation {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
}
@media (max-width: 48rem) {
  .wizard-content {
    padding: 1rem;
    border-radius: 0.25rem;
  }
}
</style>