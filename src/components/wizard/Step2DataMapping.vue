<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import MappingTable from '../MappingTable.vue';
import type { FieldMapping } from '../../utils/mapping';
import { getValidMappings } from '../../utils/mapping';
import type { GristConfig } from '../../config';
import { GristClient } from '../../utils/grist';

/**
 * Step 2: Aperçu, sélection et mapping dynamique des champs
 */

interface Props {
  apiData: any[];
  sampleRecord?: Record<string, any>;
  mappings: FieldMapping[];
  gristConfig?: GristConfig;
}

interface Emits {
  (e: 'update:mappings', value: FieldMapping[]): void;
  (e: 'status', message: string, type: 'success' | 'error' | 'info'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const recordCount = computed(() => props.apiData.length);
const validMappingsCount = computed(() => getValidMappings(props.mappings).length);
const existingGristColumns = ref<string[]>([]);
const isLoadingColumns = ref(false);

function handleMappingUpdate(newMappings: FieldMapping[]) {
  emit('update:mappings', newMappings);
}

/**
 * Récupère les colonnes existantes dans Grist
 */
async function fetchExistingColumns() {
  // Ne charge que si on a une config Grist valide
  if (!props.gristConfig?.docId || !props.gristConfig?.tableId || !props.gristConfig?.gristApiUrl) {
    return;
  }
  
  isLoadingColumns.value = true;
  
  try {
    const client = new GristClient(props.gristConfig);
    const columns = await client.getColumns();
    existingGristColumns.value = columns.map(col => col.fields.colId);
    
    if (existingGristColumns.value.length > 0) {
      emit('status', `✓ ${existingGristColumns.value.length} colonne(s) existante(s) trouvée(s) dans Grist`, 'success');
    }
  } catch (error) {
    // Silencieux - pas critique si on ne peut pas récupérer les colonnes
    console.warn('Impossible de récupérer les colonnes existantes:', error);
  } finally {
    isLoadingColumns.value = false;
  }
}

// Charge les colonnes existantes quand la config Grist change
watch(
  () => [props.gristConfig?.docId, props.gristConfig?.tableId, props.gristConfig?.gristApiUrl],
  () => {
    if (props.gristConfig?.docId && props.gristConfig?.tableId && props.gristConfig?.gristApiUrl) {
      fetchExistingColumns();
    }
  },
  { immediate: true }
);
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
        
        <!-- Indicateur de chargement des colonnes -->
        <div v-if="isLoadingColumns" class="fr-mb-2w">
          <DsfrNotice
            title="Chargement des colonnes existantes..."
            :closeable="false"
          >
            Récupération des colonnes de votre table Grist...
          </DsfrNotice>
        </div>
        
        <!-- Info sur les colonnes existantes trouvées -->
        <div v-else-if="existingGristColumns.length > 0" class="fr-mb-2w">
          <DsfrCallout
            type="info"
            title="📋 Colonnes existantes dans Grist"
          >
            <p class="fr-text--sm">
              {{ existingGristColumns.length }} colonne(s) existante(s) détectée(s) : 
              <code v-for="col in existingGristColumns.slice(0, 5)" :key="col" class="fr-code">{{ col }}</code>
              <span v-if="existingGristColumns.length > 5">...</span>
            </p>
            <p class="fr-text--sm fr-mt-1w">
              💡 Utilisez ces noms exacts dans vos mappings pour éviter de créer des colonnes en double.
            </p>
          </DsfrCallout>
        </div>
        
        <MappingTable 
          :model-value="mappings" 
          @update:model-value="handleMappingUpdate"
          :sample-data="sampleRecord"
          :existing-grist-columns="existingGristColumns"
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

@media (max-width: 768px) {
  .data-preview {
    font-size: 0.85em;
  }
}
</style>
