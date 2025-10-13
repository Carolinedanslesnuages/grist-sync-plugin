<script setup lang="ts">
import { computed } from 'vue';
import type { FieldMapping } from '../utils/mapping';
import { extractAllKeys, generateMappingsFromApiData } from '../utils/mapping';

/**
 * Composant MappingTable - Table de mapping visuel façon Excel
 * 
 * Permet de définir la correspondance entre les colonnes Grist et les champs API
 */

interface Props {
  /** Liste initiale des mappings */
  modelValue: FieldMapping[];
  /** Exemple de données API pour faciliter le mapping */
  sampleData?: Record<string, any>;
}

interface Emits {
  (e: 'update:modelValue', mappings: FieldMapping[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Copie locale des mappings
const mappings = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

/**
 * Ajoute une nouvelle ligne de mapping vide
 */
function addMapping() {
  const newMappings = [...mappings.value, { gristColumn: '', apiField: '', enabled: true }];
  emit('update:modelValue', newMappings);
}

/**
 * Supprime un mapping à l'index donné
 */
function removeMapping(index: number) {
  const newMappings = mappings.value.filter((_, i) => i !== index);
  emit('update:modelValue', newMappings);
}

/**
 * Met à jour un mapping spécifique
 */
function updateMapping(index: number, field: 'gristColumn' | 'apiField' | 'enabled', value: string | boolean) {
  const newMappings = [...mappings.value];
  const currentMapping = newMappings[index];
  
  if (!currentMapping) return;
  
  newMappings[index] = {
    ...currentMapping,
    [field]: value
  };
  emit('update:modelValue', newMappings);
}

/**
 * Génère automatiquement les mappings à partir des données d'exemple
 */
function autoGenerateMappings() {
  if (!props.sampleData) return;
  
  const generatedMappings = generateMappingsFromApiData(props.sampleData);
  emit('update:modelValue', generatedMappings);
}

/**
 * Sélectionne tous les mappings
 */
function selectAll() {
  const newMappings = mappings.value.map(m => ({ ...m, enabled: true }));
  emit('update:modelValue', newMappings);
}

/**
 * Désélectionne tous les mappings
 */
function deselectAll() {
  const newMappings = mappings.value.map(m => ({ ...m, enabled: false }));
  emit('update:modelValue', newMappings);
}

/**
 * Extrait les clés disponibles dans les données d'exemple (pour suggestions)
 */
const availableApiFields = computed(() => {
  if (!props.sampleData) return [];
  return extractAllKeys(props.sampleData);
});

/**
 * Compte le nombre de mappings actifs
 */
const enabledCount = computed(() => {
  return mappings.value.filter(m => m.enabled !== false).length;
});
</script>

<template>
  <div class="mapping-table">
    <div class="table-header">
      <h3 class="fr-h5">📋 Configuration du mapping (façon Excel)</h3>
      <p class="fr-text--sm">
        Définissez la correspondance entre vos colonnes Grist et les champs de l'API
      </p>
    </div>
    
    <!-- Barre d'actions avec composants DSFR -->
    <div class="action-bar fr-mb-2w">
      <DsfrButton
        v-if="sampleData"
        @click="autoGenerateMappings"
        label="Générer automatiquement"
        icon="ri-magic-line"
        title="Générer automatiquement les mappings à partir des données API"
      />
      <div class="bulk-actions">
        <DsfrButton
          @click="selectAll"
          label="Tout sélectionner"
          icon="ri-checkbox-multiple-line"
          :disabled="mappings.length === 0"
          secondary
          size="sm"
          title="Sélectionner tous les mappings"
        />
        <DsfrButton
          @click="deselectAll"
          label="Tout désélectionner"
          icon="ri-checkbox-blank-line"
          :disabled="mappings.length === 0"
          secondary
          size="sm"
          title="Désélectionner tous les mappings"
        />
      </div>
      <DsfrBadge
        v-if="mappings.length > 0"
        :label="`${enabledCount} / ${mappings.length} activé(s)`"
        type="success"
        class="mapping-badge"
      />
    </div>
    
    <div class="table-container">
      <div class="fr-table fr-table--bordered">
        <table>
          <thead>
            <tr>
              <th scope="col" class="col-checkbox">Actif</th>
              <th scope="col" class="col-number">#</th>
              <th scope="col" class="col-grist">Colonne Grist</th>
              <th scope="col" class="col-arrow">→</th>
              <th scope="col" class="col-api">Champ API</th>
              <th scope="col" class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(mapping, index) in mappings" 
              :key="index" 
              class="mapping-row"
              :class="{ 'disabled-row': mapping.enabled === false }"
            >
              <td class="col-checkbox">
                <input
                  type="checkbox"
                  :checked="mapping.enabled !== false"
                  @change="updateMapping(index, 'enabled', ($event.target as HTMLInputElement).checked)"
                  class="fr-checkbox"
                  :aria-label="`Activer/désactiver le mapping ${index + 1}`"
                />
              </td>
              <td class="col-number">{{ index + 1 }}</td>
              <td class="col-grist">
                <input
                  type="text"
                  :value="mapping.gristColumn"
                  @input="updateMapping(index, 'gristColumn', ($event.target as HTMLInputElement).value)"
                  placeholder="Ex: Name, Email, Score..."
                  class="fr-input"
                  :disabled="mapping.enabled === false"
                  :aria-label="`Colonne Grist ${index + 1}`"
                />
              </td>
              <td class="col-arrow">
                <span class="arrow" aria-hidden="true">←</span>
              </td>
              <td class="col-api">
                <input
                  type="text"
                  :value="mapping.apiField"
                  @input="updateMapping(index, 'apiField', ($event.target as HTMLInputElement).value)"
                  placeholder="Ex: user.name, email..."
                  class="fr-input"
                  :list="`api-fields-${index}`"
                  :disabled="mapping.enabled === false"
                  :aria-label="`Champ API ${index + 1}`"
                />
                <datalist v-if="availableApiFields.length > 0" :id="`api-fields-${index}`">
                  <option v-for="field in availableApiFields" :key="field" :value="field" />
                </datalist>
              </td>
              <td class="col-actions">
                <DsfrButton
                  @click="removeMapping(index)"
                  icon="ri-delete-bin-line"
                  icon-only
                  :title="`Supprimer la ligne ${index + 1}`"
                  tertiary-no-outline
                  size="sm"
                />
              </td>
            </tr>
            <tr v-if="mappings.length === 0" class="empty-row">
              <td colspan="6" class="empty-message">
                Aucun mapping défini. Cliquez sur "Générer automatiquement" ou "Ajouter une ligne" pour commencer.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="table-footer fr-mt-2w">
      <DsfrButton
        @click="addMapping"
        label="Ajouter une ligne de mapping"
        icon="ri-add-line"
      />
      <DsfrCallout
        v-if="availableApiFields.length > 0"
        class="fr-mt-2w"
        title="Astuce"
        content="Les champs API disponibles sont suggérés automatiquement. Vous pouvez renommer les colonnes Grist à votre convenance."
      />
    </div>
  </div>
</template>

<style scoped>
/* Container principal avec styles DSFR */
.mapping-table {
  background: var(--background-default-grey-hover);
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: var(--raised-shadow);
  margin: 1.25rem 0;
}

.table-header h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-title-grey);
}

/* Barre d'actions avec layout flex */
.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  padding: 1rem;
  background: var(--background-contrast-grey);
  border-radius: 0.375rem;
}

