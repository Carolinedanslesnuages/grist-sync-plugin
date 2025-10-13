<script setup lang="ts">
import { ref } from 'vue';
import { analyzeError, formatErrorShort } from '../../utils/errorHandler';
import type { ErrorInfo } from '../../utils/errorHandler';

/**
 * Step 1: Saisie de l'URL API externe et récupération des données
 */

interface Props {
  backendUrl: string;
  isLoading: boolean;
}

interface Emits {
  (e: 'update:backendUrl', value: string): void;
  (e: 'update:isLoading', value: boolean): void;
  (e: 'complete', data: any[], url: string): void;
  (e: 'status', message: string, type: 'success' | 'error' | 'info'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localUrl = ref(props.backendUrl);
const previewData = ref<any[] | null>(null);
const sampleRecord = ref<Record<string, any> | null>(null);
const lastError = ref<ErrorInfo | null>(null);

/**
 * Récupère les données depuis le backend
 */
async function fetchApiData() {
  if (!localUrl.value) {
    emit('status', '⚠️ Veuillez saisir l\'URL du backend', 'error');
    return;
  }
  
  // Reset preview data and error when fetching new data
  previewData.value = null;
  sampleRecord.value = null;
  lastError.value = null;
  
  emit('update:isLoading', true);
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(localUrl.value, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Détecte si c'est un tableau ou un objet avec des données
    let apiData: any[] = [];
    if (Array.isArray(data)) {
      apiData = data;
    } else if (data.data && Array.isArray(data.data)) {
      apiData = data.data;
    } else if (data.results && Array.isArray(data.results)) {
      apiData = data.results;
    } else if (data.items && Array.isArray(data.items)) {
      apiData = data.items;
    } else {
      apiData = [data];
    }
    
    if (apiData.length > 0) {
      // Store data locally for preview
      previewData.value = apiData;
      sampleRecord.value = apiData[0];
      emit('update:backendUrl', localUrl.value);
      emit('status', `✅ ${apiData.length} enregistrement(s) récupéré(s) avec succès`, 'success');
    } else {
      emit('status', '⚠️ Aucune donnée trouvée dans la réponse de l\'API', 'error');
    }
  } catch (error) {
    // Analyse détaillée de l'erreur
    const errorInfo = analyzeError(error, 'api_fetch');
    lastError.value = errorInfo;
    
    // Message court pour le status
    const shortMessage = formatErrorShort(errorInfo);
    emit('status', `❌ ${shortMessage}`, 'error');
    
    console.error('Erreur détaillée:', errorInfo);
  } finally {
    emit('update:isLoading', false);
  }
}
</script>

<template>
  <div class="step-container">
    <div class="step-header">
      <h2 class="fr-h2">
        <span class="step-icon">🌐</span>
        Étape 1 : Source de données
      </h2>
      <p class="fr-text">
        Saisissez l'URL de votre backend qui fournit les données à synchroniser.
        Le backend gère l'authentification de manière sécurisée.
      </p>
    </div>

    <div class="step-content">
      <DsfrInputGroup>
        <DsfrInput
          label="URL du backend *"
          v-model="localUrl"
          type="url"
          placeholder="https://backend.example.com/api/data"
          hint="L'URL du backend qui fournit les données. Le backend gère l'authentification de manière sécurisée."
          @keyup.enter="fetchApiData"
        />
      </DsfrInputGroup>

      <div class="fr-mt-4w">
        <DsfrButton
          label="Récupérer les données"
          icon="ri-download-cloud-line"
          :loading="isLoading"
          @click="fetchApiData"
          size="lg"
        />
      </div>

      <!-- Informations supplémentaires -->
      <div class="fr-mt-4w">
        <DsfrCallout
          title="💡 Astuce"
          content="Assurez-vous que votre backend est accessible et retourne des données au format JSON. Les formats supportés incluent les tableaux directs ou les objets avec propriétés 'data', 'results' ou 'items'."
        />
      </div>

      <!-- Exemple d'URLs -->
      <div class="fr-mt-4w">
        <details class="fr-accordion">
          <summary class="fr-accordion__btn">Exemples d'URLs</summary>
          <div class="fr-accordion__body">
            <ul class="fr-text--sm">
              <li><code>https://jsonplaceholder.typicode.com/users</code> - API publique de test</li>
              <li><code>https://api.example.com/data?format=json</code> - API avec paramètres</li>
              <li><code>https://backend.mycompany.com/export/customers</code> - Backend interne</li>
            </ul>
          </div>
        </details>
      </div>

      <!-- Detailed Error Display -->
      <div v-if="lastError" class="fr-mt-4w">
        <DsfrAlert
          type="error"
          :title="lastError.title"
          :description="lastError.message"
        >
          <template #default>
            <div class="error-details">
              <p class="fr-text--sm"><strong>📋 Explication :</strong></p>
              <p class="fr-text--sm">{{ lastError.explanation }}</p>
              
              <p class="fr-text--sm fr-mt-2w"><strong>💡 Solutions recommandées :</strong></p>
              <ul class="fr-text--sm">
                <li v-for="(solution, idx) in lastError.solutions" :key="idx">{{ solution }}</li>
              </ul>
              
              <details v-if="lastError.technicalDetails" class="fr-mt-2w">
                <summary class="fr-text--sm" style="cursor: pointer; color: #666;">
                  🔧 Détails techniques
                </summary>
                <pre class="fr-text--xs fr-mt-1w" style="background: #f5f5f5; padding: 0.5rem; border-radius: 4px; overflow-x: auto;">{{ lastError.technicalDetails }}</pre>
              </details>
            </div>
          </template>
        </DsfrAlert>
      </div>

      <!-- Preview of fetched data -->
      <div v-if="previewData && previewData.length > 0" class="fr-mt-6w">
        <hr class="fr-hr" />
        
        <div class="fr-mt-4w">
          <DsfrNotice
            title="✅ Données récupérées avec succès"
            :closeable="false"
          >
            {{ previewData.length }} enregistrement(s) disponible(s) pour la synchronisation
          </DsfrNotice>
        </div>

        <!-- Preview of first record -->
        <div v-if="sampleRecord" class="fr-mt-4w">
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

.step-content {
  max-width: 800px;
}

details.fr-accordion {
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  padding: 1rem;
}

.fr-accordion__btn {
  cursor: pointer;
  font-weight: bold;
  color: #000091;
}

.fr-accordion__body {
  margin-top: 1rem;
}

code {
  background: #f5f5f5;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.error-details {
  margin-top: 1rem;
}

.error-details ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.error-details ul li {
  margin: 0.25rem 0;
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
