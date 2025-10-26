<template>
  <div class="onboarding-container">
    <h1>🚀 Grist Sync - Configuration</h1>
    <p class="subtitle">Configurez votre synchronisation entre une source externe et Grist</p>

    <div class="form-container">
      <!-- Step 1: Grist Configuration -->
      <section class="config-section">
        <h2>1. Configuration Grist</h2>
        
        <div class="form-group">
          <label for="gristUrl">URL Grist</label>
          <input
            id="gristUrl"
            v-model="config.grist.gristApiUrl"
            type="text"
            placeholder="https://docs.getgrist.com"
          />
        </div>

        <div class="form-group">
          <label for="docId">Document ID</label>
          <input
            id="docId"
            v-model="config.grist.docId"
            type="text"
            placeholder="YOUR_DOC_ID"
          />
          <small>Visible dans l'URL de votre document Grist</small>
        </div>

        <div class="form-group">
          <label for="tableId">Table ID</label>
          <input
            id="tableId"
            v-model="config.grist.tableId"
            type="text"
            placeholder="YOUR_TABLE_ID"
          />
        </div>

        <div class="form-group">
          <label for="apiToken">API Token (optionnel)</label>
          <input
            id="apiToken"
            v-model="config.grist.apiToken"
            type="password"
            placeholder="Laissez vide si document public"
          />
        </div>
      </section>

      <!-- Step 2: Source Configuration -->
      <section class="config-section">
        <h2>2. Configuration Source</h2>

        <div class="form-group">
          <label for="sourceType">Type de source</label>
          <select id="sourceType" v-model="config.source.type">
            <option value="rest">REST API</option>
            <option value="mock">Mock (test)</option>
            <option value="google-sheets" disabled>Google Sheets (à venir)</option>
            <option value="sql" disabled>SQL (à venir)</option>
          </select>
        </div>

        <div v-if="config.source.type === 'rest'" class="form-group">
          <label for="sourceUrl">URL de l'API</label>
          <input
            id="sourceUrl"
            v-model="config.source.url"
            type="text"
            placeholder="https://api.example.com/data"
          />
        </div>

        <div v-if="config.source.type === 'rest'" class="form-group">
          <label for="authHeader">Authorization Header (optionnel)</label>
          <input
            id="authHeader"
            v-model="authorizationHeader"
            type="password"
            placeholder="Bearer YOUR_TOKEN"
          />
          <small>Exemple: Bearer YOUR_TOKEN</small>
        </div>
      </section>

      <!-- Step 3: Mapping Configuration -->
      <section class="config-section">
        <h2>3. Mapping JSON</h2>
        
        <div class="form-group">
          <label for="mapping">Configuration du mapping (JSON)</label>
          <textarea
            id="mapping"
            v-model="mappingJson"
            rows="8"
            placeholder='{"grist_field": "source_field"}'
            @blur="validateMapping"
          ></textarea>
          <small v-if="mappingError" class="error">{{ mappingError }}</small>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" v-model="config.sync.autoCreateColumns" />
            Créer automatiquement les colonnes manquantes
          </label>
        </div>
      </section>

      <!-- Step 4: Sync Options -->
      <section class="config-section">
        <h2>4. Options de synchronisation</h2>

        <div class="form-group">
          <label for="syncMode">Mode de synchronisation</label>
          <select id="syncMode" v-model="config.sync.mode">
            <option value="add">Add (ajouter uniquement)</option>
            <option value="update">Update (mettre à jour)</option>
            <option value="upsert">Upsert (ajouter ou mettre à jour)</option>
          </select>
        </div>

        <div v-if="config.sync.mode !== 'add'" class="form-group">
          <label for="uniqueKey">Clé unique</label>
          <input
            id="uniqueKey"
            v-model="config.sync.uniqueKey"
            type="text"
            placeholder="id"
          />
          <small>Colonne utilisée pour identifier les enregistrements existants</small>
        </div>

        <div class="form-group">
          <label for="schedule">Schedule (cron)</label>
          <input
            id="schedule"
            v-model="config.sync.schedule"
            type="text"
            placeholder="0 */6 * * *"
          />
          <small>Format cron, ex: "0 */6 * * *" pour toutes les 6 heures</small>
        </div>
      </section>

      <!-- Actions -->
      <section class="actions">
        <button @click="testConnection" :disabled="testing || syncing" class="btn btn-secondary">
          {{ testing ? 'Test en cours...' : '🔗 Tester la connexion' }}
        </button>
        
        <button @click="launchSync" :disabled="testing || syncing" class="btn btn-primary">
          {{ syncing ? 'Synchronisation en cours...' : '▶️ Lancer la synchronisation' }}
        </button>
      </section>

      <!-- Results -->
      <section v-if="result" class="result" :class="result.success ? 'success' : 'error'">
        <h3>{{ result.success ? '✅ Synchronisation réussie' : '❌ Erreur' }}</h3>
        <div class="result-stats" v-if="result.success">
          <span>Ajoutés: {{ result.added }}</span>
          <span>Mis à jour: {{ result.updated }}</span>
          <span>Inchangés: {{ result.unchanged }}</span>
          <span>Erreurs: {{ result.errors }}</span>
          <span>Durée: {{ result.duration }}ms</span>
        </div>
        <div class="result-details">
          <details>
            <summary>Détails</summary>
            <ul>
              <li v-for="(detail, index) in result.details" :key="index">{{ detail }}</li>
            </ul>
          </details>
        </div>
      </section>

      <!-- Connection Test Result -->
      <section v-if="connectionTestResult" class="result" :class="connectionTestResult.success ? 'success' : 'error'">
        <h3>{{ connectionTestResult.success ? '✅ Test de connexion réussi' : '⚠️ Test de connexion' }}</h3>
        <div class="result-stats">
          <span>Grist: {{ connectionTestResult.grist ? '✓' : '✗' }}</span>
          <span>Source: {{ connectionTestResult.source ? '✓' : '✗' }}</span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { SyncConfig, SyncResult } from '../sync/types';
