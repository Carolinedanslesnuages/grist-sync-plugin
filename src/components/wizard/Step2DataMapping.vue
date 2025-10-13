<script setup lang="ts">
import { computed } from 'vue';
import MappingTable from '../MappingTable.vue';
import type { FieldMapping } from '../../utils/mapping';
import { getValidMappings } from '../../utils/mapping';

/**
 * Step 2: Aperçu, sélection et mapping dynamique des champs
 */

interface Props {
  apiData: any[];
  sampleRecord?: Record<string, any>;
  mappings: FieldMapping[];
}

interface Emits {
  (e: 'update:mappings', value: FieldMapping[]): void;
  (e: 'complete', mappings: FieldMapping[]): void;
  (e: 'back'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const recordCount = computed(() => props.apiData.length);
const validMappingsCount = computed(() => getValidMappings(props.mappings).length);

function handleMappingUpdate(newMappings: FieldMapping[]) {
  emit('update:mappings', newMappings);
}

function validateAndContinue() {
  if (validMappingsCount.value === 0) {
    return;
  }
  emit('complete', props.mappings);
}
</script>

<template>
  <div class="step-container">
    <div class="step-header">
      <h2 class="fr-h2">
        <span class="step-icon">🗂️</span>
        Étape 2 : Mapping des données
      </h2>
      <p class="fr-text">
        Visualisez vos données et configurez la correspondance entre les champs API et les colonnes Grist.
      </p>
    </div>

    <div class="step-content">
      <!-- Aperçu des données -->
      <div class="fr-mb-4w">
        <DsfrNotice
          title="Données récupérées avec succès"
          :closeable="false"
        >
          {{ recordCount }} enregistrement(s) disponible(s) pour la synchronisation
        </DsfrNotice>
      </div>

      <!-- Exemple de données (premier enregistrement) -->
      <div v-if="sampleRecord" class="fr-mb-4w">
        <h3 class="fr-h6">📋 Aperçu des données (premier enregistrement)</h3>
        <div class="data-preview">
          <div class="fr-table fr-table--bordered fr-table--no-caption">
            <table>
              <thead>
                <tr>
                  <th scope="col">Champ API</th>
                  <th scope="col">Valeur exemple</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(value, key) in sampleRecord" :key="String(key)">
                  <td class="field-name">{{ key }}</td>
                  <td class="field-value">
                    {{ typeof value === 'object' ? JSON.stringify(value, null, 2) : value }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Table de mapping -->
      <div class="fr-mb-4w">
        <h3 class="fr-h6">🔗 Configuration du mapping</h3>
        <MappingTable 
          :model-value="mappings" 
          @update:model-value="handleMappingUpdate"
          :sample-data="sampleRecord" 
        />
        
        <div class="fr-mt-2w">
          <DsfrBadge 
            v-if="validMappingsCount > 0" 
            type="success"
            label="Mappings valides"
          >
            {{ validMappingsCount }} mapping(s) valide(s) configuré(s)
          </DsfrBadge>
          <DsfrBadge 
            v-else
            type="warning"
            label="Attention"
          >
            Aucun mapping configuré
          </DsfrBadge>
        </div>
      </div>

      <!-- Conseils -->
      <div class="fr-mt-4w">
        <DsfrCallout
          title="💡 Conseil"
          content="Définissez au moins un mapping pour continuer. Pour les champs imbriqués, utilisez la notation pointée (ex: user.profile.name)."
        />
      </div>

      <!-- Actions -->
      <div class="step-actions fr-mt-4w">
        <DsfrButton
          label="Retour"
          secondary
          icon="ri-arrow-left-line"
          @click="emit('back')"
        />
        <DsfrButton
          label="Continuer"
          icon="ri-arrow-right-line"
          icon-right
          :disabled="validMappingsCount === 0"
          @click="validateAndContinue"
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

.data-preview {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
}

.field-name {
  font-weight: bold;
  background: #f5f5f5;
}

.field-value {
  font-family: monospace;
  font-size: 0.9em;
  max-width: 400px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e5e5;
}

@media (max-width: 768px) {
  .step-actions {
    flex-direction: column;
  }
  
  .data-preview {
    font-size: 0.85em;
  }
}
</style>
