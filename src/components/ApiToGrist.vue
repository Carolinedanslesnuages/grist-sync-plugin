<script setup lang="ts">
import { ref, computed } from 'vue';
import MappingTable from './MappingTable.vue';
import type { FieldMapping } from '../utils/mapping';
import { transformRecords, getValidMappings } from '../utils/mapping';
import { GristClient } from '../utils/grist';
import { defaultConfig } from '../config';
import type { GristConfig } from '../config';

/**
 * Composant principal ApiToGrist
 * 
 * Permet de synchroniser des données depuis n'importe quelle API vers Grist
 */

// État du formulaire
const apiUrl = ref('');
const apiToken = ref('');
const isLoading = ref(false);
const statusMessage = ref('');
const statusType = ref<'success' | 'error' | 'info'>('info');

// Données de l'API
const apiData = ref<any[]>([]);
const sampleRecord = ref<Record<string, any> | undefined>(undefined);

// Configuration du mapping
const mappings = ref<FieldMapping[]>([
  { gristColumn: '', apiField: '' }
]);

// Configuration Grist (éditable)
const gristConfig = ref<GristConfig>({ ...defaultConfig });

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

/**
 * Récupère les données depuis l'API externe
 */
async function fetchApiData() {
  if (!apiUrl.value) {
    showStatus('⚠️ Veuillez saisir une URL d\'API', 'error');
    return;
  }
  
  isLoading.value = true;
  statusMessage.value = '';
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (apiToken.value) {
      headers['Authorization'] = `Bearer ${apiToken.value}`;
    }
    
    const response = await fetch(apiUrl.value, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Détecte si c'est un tableau ou un objet avec des données
    if (Array.isArray(data)) {
      apiData.value = data;
    } else if (data.data && Array.isArray(data.data)) {
      apiData.value = data.data;
    } else if (data.results && Array.isArray(data.results)) {
      apiData.value = data.results;
    } else if (data.items && Array.isArray(data.items)) {
      apiData.value = data.items;
    } else {
      // Si ce n'est pas un tableau, on l'enveloppe
      apiData.value = [data];
    }
    
    if (apiData.value.length > 0) {
      sampleRecord.value = apiData.value[0];
      showStatus(`✅ ${apiData.value.length} enregistrement(s) récupéré(s) avec succès`, 'success');
    } else {
      showStatus('⚠️ Aucune donnée trouvée dans la réponse de l\'API', 'error');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    showStatus(`❌ Erreur lors de la récupération: ${message}`, 'error');
    apiData.value = [];
    sampleRecord.value = undefined;
  } finally {
    isLoading.value = false;
  }
}

/**
 * Synchronise les données vers Grist
 */
async function syncToGrist() {
  if (apiData.value.length === 0) {
    showStatus('⚠️ Aucune donnée à synchroniser. Récupérez d\'abord les données de l\'API.', 'error');
    return;
  }
  
  const validMappings = getValidMappings(mappings.value);
  
  if (validMappings.length === 0) {
    showStatus('⚠️ Veuillez définir au moins un mapping valide', 'error');
    return;
  }
  
  if (!gristConfig.value.docId || gristConfig.value.docId === 'YOUR_DOC_ID') {
    showStatus('⚠️ Veuillez configurer votre Document ID Grist', 'error');
    return;
  }
  
  if (!gristConfig.value.tableId || gristConfig.value.tableId === 'YOUR_TABLE_ID') {
    showStatus('⚠️ Veuillez configurer votre Table ID Grist', 'error');
    return;
  }
  
  isLoading.value = true;
  statusMessage.value = '';
  
  try {
    // Transforme les données selon le mapping
    const transformedData = transformRecords(apiData.value, validMappings);
    
    if (transformedData.length === 0) {
      showStatus('⚠️ Aucune donnée après transformation', 'error');
      return;
    }
    
    // Insère dans Grist
    const client = new GristClient(gristConfig.value);
    const result = await client.addRecords(transformedData);
    
    showStatus(
      `✅ ${result.records.length} enregistrement(s) synchronisé(s) avec succès vers Grist!`,
      'success'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    showStatus(`❌ Erreur lors de la synchronisation: ${message}`, 'error');
  } finally {
    isLoading.value = false;
  }
}

/**
 * Teste la connexion à Grist
 */
async function testGristConnection() {
  if (!gristConfig.value.docId || gristConfig.value.docId === 'YOUR_DOC_ID') {
    showStatus('⚠️ Veuillez configurer votre Document ID Grist', 'error');
    return;
  }
  
  if (!gristConfig.value.tableId || gristConfig.value.tableId === 'YOUR_TABLE_ID') {
    showStatus('⚠️ Veuillez configurer votre Table ID Grist', 'error');
    return;
  }
  
  isLoading.value = true;
  
  try {
    const client = new GristClient(gristConfig.value);
    const isConnected = await client.testConnection();
    
    if (isConnected) {
      showStatus('✅ Connexion à Grist réussie!', 'success');
    } else {
      showStatus('❌ Impossible de se connecter à Grist. Vérifiez votre configuration.', 'error');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    showStatus(`❌ Erreur de connexion: ${message}`, 'error');
  } finally {
    isLoading.value = false;
  }
}

// Nombre total d'enregistrements
const recordCount = computed(() => apiData.value.length);

// Nombre de mappings valides
const validMappingsCount = computed(() => getValidMappings(mappings.value).length);
</script>

<template>
  <div class="api-to-grist">
    <div class="header">
      <h1>🔄 API vers Grist - Synchronisation</h1>
      <p class="subtitle">
        Synchronisez facilement vos données API vers Grist avec un mapping visuel
      </p>
    </div>
    
    <!-- Section Configuration Grist -->
    <section class="config-section">
      <h2>⚙️ Configuration Grist</h2>
      <div class="form-grid">
        <div class="form-group">
          <label for="docId">Document ID *</label>
          <input
            id="docId"
            v-model="gristConfig.docId"
            type="text"
            placeholder="Votre ID de document Grist"
            class="input-field"
          />
        </div>
        <div class="form-group">
          <label for="tableId">Table ID *</label>
          <input
            id="tableId"
            v-model="gristConfig.tableId"
            type="text"
            placeholder="Votre ID de table Grist"
            class="input-field"
          />
        </div>
        <div class="form-group">
          <label for="gristToken">Token API Grist (optionnel)</label>
          <input
            id="gristToken"
            v-model="gristConfig.apiTokenGrist"
            type="password"
            placeholder="Votre token Grist (si nécessaire)"
            class="input-field"
          />
        </div>
        <div class="form-group">
          <label for="gristUrl">URL API Grist</label>
          <input
            id="gristUrl"
            v-model="gristConfig.gristApiUrl"
            type="text"
            placeholder="https://docs.getgrist.com"
            class="input-field"
          />
        </div>
      </div>
      <button
        @click="testGristConnection"
        :disabled="isLoading"
        class="btn btn-secondary"
      >
        🔍 Tester la connexion Grist
      </button>
    </section>
    
    <!-- Section API Source -->
    <section class="api-section">
      <h2>🌐 Source API</h2>
      <div class="form-group">
        <label for="apiUrl">URL de l'API *</label>
        <input
          id="apiUrl"
          v-model="apiUrl"
          type="url"
          placeholder="https://api.example.com/data"
          class="input-field"
          @keyup.enter="fetchApiData"
        />
      </div>
      <div class="form-group">
        <label for="apiToken">Token API (optionnel)</label>
        <input
          id="apiToken"
          v-model="apiToken"
          type="password"
          placeholder="Bearer token si nécessaire"
          class="input-field"
        />
      </div>
      <button
        @click="fetchApiData"
        :disabled="isLoading"
        class="btn btn-primary"
      >
        {{ isLoading ? '⏳ Chargement...' : '📥 Récupérer les données' }}
      </button>
      
      <div v-if="recordCount > 0" class="info-badge">
        📊 {{ recordCount }} enregistrement(s) chargé(s)
      </div>
    </section>
    
    <!-- Section Mapping -->
    <section v-if="apiData.length > 0" class="mapping-section">
      <MappingTable
        v-model="mappings"
        :sample-data="sampleRecord"
      />
      
      <div v-if="validMappingsCount > 0" class="info-badge success">
        ✓ {{ validMappingsCount }} mapping(s) valide(s) configuré(s)
      </div>
    </section>
    
    <!-- Message de statut -->
    <div
      v-if="statusMessage"
      class="status-message"
      :class="`status-${statusType}`"
    >
      {{ statusMessage }}
    </div>
    
    <!-- Bouton de synchronisation -->
    <section v-if="apiData.length > 0" class="sync-section">
      <button
        @click="syncToGrist"
        :disabled="isLoading || validMappingsCount === 0"
        class="btn btn-success btn-large"
      >
        {{ isLoading ? '⏳ Synchronisation...' : '🚀 Synchroniser vers Grist' }}
      </button>
      <p class="help-text">
        Cette action va insérer {{ recordCount }} enregistrement(s) dans votre table Grist
      </p>
    </section>
  </div>
</template>

<style scoped>
.api-to-grist {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: system-ui, -apple-system, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 40px;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.header h1 {
  margin: 0 0 10px 0;
  font-size: 2.2em;
}

.subtitle {
  margin: 0;
  font-size: 1.1em;
  opacity: 0.95;
}

section {
  background: white;
  padding: 25px;
  margin-bottom: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

h2 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 1.5em;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #555;
  font-size: 0.95em;
}

.input-field {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1em;
  transition: all 0.3s;
  box-sizing: border-box;
}

.input-field:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-block;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
}

.btn-large {
  padding: 16px 32px;
  font-size: 1.2em;
  width: 100%;
  max-width: 500px;
  display: block;
  margin: 0 auto;
}

.info-badge {
  display: inline-block;
  padding: 10px 16px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 6px;
  font-weight: 600;
  margin-top: 15px;
  border-left: 4px solid #2196F3;
}

.info-badge.success {
  background: #e8f5e9;
  color: #2e7d32;
  border-left-color: #4CAF50;
}

.status-message {
  padding: 15px 20px;
  border-radius: 6px;
  margin: 20px 0;
  font-weight: 500;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.status-info {
  background: #e3f2fd;
  color: #1976d2;
  border-left: 4px solid #2196F3;
}

.status-success {
  background: #e8f5e9;
  color: #2e7d32;
  border-left: 4px solid #4CAF50;
}

.status-error {
  background: #ffebee;
  color: #c62828;
  border-left: 4px solid #f44336;
}

.help-text {
  text-align: center;
  color: #666;
  font-size: 0.95em;
  margin-top: 10px;
}

.sync-section {
  text-align: center;
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 1.6em;
  }
  
  .subtitle {
    font-size: 0.95em;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .btn-large {
    font-size: 1em;
    padding: 14px 24px;
  }
}
</style>
