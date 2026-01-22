<script setup lang="ts">
import { ref } from 'vue';
import WizardStepper from './components/WizardStepper.vue';
import GristToApi from './components/GristToApi.vue';

const activeTab = ref<'api-to-grist' | 'grist-to-api'>('api-to-grist');
</script>

<template>
  <div class="app-container">
    <div class="fr-container fr-mb-4w">
      <h1 class="fr-h3 fr-mt-4w">Grist Sync Plugin</h1>
      <p class="fr-text">Synchronisez vos données entre Grist et vos APIs</p>
      
      <!-- Simple button group for tab navigation -->
      <div class="fr-btns-group fr-btns-group--inline fr-mb-4w">
        <DsfrButton
          :label="'API → Grist'"
          :primary="activeTab === 'api-to-grist'"
          :secondary="activeTab !== 'api-to-grist'"
          @click="activeTab = 'api-to-grist'"
          icon="ri-download-cloud-line"
        />
        <DsfrButton
          :label="'Grist → API'"
          :primary="activeTab === 'grist-to-api'"
          :secondary="activeTab !== 'grist-to-api'"
          @click="activeTab = 'grist-to-api'"
          icon="ri-upload-cloud-line"
        />
      </div>
      
      <!-- Conditional rendering of components -->
      <WizardStepper v-if="activeTab === 'api-to-grist'" />
      <GristToApi v-else-if="activeTab === 'grist-to-api'" />
    </div>
  </div>
</template>