import { SyncService } from '../sync/syncService';

// Configuration
const config = ref<SyncConfig>({
  grist: {
    docId: '',
    tableId: '',
    gristApiUrl: 'https://docs.getgrist.com',
    apiToken: undefined,
  },
  source: {
    type: 'rest',
    url: '',
    method: 'GET',
    headers: {},
  },
  mapping: {},
  sync: {
    mode: 'upsert',
    uniqueKey: 'id',
    schedule: '0 */6 * * *',
    autoCreateColumns: true,
    batchSize: 100,
    retryAttempts: 3,
    retryDelay: 1000,
  },
});

// UI State
const testing = ref(false);
const syncing = ref(false);
const result = ref<(SyncResult & { success?: boolean }) | null>(null);
const connectionTestResult = ref<{ success: boolean; grist: boolean; source: boolean } | null>(null);
const mappingJson = ref('{\n  "id": "id",\n  "name": "name",\n  "email": "email"\n}');
const mappingError = ref('');
const authorizationHeader = ref('');

// Methods
const validateMapping = () => {
  try {
    const parsed = JSON.parse(mappingJson.value);
    config.value.mapping = parsed;
    mappingError.value = '';
  } catch (error) {
    mappingError.value = 'JSON invalide';
  }
};

const testConnection = async () => {
  testing.value = true;
  connectionTestResult.value = null;
  result.value = null;

  try {
    validateMapping();
    if (mappingError.value) {
      throw new Error('Mapping JSON invalide');
    }

    const syncService = new SyncService(config.value);
    const testResult = await syncService.testConnections();
    
    connectionTestResult.value = {
      success: testResult.grist && testResult.source,
      grist: testResult.grist,
      source: testResult.source,
    };
  } catch (error) {
    connectionTestResult.value = {
      success: false,
      grist: false,
      source: false,
    };
    console.error('Connection test failed:', error);
  } finally {
    testing.value = false;
  }
};

const launchSync = async () => {
  syncing.value = true;
  result.value = null;
  connectionTestResult.value = null;

  try {
    validateMapping();
    if (mappingError.value) {
      throw new Error('Mapping JSON invalide');
    }

    const syncService = new SyncService(config.value);
    const syncResult = await syncService.sync();
    
    result.value = syncResult;
  } catch (error) {
    result.value = {
      success: false,
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: 1,
      details: [`Erreur: ${error instanceof Error ? error.message : String(error)}`],
      duration: 0,
    };
  } finally {
    syncing.value = false;
  }
};

// Lifecycle
onMounted(() => {
  // Try to load saved configuration from localStorage
  const savedConfig = localStorage.getItem('grist-sync-config');
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig);
      config.value = { ...config.value, ...parsed };
      if (parsed.mapping) {
        mappingJson.value = JSON.stringify(parsed.mapping, null, 2);
      }
    } catch (error) {
      console.error('Failed to load saved configuration:', error);
    }
  }
});
</script>

<style scoped>
.onboarding-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.config-section {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.config-section h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #333;
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
}

.form-group textarea {
  font-family: 'Courier New', monospace;
  resize: vertical;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #6c757d;
  font-size: 0.875rem;
}

.form-group small.error {
  color: #dc3545;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #0066cc;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0052a3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #545b62;
}

.result {
  margin-top: 2rem;
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid;
}

.result.success {
  background-color: #d4edda;
  border-color: #28a745;
}

.result.error {
  background-color: #f8d7da;
  border-color: #dc3545;
}

.result h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.result-stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.result-stats span {
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 500;
}

.result-details ul {
  list-style: none;
  padding-left: 0;
}

.result-details li {
  padding: 0.25rem 0;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

details {
  cursor: pointer;
}

summary {
  font-weight: 500;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
}
</style>
