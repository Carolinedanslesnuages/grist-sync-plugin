<script setup lang="ts">
import { computed } from 'vue';
import type { FieldMapping } from '../utils/mapping';

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
  const newMappings = [...mappings.value, { gristColumn: '', apiField: '' }];
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
function updateMapping(index: number, field: 'gristColumn' | 'apiField', value: string) {
  const newMappings = [...mappings.value];
  const currentMapping = newMappings[index];
  
  if (!currentMapping) return;
  
  newMappings[index] = {
    gristColumn: field === 'gristColumn' ? value : currentMapping.gristColumn,
    apiField: field === 'apiField' ? value : currentMapping.apiField,
  };
  emit('update:modelValue', newMappings);
}

/**
 * Extrait les clés disponibles dans les données d'exemple (pour suggestions)
 */
const availableApiFields = computed(() => {
  if (!props.sampleData) return [];
  
  const fields: string[] = [];
  
  function extractKeys(obj: any, prefix = '') {
    for (const key in obj) {
      const path = prefix ? `${prefix}.${key}` : key;
      fields.push(path);
      
      // Extraction récursive pour objets imbriqués (1 niveau seulement)
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        extractKeys(obj[key], path);
      }
    }
  }
  
  extractKeys(props.sampleData);
  return fields;
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
    
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="col-number">#</th>
            <th class="col-grist">Colonne Grist</th>
            <th class="col-arrow">→</th>
            <th class="col-api">Champ API</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(mapping, index) in mappings" :key="index" class="mapping-row">
            <td class="col-number">{{ index + 1 }}</td>
            <td class="col-grist">
              <input
                type="text"
                :value="mapping.gristColumn"
                @input="updateMapping(index, 'gristColumn', ($event.target as HTMLInputElement).value)"
                placeholder="Ex: Name, Email, Score..."
                class="input-field"
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
            <td colspan="5" class="empty-message">
              Aucun mapping défini. Cliquez sur "Ajouter une ligne" pour commencer.
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
        <strong>💡 Astuce:</strong> Les champs API disponibles sont suggérés automatiquement
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

.col-number {
  width: 50px;
  text-align: center;
  background: #f5f5f5;
  font-weight: bold;
}

.col-grist,
.col-api {
  width: 40%;
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

.input-field {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.95em;
  box-sizing: border-box;
}

.input-field:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.mapping-row {
  background: white;
  transition: background-color 0.2s;
}

.mapping-row:hover {
  background: #f0f8f0;
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
  .table-container {
    font-size: 0.85em;
  }
  
  .input-field {
    font-size: 0.85em;
    padding: 6px;
  }
  
  .col-number,
  .col-arrow {
    width: 40px;
  }
}
</style>