.bulk-actions {
  display: flex;
  gap: 0.5rem;
}

.mapping-badge {
  margin-left: auto;
}

/* Conteneur de table responsive */
.table-container {
  overflow-x: auto;
  margin-bottom: 1rem;
}

/* Styles de table DSFR */
.fr-table table {
  width: 100%;
  background: var(--background-default-grey-hover);
}

.fr-table thead {
  background: var(--background-contrast-info);
}

.fr-table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 700;
  color: var(--text-title-grey);
}

.fr-table td {
  padding: 0.625rem;
  vertical-align: middle;
}

/* Colonnes spécifiques */
.col-checkbox {
  width: 3.75rem;
  text-align: center;
}

.col-number {
  width: 3.125rem;
  text-align: center;
  background: var(--background-contrast-grey);
  font-weight: 700;
  color: var(--text-mention-grey);
}

.col-grist,
.col-api {
  width: 35%;
}

.col-arrow {
  width: 3.125rem;
  text-align: center;
  font-size: 1.2em;
  color: var(--text-action-high-blue-france);
  font-weight: 700;
}

.col-actions {
  width: 5rem;
  text-align: center;
}

/* Inputs avec styles DSFR */
.fr-input {
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s, opacity 0.2s;
}

.fr-input:disabled {
  background: var(--background-disabled-grey);
  color: var(--text-disabled-grey);
  cursor: not-allowed;
  opacity: 0.6;
}

.fr-checkbox {
  cursor: pointer;
  width: 1.125rem;
  height: 1.125rem;
}

/* Lignes de mapping */
.mapping-row {
  background: var(--background-default-grey-hover);
  transition: background-color 0.2s, opacity 0.2s;
}

.mapping-row:hover {
  background: var(--background-contrast-grey-hover);
}

.disabled-row {
  opacity: 0.5;
}

.disabled-row:hover {
  background: var(--background-contrast-grey);
}

.empty-row {
  background: var(--background-contrast-grey);
}

.empty-message {
  text-align: center;
  color: var(--text-mention-grey);
  font-style: italic;
  padding: 1.875rem;
}

/* Footer de la table */
.table-footer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Responsive - Breakpoints DSFR */
@media (max-width: 48rem) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .bulk-actions {
    flex-direction: column;
  }
  
  .mapping-badge {
    margin-left: 0;
    text-align: center;
  }
  
  .table-container {
    font-size: 0.85em;
  }
  
  .fr-input {
    font-size: 0.85em;
    padding: 0.375rem;
  }
  
  .col-number,
  .col-arrow,
  .col-checkbox {
    width: 2.5rem;
  }
}
</style>
