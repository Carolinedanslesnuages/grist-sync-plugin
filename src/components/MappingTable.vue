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
      <h3>📋 Configuration du mapping (façon Excel)</h3>
      <p class="help-text">
        Définissez la correspondance entre vos colonnes Grist et les champs de l'API
      </p>
    </div>
    
    <!-- Barre d'actions -->
    <div class="action-bar">
      <button 
        v-if="sampleData" 
        @click="autoGenerateMappings" 
        class="btn-auto-generate"
        title="Générer automatiquement les mappings à partir des données API"
      >
        ✨ Générer automatiquement
      </button>
      <div class="bulk-actions">
        <button 
          @click="selectAll" 
          class="btn-bulk"
          :disabled="mappings.length === 0"
          title="Sélectionner tous les mappings"
        >
          ✅ Tout sélectionner
        </button>
        <button 
          @click="deselectAll" 
          class="btn-bulk"
          :disabled="mappings.length === 0"
          title="Désélectionner tous les mappings"
        >
          ⬜ Tout désélectionner
        </button>
      </div>
      <div v-if="mappings.length > 0" class="mapping-count">
        {{ enabledCount }} / {{ mappings.length }} activé(s)
      </div>
    </div>
    
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="col-checkbox">Actif</th>
            <th class="col-number">#</th>
            <th class="col-grist">Colonne Grist</th>
            <th class="col-arrow">→</th>
            <th class="col-api">Champ API</th>
            <th class="col-actions">Actions</th>
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
                class="checkbox-field"
                title="Activer/désactiver ce mapping"
              />
            </td>
            <td class="col-number">{{ index + 1 }}</td>
            <td class="col-grist">
              <input
                type="text"
                :value="mapping.gristColumn"
                @input="updateMapping(index, 'gristColumn', ($event.target as HTMLInputElement).value)"
                placeholder="Ex: Name, Email, Score..."
                class="input-field"
                :disabled="mapping.enabled === false"
              />
            </td>
            <td class="col-arrow">
              <span class="arrow">←</span>
            </td>
            <td class="col-api">
              <input
                type="text"
                :value="mapping.apiField"
                @input="updateMapping(index, 'apiField', ($event.target as HTMLInputElement).value)"
                placeholder="Ex: user.name, email..."
                class="input-field"
                :list="`api-fields-${index}`"
                :disabled="mapping.enabled === false"
              />
              <datalist v-if="availableApiFields.length > 0" :id="`api-fields-${index}`">
                <option v-for="field in availableApiFields" :key="field" :value="field" />
              </datalist>
            </td>
            <td class="col-actions">
              <button
                @click="removeMapping(index)"
                class="btn-remove"
                title="Supprimer cette ligne"
              >
                🗑️
              </button>
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
    
    <div class="table-footer">
      <button @click="addMapping" class="btn-add">
        ➕ Ajouter une ligne de mapping
      </button>
      <div v-if="availableApiFields.length > 0" class="info-box">
        <strong>💡 Astuce:</strong> Les champs API disponibles sont suggérés automatiquement. 
        Vous pouvez renommer les colonnes Grist à votre convenance.
      </div>
    </div>
  </div>
</template>

<style scoped>
.mapping-table {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin: 20px 0;
}

.table-header h3 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 1.3em;
}

.help-text {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 0.9em;
}

.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
}

.bulk-actions {
  display: flex;
  gap: 8px;
}

.btn-auto-generate {
  padding: 10px 20px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 600;
  transition: background-color 0.2s;
}

.btn-auto-generate:hover {
  background: #1976D2;
}

.btn-bulk {
  padding: 8px 16px;
  background: #757575;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

.btn-bulk:hover:not(:disabled) {
  background: #616161;
}

.btn-bulk:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.mapping-count {
  margin-left: auto;
  padding: 6px 12px;
  background: #4CAF50;
  color: white;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.9em;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 15px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: #f9f9f9;
}

thead {
  background: #4CAF50;
  color: white;
}

th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  border: 1px solid #ddd;
}

td {
  padding: 10px;
  border: 1px solid #ddd;
}

.col-checkbox {
  width: 60px;
  text-align: center;
}

.col-number {
  width: 50px;
  text-align: center;
  background: #f5f5f5;
  font-weight: bold;
}

.col-grist,
.col-api {
  width: 35%;
}

.col-arrow {
  width: 50px;
  text-align: center;
  font-size: 1.2em;
  color: #4CAF50;
}

.col-actions {
  width: 80px;
  text-align: center;
}

.checkbox-field {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.input-field {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.95em;
  box-sizing: border-box;
  transition: border-color 0.2s, opacity 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.input-field:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
  opacity: 0.6;
}

.mapping-row {
  background: white;
  transition: background-color 0.2s, opacity 0.2s;
}

.mapping-row:hover {
  background: #f0f8f0;
}

.disabled-row {
  opacity: 0.5;
}

.disabled-row:hover {
  background: #fafafa;
}

.empty-row {
  background: #fafafa;
}

.empty-message {
  text-align: center;
  color: #999;
  font-style: italic;
  padding: 30px;
}

.btn-remove {
  padding: 6px 10px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.2s;
}

.btn-remove:hover {
  background: #d32f2f;
}

.table-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-add {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 600;
  transition: background-color 0.2s;
  align-self: flex-start;
}

.btn-add:hover {
  background: #45a049;
}

.info-box {
  padding: 10px;
  background: #e3f2fd;
  border-left: 4px solid #2196F3;
  border-radius: 4px;
  font-size: 0.9em;
  color: #1976D2;
}

.arrow {
  font-weight: bold;
}

@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .bulk-actions {
    flex-direction: column;
  }
  
  .mapping-count {
    margin-left: 0;
    text-align: center;
  }
  
  .table-container {
    font-size: 0.85em;
  }
  
  .input-field {
    font-size: 0.85em;
    padding: 6px;
  }
  
  .col-number,
  .col-arrow,
  .col-checkbox {
    width: 40px;
  }
}
</style>
