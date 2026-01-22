<script setup lang="ts">
import { ref, computed } from 'vue';
import WizardStepper from './components/WizardStepper.vue';
import GristToApi from './components/GristToApi.vue';

const activeTab = ref<'api-to-grist' | 'grist-to-api'>('api-to-grist');
const selectedTabIndex = computed({
  get: () => activeTab.value === 'api-to-grist' ? 0 : 1,
  set: (index: number) => {
    activeTab.value = index === 0 ? 'api-to-grist' : 'grist-to-api';
  }
});
</script>

<template>
  <div class="app-container">
    <div class="fr-container fr-mb-4w">
      <h1 class="fr-h3 fr-mt-4w">Grist Sync Plugin</h1>
      <p class="fr-text">Synchronisez vos données entre Grist et vos APIs</p>
      
      <DsfrTabs
        :tab-list-name="'sync-direction'"
        :tab-titles="['API → Grist', 'Grist → API']"
        v-model:selected-tab-index="selectedTabIndex"
      >
        <template #tab-content-0>
          <WizardStepper />
        </template>
        <template #tab-content-1>
          <GristToApi />
        </template>
      </DsfrTabs>
    </div>
  </div>
</template>
